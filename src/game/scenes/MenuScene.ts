import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { StorageService } from '../services/StorageService';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const records = new StorageService().load();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, 190, '지긁재긁', {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '88px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 285, '긁히면 진다.', {
        color: '#ff4fd8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
      })
      .setOrigin(0.5);

    const button = this.add
      .rectangle(GAME_WIDTH / 2, 420, 310, 82, COLORS.secondary)
      .setStrokeStyle(3, COLORS.white, 0.8)
      .setInteractive({ useHandCursor: true });

    const buttonText = this.add
      .text(GAME_WIDTH / 2, 420, '게임 시작', {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(COLORS.primary));
    button.on('pointerout', () => button.setFillStyle(COLORS.secondary));
    button.on('pointerdown', () => this.startGame());

    this.add
      .text(GAME_WIDTH / 2, 500, '버튼 또는 Enter를 눌러 시작', {
        color: '#aaa0bb',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        580,
        `최고 점수 ${records.highScore}  ·  최장 생존 ${this.formatTime(records.longestSurvivalSeconds)}  ·  최대 처치 ${records.maxKills}  ·  최고 콤보 x${records.maxCombo}`,
        {
          color: '#cfc4dc',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
        },
      )
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    buttonText.setDepth(button.depth + 1);
  }

  private startGame(): void {
    this.scene.start('GameScene');
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
