import Phaser from 'phaser';

const ENEMY_SPEED = 105;
const ENEMY_HP = 20;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private hp = ENEMY_HP;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(20, 2, 2);
  }

  chase(target: Phaser.GameObjects.Components.Transform): void {
    const direction = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    if (direction.lengthSq() > 0) {
      direction.normalize().scale(ENEMY_SPEED);
    }
    this.setVelocity(direction.x, direction.y);
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
        this.clearTint();
      }
    });
    return false;
  }
}
