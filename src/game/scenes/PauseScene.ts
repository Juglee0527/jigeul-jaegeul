import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { GameScene } from './GameScene';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050308, 0.84);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 500, COLORS.panel, 0.98)
      .setStrokeStyle(3, COLORS.primary, 0.85);

    this.add
      .text(GAME_WIDTH / 2, 180, '잠깐 멈춤', {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 235, '멘탈 정비 중...', {
        color: '#ff9bea',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '21px',
      })
      .setOrigin(0.5);

    this.createButton(320, '계속하기', () => this.resumeGame());
    this.createButton(410, '다시 시작', () => this.restartGame());
    this.createButton(500, '메인 화면', () => this.returnToMenu());

    this.input.keyboard?.once('keydown-ESC', () => this.resumeGame());
  }

  private createButton(y: number, label: string, onClick: () => void): void {
    const button = this.add
      .rectangle(GAME_WIDTH / 2, y, 330, 68, COLORS.secondary)
      .setStrokeStyle(2, COLORS.white, 0.7)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, y, label, {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(COLORS.primary));
    button.on('pointerout', () => button.setFillStyle(COLORS.secondary));
    button.on('pointerdown', onClick);
  }

  private resumeGame(): void {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  private restartGame(): void {
    const gameScene = this.scene.get('GameScene') as GameScene;
    const session = gameScene.createRestartSession();
    this.scene.stop('GameScene');
    this.scene.start('GameScene', { session });
  }

  private returnToMenu(): void {
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }
}
