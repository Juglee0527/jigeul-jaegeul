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
import type {
  GameDifficulty,
  GameSession,
  UpgradeEffect,
  UpgradeEffectKey,
  WaveConfig,
} from '../types/game';
import { Hud } from '../ui/Hud';

const MAX_EXPERIENCE_GEMS = 180;
const debugBossIntervalMs = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? Number(new URLSearchParams(window.location.search).get('bossIntervalMs'))
  : Number.NaN;
const BOSS_DEBUG_ENABLED = Number.isFinite(debugBossIntervalMs) && debugBossIntervalMs >= 1_000;
const debugBossStage = BOSS_DEBUG_ENABLED
  ? Phaser.Math.Clamp(Number(new URLSearchParams(window.location.search).get('bossStage')) || 1, 1, 3)
  : 1;
const FIRST_BOSS_TIME_MS = BOSS_DEBUG_ENABLED
  ? debugBossIntervalMs
  : 3 * 60 * 1000;
const SECOND_BOSS_TIME_MS = BOSS_DEBUG_ENABLED ? debugBossIntervalMs * 2 : 6 * 60 * 1000;
const GAME_DURATION_MS = BOSS_DEBUG_ENABLED ? debugBossIntervalMs * 3 : 10 * 60 * 1000;
const DIFFICULTY_MULTIPLIERS: Readonly<Record<GameDifficulty, number>> = {
  easy: 0.5,
  normal: 1,
  hard: 1.5,
};
type ArcadeCollisionObject = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];
const createCombatEffects = (): Record<UpgradeEffectKey, number> => ({
  bossDamage: 0,
  chainDamage: 0,
  chainTargets: 0,
  criticalChance: 0,
  criticalMultiplier: 0,
  echoShotChance: 0,
  executeThreshold: 0,
  explosionDamage: 0,
  explosionRadius: 0,
  nova: 0,
  onKillHeal: 0,
  pierce: 0,
  projectileScale: 0,
  rearShot: 0,
  retaliationDamage: 0,
  revive: 0,
  shield: 0,
  sideShot: 0,
});

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
  private difficultyMultiplier = 1;
  private activePlayTimeMs = 0;
  private combatTimeMs = 0;
  private nextAttackAt = 0;
  private nextSpawnAt = 0;
  private gameEnded = false;
  private choosingUpgrade = false;
  private firstBossSpawned = false;
  private secondBossSpawned = false;
  private finalBossSpawned = false;
  private activeBoss?: Enemy;
  private nextBossPrimaryAt = 0;
  private nextBossSecondaryAt = 0;
  private bossBusyUntil = 0;
  private bossBurstRotation = 0;
  private bossPatternRandom!: SeededRandom;
  private combatRandom!: SeededRandom;
  private combatEffects = createCombatEffects();
  private nextNovaAt = Number.POSITIVE_INFINITY;
  private shieldReadyAt = 0;
  private endAfterUpgrade = false;

  constructor() {
    super('GameScene');
  }

  init(data?: { session?: GameSession }): void {
    this.session = data?.session ?? {
      mode: 'normal',
      difficulty: 'normal',
      seed: createRandomSeed(),
    };
    this.difficultyMultiplier = DIFFICULTY_MULTIPLIERS[this.session.difficulty];
  }

  create(): void {
    this.audio.setMood('game');
    this.physics.resume();
    this.gameEnded = false;
    this.choosingUpgrade = false;
    this.firstBossSpawned = false;
    this.secondBossSpawned = false;
    this.finalBossSpawned = false;
    this.activeBoss = undefined;
    this.nextBossPrimaryAt = 0;
    this.nextBossSecondaryAt = 0;
    this.bossBusyUntil = 0;
    this.bossBurstRotation = 0;
    this.combatEffects = createCombatEffects();
    this.nextNovaAt = Number.POSITIVE_INFINITY;
    this.shieldReadyAt = 0;
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
    this.player.grantResumeProtection(this.combatTimeMs);
    this.levelSystem = new LevelSystem();
    this.upgradeSystem = new UpgradeSystem(
      new SeededRandom(`${this.session.seed}:upgrades`),
    );
    this.bossPatternRandom = new SeededRandom(`${this.session.seed}:boss-patterns`);
    this.combatRandom = new SeededRandom(`${this.session.seed}:combat-effects`);
    this.waveSystem = new WaveSystem();
    this.scoreSystem = new ScoreSystem(this.session);
    this.enemySpawner = new EnemySpawner(
      this,
      this.enemies,
      new SeededRandom(`${this.session.seed}:enemies`),
      this.difficultyMultiplier,
    );
    this.currentWave = this.waveSystem.getCurrentWave(0);
    this.hud = new Hud(this, this.session.difficulty);

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleProjectileHit,
      undefined,
      this,
    );
    // 같은 목표를 추적하는 적들이 한 점에 완전히 포개지지 않도록
    // 원형 물리 바디끼리 서로 밀어낸다. 바디가 스프라이트보다 조금
    // 작아서 외곽은 자연스럽게 살짝 겹칠 수 있다.
    this.physics.add.collider(this.enemies, this.enemies);
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
    this.player.update(delta, this.combatTimeMs);
    const survivalSeconds = this.activePlayTimeMs / 1000;
    this.currentWave = this.waveSystem.getCurrentWave(survivalSeconds);

    if (!this.firstBossSpawned && this.activePlayTimeMs >= FIRST_BOSS_TIME_MS) {
      this.firstBossSpawned = true;
      this.activePlayTimeMs = FIRST_BOSS_TIME_MS;
      if (debugBossStage === 3) {
        this.spawnBoss('final-boss', '10분 · 최종 보스!');
      } else if (debugBossStage === 2) {
        this.spawnBoss('senior-manager', '6분 · 2단계 보스!');
      } else {
        this.spawnBoss('middle-manager', '3분 · 1단계 보스!');
      }
    }
    if (!this.secondBossSpawned && this.activePlayTimeMs >= SECOND_BOSS_TIME_MS) {
      this.secondBossSpawned = true;
      this.activePlayTimeMs = SECOND_BOSS_TIME_MS;
      this.spawnBoss('senior-manager', '6분 · 2단계 보스!');
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
    this.updateCombatEffects();

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
      this.scoreSystem.getCurrentScore(survivalSeconds),
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
    this.player.fireWeapon(baseAngle);
    this.audio.play('shoot');
    this.spawnPlayerVolley(baseAngle);

    const rearShotCount = Math.floor(this.combatEffects.rearShot);
    for (let index = 0; index < rearShotCount; index += 1) {
      const offset = (index - (rearShotCount - 1) / 2) * Phaser.Math.DegToRad(10);
      this.spawnPlayerProjectile(baseAngle + Math.PI + offset);
    }
    const sideShotCount = Math.floor(this.combatEffects.sideShot);
    for (let index = 0; index < sideShotCount; index += 1) {
      const offset = (index - (sideShotCount - 1) / 2) * Phaser.Math.DegToRad(10);
      this.spawnPlayerProjectile(baseAngle + Math.PI / 2 + offset);
      this.spawnPlayerProjectile(baseAngle - Math.PI / 2 - offset);
    }
    if (this.combatRandom.next() < Math.min(0.8, this.combatEffects.echoShotChance)) {
      this.spawnPlayerVolley(baseAngle, 0.75);
    }

    return true;
  }

  private spawnPlayerVolley(baseAngle: number, damageMultiplier = 1): void {
    const projectileCount = Math.max(1, Math.round(this.player.stats.projectileCount));
    const spreadRadians = Phaser.Math.DegToRad(projectileCount > 3 ? 12 : 8);
    for (let index = 0; index < projectileCount; index += 1) {
      const offset = (index - (projectileCount - 1) / 2) * spreadRadians;
      this.spawnPlayerProjectile(baseAngle + offset, damageMultiplier);
    }
  }

  private spawnPlayerProjectile(angle: number, damageMultiplier = 1): void {
    const critical = this.combatRandom.next() < Math.min(0.85, this.combatEffects.criticalChance);
    const criticalMultiplier = critical ? 1 + this.combatEffects.criticalMultiplier : 1;
    const muzzleDistance = 44;
    this.projectiles.add(
      new Projectile(
        this,
        this.player.x + Math.cos(angle) * muzzleDistance,
        this.player.y + Math.sin(angle) * muzzleDistance,
        angle,
        this.player.stats.projectileSpeed,
        this.player.stats.attackDamage * damageMultiplier * criticalMultiplier,
        this.player.stats.attackRange,
        Math.floor(this.combatEffects.pierce),
        1 + this.combatEffects.projectileScale,
        critical,
      ),
    );
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

    if (!projectile.registerHit(enemy)) {
      return;
    }
    const hitX = enemy.x;
    const hitY = enemy.y;
    let damage = projectile.damage * (enemy.isBoss ? 1 + this.combatEffects.bossDamage : 1);
    if (!enemy.isBoss && enemy.healthRatio <= this.combatEffects.executeThreshold) {
      damage = Number.MAX_SAFE_INTEGER;
    }
    this.showHitEffect(hitX, hitY);
    this.audio.play('hit');
    this.damageEnemy(enemy, damage, true);
    if (this.combatEffects.chainTargets > 0 && this.combatEffects.chainDamage > 0) {
      this.triggerChainLightning(enemy, hitX, hitY);
    }
  }

  private damageEnemy(enemy: Enemy, damage: number, allowDeathEffects: boolean): boolean {
    if (!enemy.active) {
      return false;
    }
    const dropX = enemy.x;
    const dropY = enemy.y;
    const experienceValue = enemy.experienceValue;
    const scoreLevel = enemy.scoreLevel;
    const enemyId = enemy.enemyId;
    const isBoss = enemy.isBoss;
    if (!enemy.takeDamage(damage)) {
      return false;
    }

    this.audio.play('kill');
    const scoreReward = this.scoreSystem.registerKill(scoreLevel);
    this.hud.showScoreChange(scoreReward);
    if (isBoss) {
      this.scoreSystem.registerBossKill();
      this.activeBoss = undefined;
      this.bossProjectiles.clear(true, true);
      this.dropTreasure(dropX, dropY, enemyId === 'final-boss');
      return true;
    }

    this.showKillEffect(dropX, dropY, experienceValue);
    this.player.heal(this.combatEffects.onKillHeal);
    if (this.experienceGems.countActive(true) < MAX_EXPERIENCE_GEMS) {
      this.experienceGems.add(new ExperienceGem(this, dropX, dropY, experienceValue));
    }
    if (allowDeathEffects) {
      this.triggerDeathExplosion(dropX, dropY, enemy);
    }
    return true;
  }

  private triggerDeathExplosion(x: number, y: number, defeatedEnemy: Enemy): void {
    const radius = this.combatEffects.explosionRadius;
    const damage = this.combatEffects.explosionDamage;
    if (radius <= 0 || damage <= 0) {
      return;
    }
    const blast = this.add.circle(x, y, radius, 0xff5bd6, 0.22)
      .setStrokeStyle(3, 0xffb5ec, 0.9).setDepth(15);
    this.tweens.add({ targets: blast, scale: 1.35, alpha: 0, duration: 260, onComplete: () => blast.destroy() });
    this.enemies.getChildren().forEach((gameObject) => {
      const target = gameObject as Enemy;
      if (
        target.active
        && target !== defeatedEnemy
        && Phaser.Math.Distance.Between(x, y, target.x, target.y) <= radius
      ) {
        this.damageEnemy(target, damage, false);
      }
    });
  }

  private triggerChainLightning(source: Enemy, x: number, y: number): void {
    const targets = this.enemies.getChildren()
      .map((gameObject) => gameObject as Enemy)
      .filter((enemy) => enemy.active && enemy !== source)
      .sort((left, right) => (
        Phaser.Math.Distance.Squared(x, y, left.x, left.y)
        - Phaser.Math.Distance.Squared(x, y, right.x, right.y)
      ))
      .slice(0, Math.floor(this.combatEffects.chainTargets));
    targets.forEach((target) => {
      const line = this.add.line(0, 0, x, y, target.x, target.y, 0x7fe8ff, 0.95)
        .setOrigin(0).setLineWidth(3).setDepth(17);
      this.tweens.add({ targets: line, alpha: 0, duration: 140, onComplete: () => line.destroy() });
      this.damageEnemy(target, this.combatEffects.chainDamage, false);
    });
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
    if (this.combatEffects.shield > 0 && this.combatTimeMs >= this.shieldReadyAt) {
      const cooldown = Math.max(4_000, 12_000 - (this.combatEffects.shield - 1) * 2_000);
      this.shieldReadyAt = this.combatTimeMs + cooldown;
      const shield = this.add.circle(this.player.x, this.player.y, 54, 0x5ce8ff, 0.16)
        .setStrokeStyle(5, 0xbaf7ff, 1).setDepth(20);
      this.tweens.add({
        targets: shield,
        scale: 1.45,
        alpha: 0,
        duration: 420,
        onComplete: () => shield.destroy(),
      });
      return;
    }
    if (!this.player.takeDamage(amount, this.combatTimeMs)) {
      return;
    }
    const scorePenalty = this.scoreSystem.registerDamage(this.activePlayTimeMs / 1000);
    if (scorePenalty > 0) {
      this.hud.showScoreChange(-scorePenalty);
    }
    this.audio.play('hurt');
    this.cameras.main.shake(90, 0.006);
    this.cameras.main.flash(80, 255, 38, 70, false);
    this.triggerRetaliation();
    if (this.player.hp <= 0) {
      if (this.combatEffects.revive >= 1) {
        this.combatEffects.revive -= 1;
        this.player.revive(0.45, this.combatTimeMs);
        this.showCombatAnnouncement('다시 살아났다!', '#ffe66d');
      } else {
        this.endGame(this.activePlayTimeMs / 1000);
      }
    }
  }

  applyUpgrade(id: string): void {
    const upgrade = this.upgradeSystem.apply(id, this.player);
    upgrade?.effects?.forEach((effect) => this.applyCombatEffect(effect));
    this.player.grantResumeProtection(this.combatTimeMs);
    this.audio.play('confirm');
    this.audio.setMood('game');
    this.choosingUpgrade = false;
    if (this.endAfterUpgrade) {
      this.endAfterUpgrade = false;
      this.endGame(600, true);
    }
  }

  private applyCombatEffect(effect: UpgradeEffect): void {
    this.combatEffects[effect.key] += effect.value;
    if (effect.key === 'nova' && !Number.isFinite(this.nextNovaAt)) {
      this.nextNovaAt = this.combatTimeMs + 1_500;
    }
    if (effect.key === 'shield' && this.combatEffects.shield === effect.value) {
      this.shieldReadyAt = this.combatTimeMs;
    }
  }

  private updateCombatEffects(): void {
    const novaLevel = Math.floor(this.combatEffects.nova);
    if (novaLevel <= 0 || this.combatTimeMs < this.nextNovaAt) {
      return;
    }
    const projectileCount = 8 + novaLevel * 2;
    for (let index = 0; index < projectileCount; index += 1) {
      this.spawnPlayerProjectile((index / projectileCount) * Math.PI * 2, 0.65 + novaLevel * 0.2);
    }
    const pulse = this.add.circle(this.player.x, this.player.y, 42, 0xffd55a, 0.18)
      .setStrokeStyle(4, 0xfff2ac, 0.95).setDepth(14);
    this.tweens.add({
      targets: pulse,
      scale: 3,
      alpha: 0,
      duration: 420,
      onComplete: () => pulse.destroy(),
    });
    this.nextNovaAt = this.combatTimeMs + Math.max(3_500, 8_000 - novaLevel * 1_200);
  }

  private triggerRetaliation(): void {
    const damage = this.combatEffects.retaliationDamage;
    if (damage <= 0) {
      return;
    }
    const radius = 180;
    const pulse = this.add.circle(this.player.x, this.player.y, radius, 0xff496c, 0.12)
      .setStrokeStyle(4, 0xff8da1, 0.9).setDepth(16);
    this.tweens.add({ targets: pulse, scale: 1.15, alpha: 0, duration: 260, onComplete: () => pulse.destroy() });
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (
        enemy.active
        && Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= radius
      ) {
        this.damageEnemy(enemy, damage, false);
      }
    });
  }

  private showCombatAnnouncement(message: string, color: string): void {
    const text = this.add.text(this.player.x, this.player.y - 70, message, {
      color,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '25px',
      fontStyle: 'bold',
      stroke: '#170912',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: text,
      y: text.y - 45,
      alpha: 0,
      duration: 900,
      onComplete: () => text.destroy(),
    });
  }

  getPlayerStats(): Readonly<Player['stats']> {
    return this.player.stats;
  }

  getAcquiredUpgrades(): ReturnType<UpgradeSystem['getAcquiredUpgrades']> {
    return this.upgradeSystem.getAcquiredUpgrades();
  }

  grantResumeProtection(): void {
    this.player.grantResumeProtection(this.combatTimeMs);
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
    this.nextBossPrimaryAt = this.combatTimeMs + 1_300;
    this.nextBossSecondaryAt = this.combatTimeMs + 3_400;
    this.bossBusyUntil = 0;
    this.bossBurstRotation = 0;
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
    if (this.combatTimeMs < this.bossBusyUntil) {
      return;
    }

    if (boss.enemyId === 'middle-manager') {
      this.updateDashBoss(boss);
    } else if (boss.enemyId === 'senior-manager') {
      this.updateTeleportBoss(boss);
    } else {
      this.updateFinalBoss(boss);
    }
  }

  private updateDashBoss(boss: Enemy): void {
    if (this.combatTimeMs >= this.nextBossPrimaryAt) {
      this.nextBossPrimaryAt = this.combatTimeMs + 4_800;
      this.bossBusyUntil = this.combatTimeMs + 1_250;
      this.telegraphBossDash(boss);
      return;
    }
    if (this.combatTimeMs >= this.nextBossSecondaryAt) {
      this.nextBossSecondaryAt = this.combatTimeMs + 6_200;
      this.bossBusyUntil = this.combatTimeMs + 720;
      boss.holdBossPosition(this.combatTimeMs + 650);
      this.telegraphBossAttack(boss, '압박 면담', 0xffb13b, 650, () => {
        this.fireBossAimedVolley(boss, 5, 9, 285);
      });
    }
  }

  private updateTeleportBoss(boss: Enemy): void {
    if (this.combatTimeMs >= this.nextBossPrimaryAt) {
      this.nextBossPrimaryAt = this.combatTimeMs + 4_500;
      this.bossBusyUntil = this.combatTimeMs + 1_050;
      this.teleportBossStrike(boss);
      return;
    }
    if (this.combatTimeMs >= this.nextBossSecondaryAt) {
      this.nextBossSecondaryAt = this.combatTimeMs + 6_100;
      this.bossBusyUntil = this.combatTimeMs + 760;
      boss.holdBossPosition(this.combatTimeMs + 700);
      this.telegraphBossAttack(boss, '십자 보고', 0x57c7ff, 700, () => {
        this.bossBurstRotation += Math.PI / 8;
        this.fireBossRadialBurst(boss, 8, 220, 10, this.bossBurstRotation);
      });
    }
  }

  private updateFinalBoss(boss: Enemy): void {
    if (this.combatTimeMs >= this.nextBossPrimaryAt) {
      this.nextBossPrimaryAt = this.combatTimeMs + 3_900;
      this.bossBusyUntil = this.combatTimeMs + 1_000;
      boss.holdBossPosition(this.combatTimeMs + 700);
      this.telegraphBossAttack(boss, '회전 결재선', 0xff4fd8, 700, () => {
        this.fireBossSpiral(boss);
      });
      return;
    }
    if (this.combatTimeMs >= this.nextBossSecondaryAt) {
      this.nextBossSecondaryAt = this.combatTimeMs + 5_700;
      this.bossBusyUntil = this.combatTimeMs + 1_200;
      this.telegraphDeadlineZone(boss);
    }
  }

  private telegraphBossDash(boss: Enemy): void {
    const targetX = this.player.x;
    const targetY = this.player.y;
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, targetX, targetY);
    const distance = Phaser.Math.Distance.Between(boss.x, boss.y, targetX, targetY);
    const warningLine = this.add.rectangle(
      (boss.x + targetX) / 2,
      (boss.y + targetY) / 2,
      distance,
      22,
      0xffb13b,
      0.2,
    ).setRotation(angle).setStrokeStyle(3, 0xffef9a, 0.9).setDepth(16);
    const warningText = this.add.text(boss.x, boss.y - 78, '직진 대시', {
      color: '#ffef9a',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      stroke: '#150912',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(18);

    boss.holdBossPosition(this.combatTimeMs + 700);
    this.tweens.add({
      targets: [warningLine, warningText],
      alpha: { from: 0.3, to: 1 },
      duration: 700,
      ease: 'Sine.easeIn',
      onComplete: () => {
        warningLine.destroy();
        warningText.destroy();
        if (!boss.active || this.gameEnded) {
          return;
        }
        boss.dashBossToward(targetX, targetY, 720, this.combatTimeMs + 480);
        this.cameras.main.shake(260, 0.012);
        this.time.delayedCall(460, () => {
          if (boss.active && !this.gameEnded) {
            this.fireBossRadialBurst(boss, 8, 170, 8);
          }
        });
      },
    });
  }

  private teleportBossStrike(boss: Enemy): void {
    const angle = this.bossPatternRandom.next() * Math.PI * 2;
    const distance = 210 + this.bossPatternRandom.next() * 90;
    const targetX = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 100, GAME_WIDTH - 100);
    const targetY = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 130, GAME_HEIGHT - 90);
    const departure = this.add.circle(boss.x, boss.y, 58, 0x57c7ff, 0.12)
      .setStrokeStyle(5, 0x57c7ff, 0.95).setDepth(16);
    const arrival = this.add.circle(targetX, targetY, 58, 0xdff8ff, 0.12)
      .setStrokeStyle(5, 0xdff8ff, 0.95).setDepth(16);
    const label = this.add.text(targetX, targetY - 76, '순간이동', {
      color: '#dff8ff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      stroke: '#07131f',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(18);

    boss.holdBossPosition(this.combatTimeMs + 720);
    this.tweens.add({ targets: boss, alpha: 0.18, duration: 620, ease: 'Sine.easeIn' });
    this.tweens.add({
      targets: [departure, arrival, label],
      scale: { from: 0.35, to: 1.25 },
      alpha: { from: 0.25, to: 1 },
      duration: 700,
      ease: 'Sine.easeIn',
      onComplete: () => {
        departure.destroy();
        arrival.destroy();
        label.destroy();
        if (!boss.active || this.gameEnded) {
          return;
        }
        boss.teleportBossTo(targetX, targetY);
        boss.setAlpha(1);
        this.cameras.main.flash(110, 87, 199, 255, false);
        this.fireBossRadialBurst(boss, 12, 195, 9);
        this.fireBossAimedVolley(boss, 3, 12, 300);
      },
    });
  }

  private fireBossSpiral(boss: Enemy): void {
    for (let wave = 0; wave < 3; wave += 1) {
      this.time.delayedCall(wave * 170, () => {
        if (!boss.active || this.gameEnded) {
          return;
        }
        this.bossBurstRotation += Math.PI / 9;
        this.fireBossRadialBurst(boss, 9, 235, 11, this.bossBurstRotation);
      });
    }
  }

  private telegraphDeadlineZone(boss: Enemy): void {
    const targetX = this.player.x;
    const targetY = this.player.y;
    const radius = 86;
    const zone = this.add.circle(targetX, targetY, radius, 0xff304f, 0.12)
      .setStrokeStyle(6, 0xff5c72, 0.95).setDepth(16).setScale(0.25);
    const label = this.add.text(targetX, targetY, '마감 구역', {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      stroke: '#310711',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(18);
    this.tweens.add({
      targets: [zone, label],
      scale: 1,
      alpha: { from: 0.35, to: 1 },
      duration: 1_050,
      ease: 'Sine.easeIn',
      onComplete: () => {
        zone.destroy();
        label.destroy();
        if (!boss.active || this.gameEnded) {
          return;
        }
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY) <= radius) {
          this.damagePlayer(Math.round(16 * this.difficultyMultiplier));
        }
        this.fireBossRadialBurstAt(targetX, targetY, 12, 225, 10, this.bossBurstRotation);
        this.cameras.main.shake(220, 0.012);
      },
    });
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

  private fireBossAimedVolley(
    boss: Enemy,
    count: number,
    damage: number,
    speed: number,
  ): void {
    const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
    const spread = Phaser.Math.DegToRad(13);
    for (let index = 0; index < count; index += 1) {
      const angle = baseAngle + (index - (count - 1) / 2) * spread;
      this.spawnBossProjectile(boss, angle, speed, damage);
    }
  }

  private fireBossRadialBurst(
    boss: Enemy,
    count: number,
    speed: number,
    damage: number,
    startAngle = 0,
  ): void {
    const muzzleDistance = boss.displayWidth * 0.45;
    this.fireBossRadialBurstAt(
      boss.x,
      boss.y,
      count,
      speed,
      damage,
      startAngle,
      muzzleDistance,
    );
  }

  private fireBossRadialBurstAt(
    x: number,
    y: number,
    count: number,
    speed: number,
    damage: number,
    startAngle = 0,
    muzzleDistance = 0,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = startAngle + (Math.PI * 2 * index) / count;
      this.spawnBossProjectileAt(
        x + Math.cos(angle) * muzzleDistance,
        y + Math.sin(angle) * muzzleDistance,
        angle,
        speed,
        damage,
      );
    }
  }

  private spawnBossProjectile(boss: Enemy, angle: number, speed: number, damage: number): void {
    const muzzleDistance = boss.displayWidth * 0.45;
    this.spawnBossProjectileAt(
      boss.x + Math.cos(angle) * muzzleDistance,
      boss.y + Math.sin(angle) * muzzleDistance,
      angle,
      speed,
      damage,
    );
  }

  private spawnBossProjectileAt(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
  ): void {
    this.bossProjectiles.add(new BossProjectile(
      this,
      x,
      y,
      angle,
      speed,
      Math.max(1, Math.round(damage * this.difficultyMultiplier)),
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
      return { mode: 'normal', difficulty: this.session.difficulty, seed: createRandomSeed() };
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
