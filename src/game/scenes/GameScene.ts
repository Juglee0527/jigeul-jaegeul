import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { Enemy } from '../entities/Enemy';
import { ExperienceGem } from '../entities/ExperienceGem';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { createRandomSeed, SeededRandom } from '../services/SeededRandom';
import { LevelSystem } from '../systems/LevelSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { ScoreSystem } from '../systems/ScoreSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { WaveSystem } from '../systems/WaveSystem';
import type { GameSession, WaveConfig } from '../types/game';
import { Hud } from '../ui/Hud';

const MAX_EXPERIENCE_GEMS = 180;
type ArcadeCollisionObject = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private experienceGems!: Phaser.Physics.Arcade.Group;
  private hud!: Hud;
  private levelSystem!: LevelSystem;
  private upgradeSystem!: UpgradeSystem;
  private waveSystem!: WaveSystem;
  private scoreSystem!: ScoreSystem;
  private enemySpawner!: EnemySpawner;
  private currentWave!: WaveConfig;
  private session!: GameSession;
  private activePlayTimeMs = 0;
  private nextAttackAt = 0;
  private nextSpawnAt = 0;
  private gameEnded = false;
  private choosingUpgrade = false;

  constructor() {
    super('GameScene');
  }

  init(data?: { session?: GameSession }): void {
    this.session = data?.session ?? {
      mode: 'normal',
      seed: createRandomSeed(),
    };
  }

  create(): void {
    this.physics.resume();
    this.gameEnded = false;
    this.choosingUpgrade = false;
    this.activePlayTimeMs = 0;
    this.nextAttackAt = 0;
    this.nextSpawnAt = 0;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.grid(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 80, 80, 0x100b18, 1, 0x2d1c3e, 0.35);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 10, GAME_HEIGHT - 10)
      .setStrokeStyle(4, COLORS.secondary, 0.45)
      .setDepth(49);

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.experienceGems = this.physics.add.group();
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.levelSystem = new LevelSystem();
    this.upgradeSystem = new UpgradeSystem(
      new SeededRandom(`${this.session.seed}:upgrades`),
    );
    this.waveSystem = new WaveSystem();
    this.scoreSystem = new ScoreSystem(this.session);
    this.enemySpawner = new EnemySpawner(
      this,
      this.enemies,
      new SeededRandom(`${this.session.seed}:enemies`),
    );
    this.currentWave = this.waveSystem.getCurrentWave(0);
    this.hud = new Hud(this);

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleProjectileHit,
      undefined,
      this,
    );
    this.physics.add.collider(this.player, this.enemies, this.handlePlayerHit, undefined, this);
    this.physics.add.overlap(
      this.player,
      this.experienceGems,
      this.handleExperiencePickup,
      undefined,
      this,
    );

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-ESC', this.pauseGame, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.pauseGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-ESC', this.pauseGame, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseGame, this);
    });

  }

  update(_time: number, delta: number): void {
    if (this.gameEnded) {
      return;
    }

    this.activePlayTimeMs += delta;
    this.player.update(delta);
    const survivalSeconds = this.activePlayTimeMs / 1000;
    this.currentWave = this.waveSystem.getCurrentWave(survivalSeconds);

    if (this.activePlayTimeMs >= this.nextSpawnAt) {
      this.enemySpawner.spawn(this.currentWave);
      this.nextSpawnAt = this.activePlayTimeMs + this.currentWave.spawnInterval;
    }

    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (enemy.active) {
        enemy.updateBehavior(
          this.activePlayTimeMs,
          this.player,
          this.player.stats.enemySpeedMultiplier,
        );
      }
    });
    this.experienceGems.getChildren().forEach((gameObject) => {
      const gem = gameObject as ExperienceGem;
      if (gem.active) {
        gem.updateAttraction(this.player);
      }
    });
    this.projectiles.getChildren().forEach((gameObject) => {
      const projectile = gameObject as Projectile;
      projectile.updateTravel(delta);
    });

    if (this.activePlayTimeMs >= this.nextAttackAt && this.autoAttack()) {
      this.nextAttackAt = this.activePlayTimeMs + this.player.stats.attackCooldown;
    }

    this.hud.update(
      this.player.hp,
      this.player.stats.maxHp,
      this.levelSystem.level,
      this.levelSystem.experience,
      this.levelSystem.requiredExperience,
      survivalSeconds,
      this.scoreSystem.killCount,
      this.scoreSystem.getCurrentScore(survivalSeconds, this.levelSystem.level),
      this.currentWave.name,
      this.player.stats,
    );

    if (this.player.hp <= 0) {
      this.endGame(survivalSeconds);
    }
  }

  private autoAttack(): boolean {
    if (this.gameEnded || !this.player.active) {
      return false;
    }

    let nearestEnemy: Enemy | undefined;
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;

    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (!enemy.active) {
        return;
      }

      const distanceSquared = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestEnemy = enemy;
      }
    });

    if (!nearestEnemy) {
      return false;
    }

    const baseAngle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      nearestEnemy.x,
      nearestEnemy.y,
    );
    const projectileCount = Math.max(1, Math.round(this.player.stats.projectileCount));
    const spreadRadians = Phaser.Math.DegToRad(projectileCount > 3 ? 12 : 8);

    this.player.fireWeapon(baseAngle);
    for (let index = 0; index < projectileCount; index += 1) {
      const offset = (index - (projectileCount - 1) / 2) * spreadRadians;
      const shotAngle = baseAngle + offset;
      const muzzleDistance = 44;
      this.projectiles.add(
        new Projectile(
          this,
          this.player.x + Math.cos(shotAngle) * muzzleDistance,
          this.player.y + Math.sin(shotAngle) * muzzleDistance,
          shotAngle,
          this.player.stats.projectileSpeed,
          this.player.stats.attackDamage,
          this.player.stats.attackRange,
        ),
      );
    }

    return true;
  }

  private handleProjectileHit(
    projectileObject: ArcadeCollisionObject,
    enemyObject: ArcadeCollisionObject,
  ): void {
    const projectile = projectileObject as Projectile;
    const enemy = enemyObject as Enemy;

    if (!projectile.active || !enemy.active) {
      return;
    }

    const dropX = enemy.x;
    const dropY = enemy.y;
    const damage = projectile.damage;
    projectile.destroy();
    this.showHitEffect(dropX, dropY);
    if (enemy.takeDamage(damage)) {
      this.scoreSystem.registerKill();
      this.showKillEffect(dropX, dropY, enemy.experienceValue);
      if (this.experienceGems.countActive(true) < MAX_EXPERIENCE_GEMS) {
        this.experienceGems.add(
          new ExperienceGem(this, dropX, dropY, enemy.experienceValue),
        );
      }
    }
  }

  private handleExperiencePickup(
    _playerObject: ArcadeCollisionObject,
    gemObject: ArcadeCollisionObject,
  ): void {
    const gem = gemObject as ExperienceGem;
    if (!gem.active || this.choosingUpgrade) {
      return;
    }

    const leveledUp = this.levelSystem.addExperience(gem.value);
    gem.destroy();

    if (leveledUp) {
      this.openUpgradeSelection();
    }
  }

  private handlePlayerHit(
    _playerObject: ArcadeCollisionObject,
    enemyObject: ArcadeCollisionObject,
  ): void {
    const enemy = enemyObject as Enemy;
    if (this.player.takeDamage(enemy.contactDamage, this.activePlayTimeMs)) {
      this.cameras.main.shake(90, 0.006);
      this.cameras.main.flash(80, 255, 38, 70, false);
      if (this.player.hp <= 0) {
        this.endGame(this.activePlayTimeMs / 1000);
      }
    }
  }

  applyUpgrade(id: string): void {
    this.upgradeSystem.apply(id, this.player);
    this.hud.showDetailedStats();
    this.choosingUpgrade = false;
  }

  getPlayerStats(): Readonly<Player['stats']> {
    return this.player.stats;
  }

  private openUpgradeSelection(): void {
    const choices = this.upgradeSystem.getChoices();
    if (choices.length === 0) {
      return;
    }

    this.choosingUpgrade = true;
    this.cameras.main.flash(180, 255, 79, 216, false);
    const levels = Object.fromEntries(choices.map((choice) => [choice.id, this.upgradeSystem.getLevel(choice.id)]));
    this.scene.launch('UpgradeScene', { choices, levels, stats: { ...this.player.stats } });
    this.scene.pause();
  }

  createRestartSession(): GameSession {
    if (this.session.mode === 'normal') {
      return { mode: 'normal', seed: createRandomSeed() };
    }
    return { ...this.session };
  }

  private pauseGame(): void {
    if (this.gameEnded || this.choosingUpgrade || !this.sys.isActive()) {
      return;
    }

    this.player.setVelocity(0, 0);
    this.scene.launch('PauseScene');
    this.scene.pause();
  }

  private showKillEffect(x: number, y: number, experienceValue: number): void {
    const burst = this.add
      .circle(x, y, 18, COLORS.primary, 0.65)
      .setStrokeStyle(3, COLORS.projectile, 0.9)
      .setDepth(20);
    const rewardText = this.add
      .text(x, y - 18, `+${experienceValue} EXP`, {
        color: '#fff36b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.tweens.add({
      targets: burst,
      scale: 2.2,
      alpha: 0,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
    this.tweens.add({
      targets: rewardText,
      y: y - 46,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => rewardText.destroy(),
    });
  }

  private showHitEffect(x: number, y: number): void {
    const spark = this.add.star(x, y, 5, 3, 11, COLORS.projectile, 0.95).setDepth(19);
    this.tweens.add({
      targets: spark,
      angle: 45,
      scale: 1.8,
      alpha: 0,
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  private endGame(survivalSeconds: number): void {
    if (this.gameEnded) {
      return;
    }
    this.gameEnded = true;
    this.physics.pause();
    this.player.setTint(0x555555);

    this.time.delayedCall(350, () => {
      this.scene.start(
        'ResultScene',
        this.scoreSystem.createResult(survivalSeconds, this.levelSystem.level),
      );
    });
  }
}
