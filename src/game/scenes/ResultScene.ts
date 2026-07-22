import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { GameResult } from '../types/game';

export class ResultScene extends Phaser.Scene {
  private result: GameResult = { survivalSeconds: 0, killCount: 0 };

  constructor() {
    super('ResultScene');
  }

  init(result: GameResult): void {
    this.result = result;
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, 155, '긁혔습니다.', {
        color: '#ff5c72',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '68px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        300,
        `생존 시간  ${this.formatTime(this.result.survivalSeconds)}\n처치 수     ${this.result.killCount}`,
        {
          align: 'center',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          lineSpacing: 18,
        },
      )
      .setOrigin(0.5);

    this.createButton(GAME_WIDTH / 2 - 180, 500, '다시 하기', () => {
      this.scene.start('GameScene');
    });
    this.createButton(GAME_WIDTH / 2 + 180, 500, '메인 화면', () => {
      this.scene.start('MenuScene');
    });

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('GameScene'));
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, 280, 76, COLORS.secondary)
      .setStrokeStyle(2, COLORS.white, 0.8)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(COLORS.primary));
    button.on('pointerout', () => button.setFillStyle(COLORS.secondary));
    button.on('pointerdown', onClick);
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
