import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { createRandomSeed } from '../services/SeededRandom';
import { StorageService } from '../services/StorageService';
import { calculateFinalScore } from '../systems/ScoreSystem';
import type { GameResult, GameSession } from '../types/game';

export class ResultScene extends Phaser.Scene {
  private result: GameResult = {
    survivalSeconds: 0,
    killCount: 0,
    level: 1,
    bossKillCount: 0,
    mode: 'normal',
    seed: 'unknown',
  };

  constructor() {
    super('ResultScene');
  }

  init(result: GameResult): void {
    this.result = result;
  }

  create(): void {
    const finalScore = calculateFinalScore(this.result);
    const recordUpdate = new StorageService().updateRecords(this.result, finalScore);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, 72, '긁혔습니다.', {
        color: '#ff5c72',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '68px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        135,
        this.result.mode === 'daily' ? '오늘의 도전' : '일반 플레이',
        {
          color: this.result.mode === 'daily' ? '#d9c4ff' : '#aaa0bb',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '21px',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        275,
        `생존 시간  ${this.formatTime(this.result.survivalSeconds)}\n처치 수     ${this.result.killCount}\n도달 레벨   ${this.result.level}`,
        {
          align: 'center',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          lineSpacing: 18,
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 438, `최종 점수  ${finalScore}`, {
        color: '#fff36b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        485,
        recordUpdate.isNewHighScore
          ? '최고 기록 갱신!'
          : `최고 기록  ${recordUpdate.data.highScore}`,
        {
          color: recordUpdate.isNewHighScore ? '#ff4fd8' : '#aaa0bb',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          fontStyle: recordUpdate.isNewHighScore ? 'bold' : 'normal',
        },
      )
      .setOrigin(0.5);

    if (this.result.mode === 'daily' && recordUpdate.dailyRecord) {
      this.add
        .text(
          GAME_WIDTH / 2,
          520,
          recordUpdate.isNewDailyRecord
            ? '오늘의 최고 기록 갱신!'
            : `오늘의 최고 점수  ${recordUpdate.dailyRecord.score}`,
          {
            color: recordUpdate.isNewDailyRecord ? '#d9c4ff' : '#aaa0bb',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '19px',
            fontStyle: recordUpdate.isNewDailyRecord ? 'bold' : 'normal',
          },
        )
        .setOrigin(0.5);
    }

    this.add
      .text(GAME_WIDTH / 2, 550, `시드 ${this.result.seed}`, {
        color: '#776c83',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '16px',
      })
      .setOrigin(0.5);

    this.createButton(GAME_WIDTH / 2 - 180, 630, '다시 하기', () => {
      this.scene.start('GameScene', { session: this.getSession() });
    });
    this.createButton(GAME_WIDTH / 2 + 180, 630, '메인 화면', () => {
      this.scene.start('MenuScene');
    });

    this.input.keyboard?.once('keydown-ENTER', () => {
      this.scene.start('GameScene', { session: this.getSession() });
    });
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

  private getSession(): GameSession {
    if (this.result.mode === 'normal') {
      return { mode: 'normal', seed: createRandomSeed() };
    }

    return {
      mode: 'daily',
      seed: this.result.seed,
      ...(this.result.dailyDate ? { dailyDate: this.result.dailyDate } : {}),
    };
  }
}
