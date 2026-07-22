import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Hud } from '../ui/Hud';

const SPAWN_INTERVAL_MS = 850;
const ATTACK_INTERVAL_MS = 450;
const PLAYER_CONTACT_DAMAGE = 10;
const ATTACK_RANGE_SQUARED = 700 ** 2;
type ArcadeCollisionObject = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private hud!: Hud;
  private startedAt = 0;
  private killCount = 0;
  private gameEnded = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.physics.resume();
    this.killCount = 0;
    this.gameEnded = false;
    this.startedAt = this.time.now;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.grid(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 80, 80, 0x100b18, 1, 0x2d1c3e, 0.35);

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.hud = new Hud(this);

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleProjectileHit,
      undefined,
      this,
    );
    this.physics.add.collider(this.player, this.enemies, this.handlePlayerHit, undefined, this);

    this.time.addEvent({
      delay: SPAWN_INTERVAL_MS,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
    this.time.addEvent({
      delay: ATTACK_INTERVAL_MS,
      callback: this.autoAttack,
      callbackScope: this,
      loop: true,
    });

    this.spawnEnemy();
  }

  update(): void {
    if (this.gameEnded) {
      return;
    }

    this.player.update();
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (enemy.active) {
        enemy.chase(this.player);
      }
    });

    const survivalSeconds = (this.time.now - this.startedAt) / 1000;
    this.hud.update(this.player.hp, this.player.maxHp, survivalSeconds, this.killCount);

    if (this.player.hp <= 0) {
      this.endGame(survivalSeconds);
    }
  }

  private spawnEnemy(): void {
    if (this.gameEnded || this.enemies.countActive(true) >= 60) {
      return;
    }

    const margin = 28;
    const side = Phaser.Math.Between(0, 3);
    let x = margin;
    let y = margin;

    if (side === 0 || side === 1) {
      x = side === 0 ? margin : GAME_WIDTH - margin;
      y = Phaser.Math.Between(80, GAME_HEIGHT - margin);
    } else {
      x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      y = side === 2 ? 80 : GAME_HEIGHT - margin;
    }

    this.enemies.add(new Enemy(this, x, y));
  }

  private autoAttack(): void {
    if (this.gameEnded || !this.player.active) {
      return;
    }

    let nearestEnemy: Enemy | undefined;
    let nearestDistanceSquared = ATTACK_RANGE_SQUARED;

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
      this.projectiles.add(
        new Projectile(this, this.player.x, this.player.y, nearestEnemy.x, nearestEnemy.y),
      );
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

    projectile.destroy();
    if (enemy.takeDamage(projectile.damage)) {
      this.killCount += 1;
    }
  }

  private handlePlayerHit(
    _playerObject: ArcadeCollisionObject,
    _enemyObject: ArcadeCollisionObject,
  ): void {
    this.player.takeDamage(PLAYER_CONTACT_DAMAGE, this.time.now);
  }

  private endGame(survivalSeconds: number): void {
    this.gameEnded = true;
    this.physics.pause();
    this.player.setTint(0x555555);

    this.time.delayedCall(350, () => {
      this.scene.start('ResultScene', {
        survivalSeconds,
        killCount: this.killCount,
      });
    });
  }
}
