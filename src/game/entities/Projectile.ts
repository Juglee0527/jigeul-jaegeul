import Phaser from 'phaser';

const PROJECTILE_SPEED = 650;
const PROJECTILE_LIFETIME_MS = 1_500;

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly damage = 10;

  constructor(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number) {
    super(scene, x, y, 'projectile');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const direction = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
    this.setVelocity(direction.x * PROJECTILE_SPEED, direction.y * PROJECTILE_SPEED);
    this.setDepth(5);

    scene.time.delayedCall(PROJECTILE_LIFETIME_MS, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }
}
