import Phaser from 'phaser';

import { COLORS } from '../config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.createCircleTexture('player', 24, COLORS.player);
    this.createCircleTexture('enemy', 22, COLORS.enemy);
    this.createCircleTexture('projectile', 7, COLORS.projectile);

    this.scene.start('MenuScene');
  }

  private createCircleTexture(key: string, radius: number, color: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(color);
    graphics.fillCircle(radius, radius, radius);
    graphics.lineStyle(3, COLORS.white, 0.8);
    graphics.strokeCircle(radius, radius, radius - 1.5);
    graphics.generateTexture(key, radius * 2, radius * 2);
    graphics.destroy();
  }
}
