import Phaser from 'phaser';

import type { EnemyDefinition } from '../types/game';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly experienceValue: number;
  readonly isBoss: boolean;
  readonly enemyId: string;
  readonly scoreLevel: number;

  private readonly definition: EnemyDefinition;
  private readonly speedMultiplier: number;
  private readonly baseContactDamage: number;
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
  private bossMovementOverrideUntil = 0;
  private bossEnrageMultiplier = 1;
  private enteredArena = false;
  private despawnAt?: number;
  private despawning = false;

  get contactDamage(): number {
    return Math.max(1, Math.round(this.baseContactDamage * this.bossEnrageMultiplier));
  }

  get healthRatio(): number {
    return this.hp / this.maxHp;
  }

  get isInArena(): boolean {
    return this.enteredArena;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    definition: EnemyDefinition,
    message: string,
    hpMultiplier: number,
    speedMultiplier: number,
    damageMultiplier: number,
  ) {
    super(scene, x, y, `enemy-${definition.id}`);

    this.definition = definition;
    this.maxHp = Math.ceil(definition.maxHp * hpMultiplier);
    this.hp = this.maxHp;
    this.speedMultiplier = speedMultiplier;
    this.baseContactDamage = Math.max(1, Math.round(definition.contactDamage * damageMultiplier));
    this.experienceValue = definition.experienceValue;
    this.isBoss = definition.isBoss ?? false;
    this.enemyId = definition.id;
    this.scoreLevel = definition.scoreLevel ?? Math.max(1, Array.from(message.trim()).length);
    this.wanderPhase = ((x * 0.013) + (y * 0.017)) % (Math.PI * 2);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(6);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const collisionRadius = Math.max(10, Math.round(definition.radius * 0.58));
    const collisionOffset = definition.radius - collisionRadius;
    body.setCircle(collisionRadius, collisionOffset, collisionOffset);
    body.setCollideWorldBounds(false);

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

    this.healthBarWidth = this.isBoss ? 260 : Math.max(38, definition.radius * 2);
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
    if (this.updateLimitedLifetime(time)) {
      return;
    }
    if (!this.enteredArena) {
      const insideArena = this.x >= this.definition.radius
        && this.x <= this.scene.scale.width - this.definition.radius
        && this.y >= 105 + this.definition.radius
        && this.y <= this.scene.scale.height - this.definition.radius;
      if (insideArena) {
        this.enteredArena = true;
        (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
      } else {
        this.moveToward(
          { x: this.scene.scale.width / 2, y: this.scene.scale.height / 2 },
          this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier,
        );
        return;
      }
    }

    if (this.definition.archetype === 'charger') {
      this.updateCharger(time, target, globalSpeedMultiplier);
      return;
    }
    if (this.definition.archetype === 'wanderer') {
      this.updateWanderer(time, globalSpeedMultiplier);
      return;
    }
    if (this.definition.archetype === 'flee') {
      this.updateFleeing(time, target, globalSpeedMultiplier);
      return;
    }
    if (this.definition.archetype === 'orbiter') {
      this.updateOrbiter(time, target, globalSpeedMultiplier);
      return;
    }
    if (this.isBoss) {
      this.updateBossMovement(time, target, globalSpeedMultiplier);
      return;
    }

    this.moveToward(target, this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier);
  }

  holdBossPosition(until: number): void {
    this.bossMovementOverrideUntil = Math.max(this.bossMovementOverrideUntil, until);
    this.setVelocity(0, 0);
  }

  setBossEnrageMultiplier(multiplier: number): void {
    if (this.isBoss) {
      this.bossEnrageMultiplier = Math.max(1, multiplier);
    }
  }

  dashBossToward(x: number, y: number, speed: number, until: number): void {
    this.bossMovementOverrideUntil = until;
    const direction = new Phaser.Math.Vector2(x - this.x, y - this.y);
    if (direction.lengthSq() > 0) {
      direction.normalize().scale(speed);
    }
    this.setVelocity(direction.x, direction.y);
    this.setRotation(direction.angle());
  }

  teleportBossTo(x: number, y: number): void {
    this.setPosition(x, y);
    (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    this.updateAttachedUi();
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

  private moveToward(target: { x: number; y: number }, speed: number): void {
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
    const speed = this.definition.moveSpeed
      * this.speedMultiplier
      * globalSpeedMultiplier
      * this.bossEnrageMultiplier;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setRotation(angle);
  }

  private updateLimitedLifetime(time: number): boolean {
    const lifetime = this.definition.archetype === 'flee'
      ? 18_000
      : this.definition.archetype === 'wanderer'
        ? 24_000
        : this.definition.archetype === 'orbiter' && !this.isBoss
          ? 26_000
          : undefined;
    if (lifetime === undefined) {
      return false;
    }
    this.despawnAt ??= time + lifetime;
    if (time < this.despawnAt) {
      return false;
    }
    if (!this.despawning) {
      this.despawning = true;
      this.setVelocity(0, 0);
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
      this.scene.tweens.add({
        targets: [this, this.messageLabel, this.healthBarBackground, this.healthBarFill],
        alpha: 0,
        scale: 0.65,
        duration: 320,
        onComplete: () => this.destroy(),
      });
    }
    return true;
  }

  private updateFleeing(
    time: number,
    target: Phaser.GameObjects.Components.Transform,
    globalSpeedMultiplier: number,
  ): void {
    const away = new Phaser.Math.Vector2(this.x - target.x, this.y - target.y);
    const distance = Math.max(1, away.length());
    const speed = this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier;
    if (distance < 390) {
      away.normalize();
      const tangent = new Phaser.Math.Vector2(-away.y, away.x)
        .scale(Math.sin(time * 0.004 + this.wanderPhase) * speed * 0.42);
      away.scale(speed).add(tangent);
      this.setVelocity(away.x, away.y);
      this.setFlipX(away.x < 0);
      return;
    }
    const angle = this.wanderPhase + time * 0.0008;
    this.setVelocity(Math.cos(angle) * speed * 0.45, Math.sin(angle) * speed * 0.45);
  }

  private updateOrbiter(
    time: number,
    target: Phaser.GameObjects.Components.Transform,
    globalSpeedMultiplier: number,
  ): void {
    const toTarget = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    const distance = Math.max(1, toTarget.length());
    const speed = this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier;
    const radial = toTarget.clone().normalize().scale((distance - 240) * 0.75);
    const orbitDirection = Math.sin(this.wanderPhase) >= 0 ? 1 : -1;
    const tangent = new Phaser.Math.Vector2(-toTarget.y, toTarget.x)
      .normalize()
      .scale(speed * orbitDirection);
    const velocity = radial.add(tangent);
    velocity.limit(speed * 1.35);
    this.setVelocity(velocity.x, velocity.y);
    this.setRotation(time * 0.0015 * orbitDirection);
  }

  private updateBossMovement(
    time: number,
    target: Phaser.GameObjects.Components.Transform,
    globalSpeedMultiplier: number,
  ): void {
    if (time < this.bossMovementOverrideUntil) {
      return;
    }

    const speed = this.definition.moveSpeed * this.speedMultiplier * globalSpeedMultiplier;
    if (this.enemyId === 'senior-manager') {
      this.keepDistanceFrom(target, speed, 250);
      this.setRotation(Math.sin(time * 0.002) * 0.08);
      return;
    }
    if (this.enemyId === 'final-boss') {
      const toTarget = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
      const distance = Math.max(1, toTarget.length());
      const radial = toTarget.clone().normalize().scale((distance - 285) * 0.5);
      const tangent = new Phaser.Math.Vector2(-toTarget.y, toTarget.x).normalize().scale(speed);
      this.setVelocity(
        Phaser.Math.Clamp(radial.x + tangent.x, -speed * 1.35, speed * 1.35),
        Phaser.Math.Clamp(radial.y + tangent.y, -speed * 1.35, speed * 1.35),
      );
      this.setRotation(time * 0.00035);
      return;
    }

    this.moveToward(target, speed);
  }

  private keepDistanceFrom(
    target: Phaser.GameObjects.Components.Transform,
    speed: number,
    preferredDistance: number,
  ): void {
    const direction = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    const distance = direction.length();
    if (distance < 1) {
      this.setVelocity(0, 0);
      return;
    }
    direction.normalize().scale(distance < preferredDistance ? -speed : speed * 0.55);
    this.setVelocity(direction.x, direction.y);
  }
}
