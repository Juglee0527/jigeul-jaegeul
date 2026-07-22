import Phaser from 'phaser';

const PROJECTILE_LIFETIME_MS = 1_500;

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
  ) {
    super(scene, x, y, 'projectile');

    this.damage = damage;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setDepth(5);

    scene.time.delayedCall(PROJECTILE_LIFETIME_MS, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }
}
