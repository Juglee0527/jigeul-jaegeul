import Phaser from 'phaser';

import type { EnemyDefinition } from '../types/game';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly contactDamage: number;
  readonly experienceValue: number;

  private readonly definition: EnemyDefinition;
  private readonly speedMultiplier: number;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private hp: number;
  private chargingUntil = 0;
  private nextChargeAt = 0;
  private charging = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    definition: EnemyDefinition,
    hpMultiplier: number,
    speedMultiplier: number,
  ) {
    super(scene, x, y, `enemy-${definition.id}`);

    this.definition = definition;
    this.hp = Math.ceil(definition.maxHp * hpMultiplier);
    this.speedMultiplier = speedMultiplier;
    this.contactDamage = definition.contactDamage;
    this.experienceValue = definition.experienceValue;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(6);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(definition.radius - 2, 2, 2);

    this.nameLabel = scene.add
      .text(x, y - definition.radius - 10, definition.name, {
        backgroundColor: '#120c19',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: definition.archetype === 'tank' ? '18px' : '16px',
        fontStyle: 'bold',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(7);
  }

  updateBehavior(
    time: number,
    target: Phaser.GameObjects.Components.Transform,
    globalSpeedMultiplier: number,
  ): void {
    this.nameLabel.setPosition(this.x, this.y - this.definition.radius - 10);

    if (this.definition.archetype === 'charger') {
      this.updateCharger(time, target, globalSpeedMultiplier);
      return;
    }

    this.moveToward(target, this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier);
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
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
    if (this.nameLabel?.active) {
      this.nameLabel.destroy();
    }
    super.destroy(fromScene);
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
}
