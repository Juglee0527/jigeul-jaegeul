import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { createRandomSeed } from '../services/SeededRandom';
import { AudioManager } from '../services/AudioManager';
import { StorageService } from '../services/StorageService';
import { calculateFinalScore } from '../systems/ScoreSystem';
import type { GameDifficulty, GameResult, GameSession } from '../types/game';

const DIFFICULTY_LABELS: Readonly<Record<GameDifficulty, string>> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export class ResultScene extends Phaser.Scene {
  private readonly audio = AudioManager.getInstance();
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private buttonActions: Array<() => void> = [];
  private selectedIndex = 0;
  private result: GameResult = {
    survivalSeconds: 0,
    killCount: 0,
    level: 1,
    bossKillCount: 0,
    mode: 'normal',
    difficulty: 'normal',
    seed: 'unknown',
  };

  constructor() {
    super('ResultScene');
  }

  init(result: GameResult): void {
    this.result = result;
  }

  create(): void {
    this.audio.setMood('result');
    this.buttons = [];
    this.buttonActions = [];
    this.selectedIndex = 0;
    const finalScore = calculateFinalScore(this.result);
    const recordUpdate = new StorageService().updateRecords(this.result, finalScore);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, 72, this.result.victory ? '10분 생존 성공!' : '긁혔습니다.', {
        color: this.result.victory ? '#ffc43d' : '#ff5c72',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '68px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        135,
        `${this.result.mode === 'daily' ? '오늘의 도전' : '일반 플레이'} · ${DIFFICULTY_LABELS[this.result.difficulty]}`,
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
        `생존 시간  ${this.formatTime(this.result.survivalSeconds)}\n처치 수     ${this.result.killCount}\n보스 처치   ${this.result.bossKillCount}\n도달 레벨   ${this.result.level}`,
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
      this.audio.play('confirm');
      this.audio.setMood('game');
      this.scene.start('GameScene', { session: this.getSession() });
    });
    this.createButton(GAME_WIDTH / 2 + 180, 630, '메인 화면', () => {
      this.audio.play('confirm');
      this.audio.setMood('menu');
      this.scene.start('MenuScene');
    });

    this.renderSelection();

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-LEFT', this.selectPrevious, this);
    keyboard?.on('keydown-RIGHT', this.selectNext, this);
    keyboard?.on('keydown-ENTER', this.activateSelection, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-LEFT', this.selectPrevious, this);
      keyboard?.off('keydown-RIGHT', this.selectNext, this);
      keyboard?.off('keydown-ENTER', this.activateSelection, this);
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, 280, 76, COLORS.secondary)
      .setStrokeStyle(2, COLORS.white, 0.8)
      .setInteractive({ useHandCursor: true })
      .setData({ fill: COLORS.secondary });
    const buttonIndex = this.buttons.length;
    this.buttons.push(button);
    this.buttonActions.push(onClick);

    this.add
      .text(x, y, label, {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => this.setSelectedIndex(buttonIndex));
    button.on('pointerout', () => this.renderSelection());
    button.on('pointerdown', () => this.activateIndex(buttonIndex));
  }

  private selectPrevious(): void {
    this.audio.play('navigate');
    this.setSelectedIndex(this.selectedIndex - 1);
  }

  private selectNext(): void {
    this.audio.play('navigate');
    this.setSelectedIndex(this.selectedIndex + 1);
  }

  private setSelectedIndex(index: number): void {
    this.selectedIndex = Phaser.Math.Wrap(index, 0, this.buttons.length);
    this.renderSelection();
  }

  private renderSelection(): void {
    this.buttons.forEach((button, index) => {
      const selected = index === this.selectedIndex;
      button.setFillStyle(selected ? COLORS.primary : button.getData('fill') as number);
      button.setStrokeStyle(selected ? 4 : 2, selected ? COLORS.projectile : COLORS.white, selected ? 1 : 0.8);
      button.setScale(selected ? 1.04 : 1);
    });
  }

  private activateSelection(): void {
    this.activateIndex(this.selectedIndex);
  }

  private activateIndex(index: number): void {
    this.setSelectedIndex(index);
    this.buttonActions[index]?.();
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private getSession(): GameSession {
    if (this.result.mode === 'normal') {
      return {
        mode: 'normal',
        difficulty: this.result.difficulty,
        seed: createRandomSeed(),
      };
    }

    return {
      mode: 'daily',
      difficulty: this.result.difficulty,
      seed: this.result.seed,
      ...(this.result.dailyDate ? { dailyDate: this.result.dailyDate } : {}),
    };
  }
}
