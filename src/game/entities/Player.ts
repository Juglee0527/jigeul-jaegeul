import Phaser from 'phaser';

import type { PlayerStats, StatModifier } from '../types/game';

const INVULNERABILITY_MS = 800;

type MovementKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly stats: PlayerStats = {
    maxHp: 100,
    moveSpeed: 230,
    attackDamage: 8,
    attackCooldown: 900,
    projectileSpeed: 680,
    projectileCount: 1,
    attackRange: 380,
    pickupRange: 80,
    armor: 0,
    regeneration: 0,
    enemySpeedMultiplier: 1,
  };

  hp = this.stats.maxHp;

  private readonly cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly movementKeys: MovementKeys;
  private readonly weapon: Phaser.GameObjects.Image;
  private invulnerableUntil = 0;
  private aimAngle = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(10);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(20, 12, 12);

    this.weapon = scene.add.image(x, y, 'weapon')
      .setOrigin(0.18, 0.5)
      .setDepth(11);

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('키보드 입력을 초기화할 수 없습니다.');
    }

    this.cursorKeys = keyboard.createCursorKeys();
    this.movementKeys = keyboard.addKeys('W,A,S,D') as MovementKeys;
  }

  update(delta: number): void {
    const horizontal = Number(this.cursorKeys.right.isDown || this.movementKeys.D.isDown)
      - Number(this.cursorKeys.left.isDown || this.movementKeys.A.isDown);
    const vertical = Number(this.cursorKeys.down.isDown || this.movementKeys.S.isDown)
      - Number(this.cursorKeys.up.isDown || this.movementKeys.W.isDown);

    const direction = new Phaser.Math.Vector2(horizontal, vertical);
    if (direction.lengthSq() > 0) {
      direction.normalize().scale(this.stats.moveSpeed);
    }

    this.setVelocity(direction.x, direction.y);
    if (horizontal !== 0) {
      this.setFlipX(horizontal < 0);
    }
    this.weapon.setPosition(this.x, this.y + 3).setRotation(this.aimAngle);
    this.weapon.setFlipY(Math.cos(this.aimAngle) < 0);

    if (this.hp > 0 && this.stats.regeneration > 0 && this.hp < this.stats.maxHp) {
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regeneration * (delta / 1000));
    }
  }

  fireWeapon(angle: number): void {
    this.aimAngle = angle;
    this.weapon.setPosition(this.x, this.y + 3).setRotation(angle);
    this.scene.tweens.killTweensOf(this.weapon);
    this.weapon.setScale(0.82, 1.12);
    this.scene.tweens.add({
      targets: this.weapon,
      scaleX: 1,
      scaleY: 1,
      duration: 90,
      ease: 'Back.easeOut',
    });
  }

  takeDamage(amount: number, now: number): boolean {
    if (now < this.invulnerableUntil || this.hp <= 0) {
      return false;
    }

    const reducedDamage = Math.max(1, amount - this.stats.armor);
    this.hp = Math.max(0, this.hp - reducedDamage);
    this.invulnerableUntil = now + INVULNERABILITY_MS;

    this.setTint(0xff334f);
    this.scene.time.delayedCall(120, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    return true;
  }

  applyStatModifier(modifier: StatModifier): void {
    const previousMaxHp = this.stats.maxHp;
    const currentValue = this.stats[modifier.stat];
    this.stats[modifier.stat] = modifier.operation === 'add'
      ? currentValue + modifier.value
      : currentValue * modifier.value;

    if (this.stats.maxHp > previousMaxHp) {
      this.hp += this.stats.maxHp - previousMaxHp;
    }
  }

  override destroy(fromScene?: boolean): void {
    this.weapon?.destroy();
    super.destroy(fromScene);
  }
}
