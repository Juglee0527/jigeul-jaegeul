import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

const WORLD_MARGIN = 80;

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;

  private readonly direction: Phaser.Math.Vector2;
  private readonly travelSpeed: number;
  private readonly maxDistance: number;
  private traveledDistance = 0;
  private animationTime = 0;

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
    this.direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    this.travelSpeed = speed;
    this.maxDistance = maxDistance;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setRotation(angle);
    this.setDepth(12);
    this.setScale(0.75, 1);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 10, true);
    body.moves = false;
  }

  updateTravel(delta: number): void {
    if (!this.active) {
      return;
    }

    const distance = this.travelSpeed * (delta / 1000);
    this.x += this.direction.x * distance;
    this.y += this.direction.y * distance;
    this.traveledDistance += distance;
    this.animationTime += delta;

    const streakPulse = 0.92 + Math.sin(this.animationTime * 0.035) * 0.1;
    this.setScale(streakPulse, 1);
    (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();

    const outsideWorld = this.x < -WORLD_MARGIN
      || this.x > GAME_WIDTH + WORLD_MARGIN
      || this.y < -WORLD_MARGIN
      || this.y > GAME_HEIGHT + WORLD_MARGIN;
    if (outsideWorld || this.traveledDistance >= this.maxDistance) {
      this.destroy();
    }
  }
}
