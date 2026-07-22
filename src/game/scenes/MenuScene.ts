import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { createRandomSeed, getLocalDateSeed } from '../services/SeededRandom';
import { StorageService } from '../services/StorageService';
import type { GameSession } from '../types/game';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const records = new StorageService().load();
    const today = getLocalDateSeed();
    const todayRecord = records.dailyRecords[today];

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, 155, '지긁재긁', {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '88px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 245, '긁히면 진다.', {
        color: '#ff4fd8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
      })
      .setOrigin(0.5);

    this.createButton(GAME_WIDTH / 2 - 180, 390, '게임 시작', () => {
      this.startGame({ mode: 'normal', seed: createRandomSeed() });
    });
    this.createButton(GAME_WIDTH / 2 + 180, 390, '오늘의 도전', () => {
      this.startGame({ mode: 'daily', seed: today, dailyDate: today });
    });

    this.add
      .text(
        GAME_WIDTH / 2,
        468,
        `오늘의 시드 ${today}${todayRecord ? `  ·  오늘 최고 ${todayRecord.score}` : '  ·  첫 도전 대기 중'}`,
        {
          color: '#d9c4ff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 525, 'Enter를 누르면 일반 게임을 시작합니다', {
        color: '#aaa0bb',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        590,
        `최고 점수 ${records.highScore}  ·  최장 생존 ${this.formatTime(records.longestSurvivalSeconds)}  ·  최대 처치 ${records.maxKills}  ·  최고 콤보 x${records.maxCombo}`,
        {
          color: '#cfc4dc',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
        },
      )
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => {
      this.startGame({ mode: 'normal', seed: createRandomSeed() });
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, 320, 82, COLORS.secondary)
      .setStrokeStyle(3, COLORS.white, 0.8)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '31px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(COLORS.primary));
    button.on('pointerout', () => button.setFillStyle(COLORS.secondary));
    button.on('pointerdown', onClick);
  }

  private startGame(session: GameSession): void {
    this.scene.start('GameScene', { session });
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
