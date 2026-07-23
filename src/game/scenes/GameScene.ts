import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { BossProjectile } from '../entities/BossProjectile';
import { Enemy } from '../entities/Enemy';
import { ExperienceGem } from '../entities/ExperienceGem';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { createRandomSeed, SeededRandom } from '../services/SeededRandom';
import { AudioManager } from '../services/AudioManager';
import { LevelSystem } from '../systems/LevelSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { ScoreSystem } from '../systems/ScoreSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { WaveSystem } from '../systems/WaveSystem';
import type { GameSession, WaveConfig } from '../types/game';
import { Hud } from '../ui/Hud';

const MAX_EXPERIENCE_GEMS = 180;
const debugBossIntervalMs = import.meta.env.DEV
  ? Number(new URLSearchParams(window.location.search).get('bossIntervalMs'))
  : Number.NaN;
const FIRST_BOSS_TIME_MS = Number.isFinite(debugBossIntervalMs) && debugBossIntervalMs >= 1_000
  ? debugBossIntervalMs
  : 5 * 60 * 1000;
const GAME_DURATION_MS = FIRST_BOSS_TIME_MS * 2;
type ArcadeCollisionObject = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];

export class GameScene extends Phaser.Scene {
  private readonly audio = AudioManager.getInstance();
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private bossProjectiles!: Phaser.Physics.Arcade.Group;
  private experienceGems!: Phaser.Physics.Arcade.Group;
  private treasureChests!: Phaser.Physics.Arcade.Group;
  private hud!: Hud;
  private levelSystem!: LevelSystem;
  private upgradeSystem!: UpgradeSystem;
  private waveSystem!: WaveSystem;
  private scoreSystem!: ScoreSystem;
  private enemySpawner!: EnemySpawner;
  private currentWave!: WaveConfig;
  private session!: GameSession;
  private activePlayTimeMs = 0;
  private combatTimeMs = 0;
  private nextAttackAt = 0;
  private nextSpawnAt = 0;
  private gameEnded = false;
  private choosingUpgrade = false;
  private fiveMinuteBossSpawned = false;
  private finalBossSpawned = false;
  private activeBoss?: Enemy;
  private nextBossAimedAt = 0;
  private nextBossBurstAt = 0;
  private bossBurstRotation = 0;
  private bossEnraged = false;
  private endAfterUpgrade = false;

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
    this.audio.setMood('game');
    this.physics.resume();
    this.gameEnded = false;
    this.choosingUpgrade = false;
    this.fiveMinuteBossSpawned = false;
    this.finalBossSpawned = false;
    this.activeBoss = undefined;
    this.nextBossAimedAt = 0;
    this.nextBossBurstAt = 0;
    this.bossBurstRotation = 0;
    this.bossEnraged = false;
    this.endAfterUpgrade = false;
    this.activePlayTimeMs = 0;
    this.combatTimeMs = 0;
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
    this.bossProjectiles = this.physics.add.group();
    this.experienceGems = this.physics.add.group();
    this.treasureChests = this.physics.add.group();
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
      this.bossProjectiles,
      this.handleBossProjectileHit,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.experienceGems,
      this.handleExperiencePickup,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.treasureChests,
      this.handleTreasurePickup,
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

    // 생존 타이머는 보스전 중 멈추지만 공격 쿨다운, 피격 무적시간,
    // 적 행동에는 계속 흐르는 별도의 전투 시계를 사용한다.
    this.combatTimeMs += delta;
    if (!this.activeBoss?.active) {
      this.activePlayTimeMs = Math.min(GAME_DURATION_MS, this.activePlayTimeMs + delta);
    }
    this.player.update(delta);
    const survivalSeconds = this.activePlayTimeMs / 1000;
    this.currentWave = this.waveSystem.getCurrentWave(survivalSeconds);

    if (!this.fiveMinuteBossSpawned && this.activePlayTimeMs >= FIRST_BOSS_TIME_MS) {
      this.fiveMinuteBossSpawned = true;
      this.activePlayTimeMs = FIRST_BOSS_TIME_MS;
      this.spawnBoss('middle-manager', '5분 보스 등장!');
    }
    if (!this.finalBossSpawned && this.activePlayTimeMs >= GAME_DURATION_MS) {
      this.finalBossSpawned = true;
      this.spawnBoss('final-boss', '최종 보스 등장!');
    }

    if (!this.activeBoss?.active && this.activePlayTimeMs >= this.nextSpawnAt && !this.finalBossSpawned) {
      this.enemySpawner.spawn(this.currentWave);
      this.nextSpawnAt = this.activePlayTimeMs + this.currentWave.spawnInterval;
    }

    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (enemy.active) {
        enemy.updateBehavior(
          this.combatTimeMs,
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
    this.bossProjectiles.getChildren().forEach((gameObject) => {
      const projectile = gameObject as BossProjectile;
      projectile.updateTravel(delta);
    });
    this.updateBossPatterns();

    if (this.combatTimeMs >= this.nextAttackAt && this.autoAttack()) {
      this.nextAttackAt = this.combatTimeMs + this.player.stats.attackCooldown;
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
    this.audio.play('shoot');
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
    this.audio.play('hit');
    if (enemy.takeDamage(damage)) {
      this.audio.play('kill');
      this.scoreSystem.registerKill();
      if (enemy.isBoss) {
        this.scoreSystem.registerBossKill();
        this.activeBoss = undefined;
        this.bossProjectiles.clear(true, true);
        this.dropTreasure(dropX, dropY, enemy.enemyId === 'final-boss');
        return;
      }
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
    this.audio.play('pickup');

    if (leveledUp) {
      this.openUpgradeSelection();
    }
  }

  private handlePlayerHit(
    _playerObject: ArcadeCollisionObject,
    enemyObject: ArcadeCollisionObject,
  ): void {
    const enemy = enemyObject as Enemy;
    this.damagePlayer(enemy.contactDamage);
  }

  private handleBossProjectileHit(
    _playerObject: ArcadeCollisionObject,
    projectileObject: ArcadeCollisionObject,
  ): void {
    const projectile = projectileObject as BossProjectile;
    if (!projectile.active) {
      return;
    }
    const damage = projectile.damage;
    projectile.destroy();
    this.damagePlayer(damage);
  }

  private damagePlayer(amount: number): void {
    if (!this.player.takeDamage(amount, this.combatTimeMs)) {
      return;
    }
    this.audio.play('hurt');
    this.cameras.main.shake(90, 0.006);
    this.cameras.main.flash(80, 255, 38, 70, false);
    if (this.player.hp <= 0) {
      this.endGame(this.activePlayTimeMs / 1000);
    }
  }

  applyUpgrade(id: string): void {
    this.upgradeSystem.apply(id, this.player);
    this.audio.play('confirm');
    this.audio.setMood('game');
    this.choosingUpgrade = false;
    if (this.endAfterUpgrade) {
      this.endAfterUpgrade = false;
      this.endGame(600, true);
    }
  }

  getPlayerStats(): Readonly<Player['stats']> {
    return this.player.stats;
  }

  private openUpgradeSelection(): void {
    const choices = this.upgradeSystem.getChoices(this.activePlayTimeMs / 1000);
    if (choices.length === 0) {
      return;
    }

    this.choosingUpgrade = true;
    this.audio.play('levelUp');
    this.audio.setMood('paused');
    this.cameras.main.flash(180, 255, 79, 216, false);
    const levels = Object.fromEntries(choices.map((choice) => [choice.id, this.upgradeSystem.getLevel(choice.id)]));
    this.scene.launch('UpgradeScene', { choices, levels, stats: { ...this.player.stats } });
    this.scene.pause();
  }

  private handleTreasurePickup(
    _playerObject: ArcadeCollisionObject,
    chestObject: ArcadeCollisionObject,
  ): void {
    const chest = chestObject as Phaser.Physics.Arcade.Sprite;
    if (!chest.active || this.choosingUpgrade) {
      return;
    }
    const isFinal = chest.getData('final') === true;
    chest.destroy();
    const choices = this.upgradeSystem.getLegendaryChoices();
    if (choices.length === 0) {
      if (isFinal) {
        this.endGame(600, true);
      }
      return;
    }
    this.endAfterUpgrade = isFinal;
    this.openUpgradeChoices(choices);
  }

  private openUpgradeChoices(choices: ReturnType<UpgradeSystem['getLegendaryChoices']>): void {
    this.choosingUpgrade = true;
    this.audio.play('levelUp');
    this.audio.setMood('paused');
    this.cameras.main.flash(300, 255, 196, 61, false);
    const levels = Object.fromEntries(choices.map((choice) => [choice.id, this.upgradeSystem.getLevel(choice.id)]));
    this.scene.launch('UpgradeScene', { choices, levels, stats: { ...this.player.stats } });
    this.scene.pause();
  }

  private spawnBoss(enemyId: string, announcement: string): void {
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (enemy.active && !enemy.isBoss) {
        enemy.destroy();
      }
    });
    this.projectiles.clear(true, true);
    this.bossProjectiles.clear(true, true);
    this.activeBoss = this.enemySpawner.spawnBoss(enemyId);
    this.nextBossAimedAt = this.combatTimeMs + 1_500;
    this.nextBossBurstAt = this.combatTimeMs + 4_000;
    this.bossBurstRotation = 0;
    this.bossEnraged = false;
    this.audio.play('boss');
    this.cameras.main.shake(500, 0.012);
    const text = this.add.text(GAME_WIDTH / 2, 180, announcement, {
      color: '#ffc43d',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      stroke: '#2a0c10',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({
      targets: text,
      alpha: 0,
      y: 140,
      duration: 1800,
      onComplete: () => text.destroy(),
    });
  }

  private updateBossPatterns(): void {
    const boss = this.activeBoss;
    if (!boss?.active || this.gameEnded) {
      return;
    }

    const isFinalBoss = boss.enemyId === 'final-boss';
    const enraged = boss.healthRatio <= 0.5;
    if (enraged && !this.bossEnraged) {
      this.bossEnraged = true;
      this.showBossAnnouncement('보스 격노! 패턴 가속', '#ff5c72', 36);
      this.cameras.main.shake(700, 0.014);
    }
    if (this.combatTimeMs >= this.nextBossAimedAt) {
      const aimedInterval = isFinalBoss ? (enraged ? 1_050 : 1_450) : (enraged ? 1_650 : 2_200);
      this.nextBossAimedAt = this.combatTimeMs + aimedInterval;
      this.telegraphBossAttack(boss, '조준 폭격', 0xff5c72, enraged ? 280 : 360, () => {
        this.fireBossAimedVolley(
          boss,
          isFinalBoss ? (enraged ? 7 : 5) : (enraged ? 5 : 3),
          isFinalBoss ? 13 : 11,
        );
      });
    }

    if (this.combatTimeMs >= this.nextBossBurstAt) {
      const burstInterval = isFinalBoss ? (enraged ? 3_000 : 3_800) : (enraged ? 4_200 : 5_400);
      this.nextBossBurstAt = this.combatTimeMs + burstInterval;
      this.telegraphBossAttack(boss, '전체 공지', 0xffc43d, enraged ? 480 : 620, () => {
        this.fireBossRadialBurst(
          boss,
          isFinalBoss ? (enraged ? 22 : 18) : (enraged ? 14 : 10),
        );
      });
    }
  }

  private telegraphBossAttack(
    boss: Enemy,
    label: string,
    color: number,
    duration: number,
    attack: () => void,
  ): void {
    if (!boss.active) {
      return;
    }
    const warning = this.add.circle(boss.x, boss.y, 42, color, 0.08)
      .setStrokeStyle(5, color, 0.95)
      .setDepth(17);
    const warningText = this.add.text(boss.x, boss.y - 70, label, {
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      stroke: '#150912',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(18);
    this.tweens.add({
      targets: [warning, warningText],
      scale: 1.75,
      alpha: 0.8,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => {
        warning.destroy();
        warningText.destroy();
        if (boss.active && !this.gameEnded) {
          attack();
          this.cameras.main.shake(80, 0.004);
        }
      },
    });
  }

  private showBossAnnouncement(message: string, color: string, fontSize: number): void {
    const text = this.add.text(GAME_WIDTH / 2, 180, message, {
      color,
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      stroke: '#2a0c10',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({
      targets: text,
      alpha: 0,
      y: 140,
      duration: 1_500,
      onComplete: () => text.destroy(),
    });
  }

  private fireBossAimedVolley(boss: Enemy, count: number, damage: number): void {
    const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
    const spread = Phaser.Math.DegToRad(13);
    for (let index = 0; index < count; index += 1) {
      const angle = baseAngle + (index - (count - 1) / 2) * spread;
      this.spawnBossProjectile(boss, angle, boss.enemyId === 'final-boss' ? 300 : 250, damage);
    }
  }

  private fireBossRadialBurst(boss: Enemy, count: number): void {
    const isFinalBoss = boss.enemyId === 'final-boss';
    this.bossBurstRotation += isFinalBoss ? Math.PI / count : Math.PI / (count * 2);
    for (let index = 0; index < count; index += 1) {
      const angle = this.bossBurstRotation + (Math.PI * 2 * index) / count;
      this.spawnBossProjectile(boss, angle, isFinalBoss ? 225 : 190, isFinalBoss ? 10 : 8);
    }
  }

  private spawnBossProjectile(boss: Enemy, angle: number, speed: number, damage: number): void {
    const muzzleDistance = boss.displayWidth * 0.45;
    this.bossProjectiles.add(new BossProjectile(
      this,
      boss.x + Math.cos(angle) * muzzleDistance,
      boss.y + Math.sin(angle) * muzzleDistance,
      angle,
      speed,
      damage,
    ));
  }

  private dropTreasure(x: number, y: number, isFinal: boolean): void {
    const chest = this.physics.add.sprite(x, y, 'treasure').setDepth(18).setData('final', isFinal);
    this.treasureChests.add(chest);
    this.tweens.add({
      targets: chest,
      scale: { from: 0.6, to: 1.15 },
      angle: { from: -8, to: 8 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
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
    this.audio.play('pause');
    this.audio.setMood('paused');
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

  private endGame(survivalSeconds: number, victory = false): void {
    if (this.gameEnded) {
      return;
    }
    this.gameEnded = true;
    this.audio.play('gameOver');
    this.audio.setMood('result');
    this.physics.pause();
    this.player.setTint(0x555555);

    this.time.delayedCall(350, () => {
      this.scene.start(
        'ResultScene',
        this.scoreSystem.createResult(survivalSeconds, this.levelSystem.level, victory),
      );
    });
  }
}
