import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

const WORLD_MARGIN = 60;

export class BossProjectile extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;

  private readonly direction: Phaser.Math.Vector2;
  private readonly travelSpeed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
  ) {
    super(scene, x, y, 'boss-projectile');

    this.damage = damage;
    this.direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    this.travelSpeed = speed;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(13);
    this.setRotation(angle);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(9, 3, 3);
    body.moves = false;
  }

  updateTravel(delta: number): void {
    if (!this.active) {
      return;
    }

    const distance = this.travelSpeed * (delta / 1000);
    this.x += this.direction.x * distance;
    this.y += this.direction.y * distance;
    this.angle += 240 * (delta / 1000);
    (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();

    if (
      this.x < -WORLD_MARGIN
      || this.x > GAME_WIDTH + WORLD_MARGIN
      || this.y < -WORLD_MARGIN
      || this.y > GAME_HEIGHT + WORLD_MARGIN
    ) {
      this.destroy();
    }
  }
}
