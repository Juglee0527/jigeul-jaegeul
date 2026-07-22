import Phaser from 'phaser';

import type { Player } from './Player';

const ATTRACTION_SPEED = 420;

export class ExperienceGem extends Phaser.Physics.Arcade.Sprite {
  readonly value = 2;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'experience');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(3);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(8, 2, 2);
  }

  updateAttraction(player: Player): void {
    const distanceSquared = Phaser.Math.Distance.Squared(this.x, this.y, player.x, player.y);
    if (distanceSquared > player.stats.pickupRange ** 2) {
      this.setVelocity(0, 0);
      return;
    }

    const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    if (direction.lengthSq() > 0) {
      direction.normalize().scale(ATTRACTION_SPEED);
    }
    this.setVelocity(direction.x, direction.y);
  }
}
