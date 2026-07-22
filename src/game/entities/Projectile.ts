import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;
  private readonly glow: Phaser.GameObjects.Arc;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    maxDistance: number,
  ) {
    super(scene, x, y, 'projectile');

    this.damage = damage;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setRotation(angle);
    this.setDepth(5);
    this.glow = scene.add.circle(x, y, 13, 0xfff36b, 0.14).setDepth(4);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 10, true);

    const lifetimeMs = Math.max(700, (maxDistance / speed) * 1000);
    scene.time.delayedCall(lifetimeMs, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.glow.setPosition(this.x, this.y);
  }

  destroy(fromScene?: boolean): void {
    this.glow?.destroy();
    super.destroy(fromScene);
  }
}
