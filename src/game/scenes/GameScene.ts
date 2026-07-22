import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { Enemy } from '../entities/Enemy';
import { ExperienceGem } from '../entities/ExperienceGem';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { LevelSystem } from '../systems/LevelSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { WaveSystem } from '../systems/WaveSystem';
import type { WaveConfig } from '../types/game';
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
  private enemySpawner!: EnemySpawner;
  private currentWave!: WaveConfig;
  private activePlayTimeMs = 0;
  private nextAttackAt = 0;
  private nextSpawnAt = 0;
  private killCount = 0;
  private gameEnded = false;
  private choosingUpgrade = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.physics.resume();
    this.killCount = 0;
    this.gameEnded = false;
    this.choosingUpgrade = false;
    this.activePlayTimeMs = 0;
    this.nextAttackAt = 0;
    this.nextSpawnAt = 0;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.grid(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 80, 80, 0x100b18, 1, 0x2d1c3e, 0.35);

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.experienceGems = this.physics.add.group();
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.levelSystem = new LevelSystem();
    this.upgradeSystem = new UpgradeSystem();
    this.waveSystem = new WaveSystem();
    this.enemySpawner = new EnemySpawner(this, this.enemies);
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

    if (this.activePlayTimeMs >= this.nextAttackAt) {
      this.autoAttack();
      this.nextAttackAt = this.activePlayTimeMs + this.player.stats.attackCooldown;
    }

    this.hud.update(
      this.player.hp,
      this.player.stats.maxHp,
      this.levelSystem.level,
      this.levelSystem.experience,
      this.levelSystem.requiredExperience,
      survivalSeconds,
      this.killCount,
      this.currentWave.name,
    );

    if (this.player.hp <= 0) {
      this.endGame(survivalSeconds);
    }
  }

  private autoAttack(): void {
    if (this.gameEnded || !this.player.active) {
      return;
    }

    let nearestEnemy: Enemy | undefined;
    let nearestDistanceSquared = this.player.stats.attackRange ** 2;

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

    if (nearestEnemy) {
      const baseAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        nearestEnemy.x,
        nearestEnemy.y,
      );
      const projectileCount = Math.round(this.player.stats.projectileCount);
      const spreadRadians = Phaser.Math.DegToRad(10);

      for (let index = 0; index < projectileCount; index += 1) {
        const offset = (index - (projectileCount - 1) / 2) * spreadRadians;
        this.projectiles.add(
          new Projectile(
            this,
            this.player.x,
            this.player.y,
            baseAngle + offset,
            this.player.stats.projectileSpeed,
            this.player.stats.attackDamage,
          ),
        );
      }
    }
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
    if (enemy.takeDamage(damage)) {
      this.killCount += 1;
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
    this.player.takeDamage(enemy.contactDamage, this.activePlayTimeMs);
  }

  applyUpgrade(id: string): void {
    this.upgradeSystem.apply(id, this.player);
    this.choosingUpgrade = false;
  }

  private openUpgradeSelection(): void {
    const choices = this.upgradeSystem.getChoices();
    if (choices.length === 0) {
      return;
    }

    this.choosingUpgrade = true;
    const levels = Object.fromEntries(choices.map((choice) => [choice.id, this.upgradeSystem.getLevel(choice.id)]));
    this.scene.launch('UpgradeScene', { choices, levels });
    this.scene.pause();
  }

  private endGame(survivalSeconds: number): void {
    this.gameEnded = true;
    this.physics.pause();
    this.player.setTint(0x555555);

    this.time.delayedCall(350, () => {
      this.scene.start('ResultScene', {
        survivalSeconds,
        killCount: this.killCount,
        level: this.levelSystem.level,
      });
    });
  }
}
