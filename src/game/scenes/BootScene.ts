import Phaser from 'phaser';

import { COLORS } from '../config/constants';
import { ENEMY_DEFINITIONS } from '../config/enemies';
import type { EnemyDefinition } from '../types/game';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.createPlayerTexture();
    this.createWeaponTexture();
    this.createProjectileTexture();
    this.createBossProjectileTexture();
    this.createExperienceTexture();
    this.createTreasureTexture();
    ENEMY_DEFINITIONS.forEach((enemy) => this.createEnemyTexture(enemy));
    this.scene.start('MenuScene');
  }

  private createPlayerTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x0a3b42, 0.75);
    g.fillEllipse(32, 54, 42, 12);
    g.fillStyle(0x184f59);
    g.fillRoundedRect(10, 23, 44, 34, 13);
    g.lineStyle(3, COLORS.player, 1);
    g.strokeRoundedRect(10, 23, 44, 34, 13);
    g.fillStyle(COLORS.player);
    g.fillRoundedRect(15, 8, 34, 32, 12);
    g.fillStyle(0x09262d);
    g.fillRoundedRect(20, 15, 24, 12, 6);
    g.fillStyle(0xeaffff);
    g.fillCircle(27, 21, 3);
    g.fillCircle(37, 21, 3);
    g.fillStyle(0xff9bea);
    g.fillRect(25, 32, 14, 3);
    g.fillStyle(0xffffff);
    g.fillTriangle(27, 40, 37, 40, 32, 49);
    g.generateTexture('player', 64, 64);
    g.destroy();
  }

  private createWeaponTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x180f21);
    g.fillRoundedRect(2, 4, 35, 13, 5);
    g.lineStyle(2, COLORS.secondary, 1);
    g.strokeRoundedRect(2, 4, 35, 13, 5);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(10, 7, 26, 6, 3);
    g.fillStyle(COLORS.primary);
    g.fillRect(4, 8, 8, 5);
    g.fillStyle(0x7b5b88);
    g.fillTriangle(14, 16, 24, 16, 18, 24);
    g.generateTexture('weapon', 40, 26);
    g.destroy();
  }

  private createProjectileTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.projectile, 0.08);
    g.fillRoundedRect(0, 1, 52, 16, 8);
    g.fillStyle(COLORS.primary, 0.18);
    g.fillTriangle(0, 9, 27, 3, 27, 15);
    g.fillStyle(COLORS.projectile, 0.42);
    g.fillRoundedRect(13, 4, 35, 10, 5);
    g.fillStyle(COLORS.projectile);
    g.fillRoundedRect(24, 5, 27, 8, 4);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(34, 7, 15, 4, 2);
    g.generateTexture('projectile', 52, 18);
    g.destroy();
  }

  private createBossProjectileTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xff304f, 0.18);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xff5c72);
    g.fillCircle(12, 12, 8);
    g.lineStyle(2, 0xffef9a, 1);
    g.strokeCircle(12, 12, 8);
    g.fillStyle(0xffffff);
    g.fillCircle(9, 9, 3);
    g.generateTexture('boss-projectile', 24, 24);
    g.destroy();
  }

  private createExperienceTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x123d2b, 0.65);
    g.fillCircle(12, 12, 11);
    g.fillStyle(0x6dff8b);
    g.fillTriangle(12, 1, 22, 12, 12, 23);
    g.fillTriangle(12, 1, 2, 12, 12, 23);
    g.lineStyle(2, 0xeaffef, 0.9);
    g.strokeTriangle(12, 2, 21, 12, 12, 22);
    g.strokeTriangle(12, 2, 3, 12, 12, 22);
    g.generateTexture('experience', 24, 24);
    g.destroy();
  }

  private createTreasureTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x6b3514);
    g.fillRoundedRect(4, 18, 56, 38, 7);
    g.fillStyle(0xffc43d);
    g.fillRoundedRect(4, 13, 56, 18, 8);
    g.lineStyle(4, 0xffef9a);
    g.strokeRoundedRect(4, 13, 56, 43, 8);
    g.fillStyle(0xffef9a);
    g.fillRect(27, 28, 10, 20);
    g.generateTexture('treasure', 64, 64);
    g.destroy();
  }

  private createEnemyTexture(enemy: EnemyDefinition): void {
    const size = enemy.radius * 2;
    const g = this.make.graphics({ x: 0, y: 0 });

    if (enemy.id === 'lol') {
      this.drawChatEnemy(g, size, enemy.color, true);
    } else if (enemy.id === 'okay') {
      this.drawChatEnemy(g, size, enemy.color, false);
    } else if (enemy.id === 'five-minutes') {
      this.drawAlarmEnemy(g, size, enemy.color);
    } else if (enemy.archetype === 'charger') {
      this.drawRocketEnemy(g, size, enemy.color);
    } else {
      this.drawTankEnemy(g, size, enemy.color);
    }

    g.generateTexture(`enemy-${enemy.id}`, size, size);
    g.destroy();
  }

  private drawChatEnemy(g: Phaser.GameObjects.Graphics, size: number, color: number, spiky: boolean): void {
    const p = size / 2;
    g.fillStyle(0x230b14, 0.6);
    g.fillEllipse(p, size - 4, size * 0.72, 8);
    g.fillStyle(color);
    if (spiky) {
      g.fillTriangle(5, 15, 12, 2, 18, 14);
      g.fillTriangle(size - 18, 14, size - 12, 2, size - 5, 15);
    }
    g.fillRoundedRect(4, 9, size - 8, size - 15, 10);
    g.fillTriangle(size * 0.62, size - 8, size * 0.82, size - 2, size * 0.76, size - 13);
    g.lineStyle(2, 0xffffff, 0.78);
    g.strokeRoundedRect(4, 9, size - 8, size - 15, 10);
    g.fillStyle(0x2b0f19);
    g.fillRoundedRect(size * 0.25, size * 0.4, size * 0.16, 4, 2);
    g.fillRoundedRect(size * 0.59, size * 0.4, size * 0.16, 4, 2);
    g.lineStyle(2, 0x2b0f19, 1);
    if (spiky) {
      g.lineBetween(size * 0.33, size * 0.67, size * 0.67, size * 0.62);
    } else {
      g.strokeCircle(p, size * 0.65, size * 0.11);
    }
  }

  private drawAlarmEnemy(g: Phaser.GameObjects.Graphics, size: number, color: number): void {
    const p = size / 2;
    g.fillStyle(0x2a1024, 0.6);
    g.fillEllipse(p, size - 4, size * 0.75, 9);
    g.fillStyle(color);
    g.fillCircle(p, p + 3, p - 7);
    g.fillTriangle(7, 13, 13, 2, 20, 13);
    g.fillTriangle(size - 20, 13, size - 13, 2, size - 7, 13);
    g.lineStyle(3, 0xffffff, 0.82);
    g.strokeCircle(p, p + 3, p - 7);
    g.lineStyle(3, 0x351124, 1);
    g.lineBetween(p, p + 3, p, p - 8);
    g.lineBetween(p, p + 3, p + 9, p + 8);
    g.lineStyle(3, color, 1);
    g.lineBetween(14, size - 8, 9, size - 2);
    g.lineBetween(size - 14, size - 8, size - 9, size - 2);
  }

  private drawRocketEnemy(g: Phaser.GameObjects.Graphics, size: number, color: number): void {
    const p = size / 2;
    g.fillStyle(0x320812, 0.6);
    g.fillEllipse(p, size - 5, size * 0.7, 9);
    g.fillStyle(color);
    g.fillTriangle(size - 3, p, 13, 7, 13, size - 7);
    g.fillStyle(0x651528);
    g.fillTriangle(17, 9, 4, 4, 11, p);
    g.fillTriangle(17, size - 9, 4, size - 4, 11, p);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeTriangle(size - 3, p, 13, 7, 13, size - 7);
    g.fillStyle(0xfff36b);
    g.fillCircle(size * 0.58, p, 5);
    g.fillStyle(0xffffff);
    g.fillCircle(size * 0.58, p, 2);
  }

  private drawTankEnemy(g: Phaser.GameObjects.Graphics, size: number, color: number): void {
    const p = size / 2;
    g.fillStyle(0x160d25, 0.7);
    g.fillEllipse(p, size - 6, size * 0.78, 12);
    g.fillStyle(0x35245a);
    g.fillRoundedRect(5, 12, size - 10, size - 18, 12);
    g.lineStyle(4, color, 1);
    g.strokeRoundedRect(5, 12, size - 10, size - 18, 12);
    g.fillStyle(color);
    g.fillRoundedRect(14, 5, size - 28, 20, 6);
    g.fillStyle(0x120b1d);
    g.fillRoundedRect(20, 10, size - 40, 10, 4);
    g.fillStyle(0xffffff);
    g.fillRect(24, 13, 5, 4);
    g.fillRect(size - 29, 13, 5, 4);
    g.lineStyle(4, 0x1c1128, 1);
    g.lineBetween(17, size * 0.65, size - 17, size * 0.65);
    g.lineStyle(3, 0xbba7ff, 1);
    g.strokeCircle(p, size * 0.65, 8);
  }
}
