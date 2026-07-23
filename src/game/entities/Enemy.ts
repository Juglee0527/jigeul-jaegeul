import Phaser from 'phaser';

import type { EnemyDefinition } from '../types/game';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly contactDamage: number;
  readonly experienceValue: number;
  readonly isBoss: boolean;
  readonly enemyId: string;

  private readonly definition: EnemyDefinition;
  private readonly speedMultiplier: number;
  private readonly messageLabel: Phaser.GameObjects.Text;
  private readonly healthBarBackground: Phaser.GameObjects.Rectangle;
  private readonly healthBarFill: Phaser.GameObjects.Rectangle;
  private readonly healthBarWidth: number;
  private readonly maxHp: number;
  private hp: number;
  private chargingUntil = 0;
  private nextChargeAt = 0;
  private charging = false;
  private readonly wanderPhase: number;

  get healthRatio(): number {
    return this.hp / this.maxHp;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    definition: EnemyDefinition,
    message: string,
    hpMultiplier: number,
    speedMultiplier: number,
  ) {
    super(scene, x, y, `enemy-${definition.id}`);

    this.definition = definition;
    this.maxHp = Math.ceil(definition.maxHp * hpMultiplier);
    this.hp = this.maxHp;
    this.speedMultiplier = speedMultiplier;
    this.contactDamage = definition.contactDamage;
    this.experienceValue = definition.experienceValue;
    this.isBoss = definition.isBoss ?? false;
    this.enemyId = definition.id;
    this.wanderPhase = ((x * 0.013) + (y * 0.017)) % (Math.PI * 2);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(6);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const collisionRadius = Math.max(10, Math.round(definition.radius * 0.58));
    const collisionOffset = definition.radius - collisionRadius;
    body.setCircle(collisionRadius, collisionOffset, collisionOffset);
    body.setCollideWorldBounds(true);

    this.messageLabel = scene.add
      .text(x, y - definition.radius - 10, message, {
        backgroundColor: '#120c19',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: definition.archetype === 'tank' ? '17px' : '15px',
        fontStyle: 'bold',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(7);

    this.healthBarWidth = Math.max(38, definition.radius * 2);
    this.healthBarBackground = scene.add.rectangle(
      x - this.healthBarWidth / 2,
      y + definition.radius + 7,
      this.healthBarWidth,
      7,
      0x160d19,
      0.95,
    ).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.32).setDepth(7);
    this.healthBarFill = scene.add.rectangle(
      x - this.healthBarWidth / 2,
      y + definition.radius + 7,
      this.healthBarWidth,
      5,
      0x6dff8b,
      1,
    ).setOrigin(0, 0.5).setDepth(8);
  }

  updateBehavior(
    time: number,
    target: Phaser.GameObjects.Components.Transform,
    globalSpeedMultiplier: number,
  ): void {
    this.updateAttachedUi();

    if (this.definition.archetype === 'charger') {
      this.updateCharger(time, target, globalSpeedMultiplier);
      return;
    }
    if (this.definition.archetype === 'wanderer') {
      this.updateWanderer(time, globalSpeedMultiplier);
      return;
    }

    this.moveToward(target, this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier);
  }

  takeDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHealthBar();
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) {
        if (this.charging) {
          this.setTint(0xffe04d);
        } else {
          this.clearTint();
        }
      }
    });
    return false;
  }

  override destroy(fromScene?: boolean): void {
    this.messageLabel?.destroy();
    this.healthBarBackground?.destroy();
    this.healthBarFill?.destroy();
    super.destroy(fromScene);
  }

  private updateAttachedUi(): void {
    const barX = this.x - this.healthBarWidth / 2;
    const barY = this.y + this.definition.radius + 7;
    this.messageLabel.setPosition(this.x, this.y - this.definition.radius - 10);
    this.healthBarBackground.setPosition(barX, barY);
    this.healthBarFill.setPosition(barX, barY);
  }

  private updateHealthBar(): void {
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBarFill.displayWidth = this.healthBarWidth * ratio;
    this.healthBarFill.setFillStyle(ratio > 0.55 ? 0x6dff8b : ratio > 0.25 ? 0xffd65a : 0xff5c72);
  }

  private updateCharger(
    time: number,
    target: Phaser.GameObjects.Components.Transform,
    globalSpeedMultiplier: number,
  ): void {
    if (time < this.chargingUntil) {
      return;
    }

    if (this.charging) {
      this.charging = false;
      this.clearTint();
      this.nextChargeAt = time + (this.definition.chargeCooldown ?? 2_300);
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (time >= this.nextChargeAt && distance <= (this.definition.chargeTriggerDistance ?? 280)) {
      this.charging = true;
      this.chargingUntil = time + (this.definition.chargeDuration ?? 620);
      this.setTint(0xffe04d);
      this.moveToward(
        target,
        (this.definition.chargeSpeed ?? 330) * this.speedMultiplier * globalSpeedMultiplier,
      );
      return;
    }

    this.moveToward(
      target,
      this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier,
    );
  }

  private moveToward(target: Phaser.GameObjects.Components.Transform, speed: number): void {
    const direction = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    if (direction.lengthSq() > 0) {
      direction.normalize().scale(speed);
    }
    this.setVelocity(direction.x, direction.y);
    if (this.definition.archetype === 'charger' && direction.lengthSq() > 0) {
      this.setRotation(direction.angle());
    } else if (this.definition.archetype === 'normal') {
      this.setFlipX(direction.x < 0);
    }
  }

  private updateWanderer(time: number, globalSpeedMultiplier: number): void {
    const angle = this.wanderPhase
      + time * 0.00042
      + Math.sin(time * 0.0011 + this.wanderPhase) * 0.85;
    const speed = this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setRotation(angle);
  }
}
