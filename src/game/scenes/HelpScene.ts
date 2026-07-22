import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { AudioManager } from '../services/AudioManager';

export class HelpScene extends Phaser.Scene {
  private readonly audio = AudioManager.getInstance();
  constructor() {
    super('HelpScene');
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050308, 0.92);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 820, 590, COLORS.panel, 0.98)
      .setStrokeStyle(3, COLORS.primary, 0.85);

    this.add
      .text(GAME_WIDTH / 2, 95, '게임 방법', {
        color: '#ff4fd8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '50px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const instructions = [
      ['이동', 'WASD 또는 방향키'],
      ['공격', '가장 가까운 적에게 자동 발사'],
      ['성장', '경험치를 모아 능력 카드 하나 선택'],
      ['일시정지', 'ESC 또는 브라우저 창 벗어나기'],
      ['목표', '긁히지 말고 최대한 오래 버티기'],
    ];

    instructions.forEach(([label, description], index) => {
      const y = 180 + index * 62;
      this.add
        .text(310, y, label, {
          color: '#fff36b',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '23px',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);
      this.add
        .text(345, y, description, {
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '23px',
        })
        .setOrigin(0, 0.5);
    });

    const closeButton = this.add
      .rectangle(GAME_WIDTH / 2, 610, 260, 66, COLORS.secondary)
      .setStrokeStyle(2, COLORS.white, 0.75)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2, 610, '확인', {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    closeButton.on('pointerover', () => closeButton.setFillStyle(COLORS.primary));
    closeButton.on('pointerout', () => closeButton.setFillStyle(COLORS.secondary));
    closeButton.on('pointerdown', () => this.close());
    this.input.keyboard?.once('keydown-ESC', () => this.close());
    this.input.keyboard?.once('keydown-ENTER', () => this.close());
  }

  private close(): void {
    this.audio.play('confirm');
    this.audio.setMood('menu');
    this.scene.resume('MenuScene');
    this.scene.stop();
  }
}
