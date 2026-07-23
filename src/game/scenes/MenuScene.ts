import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { createRandomSeed, getLocalDateSeed } from '../services/SeededRandom';
import { AudioManager } from '../services/AudioManager';
import { StorageService } from '../services/StorageService';
import type { GameDifficulty, GameSession } from '../types/game';

const DIFFICULTY_LABELS: Readonly<Record<GameDifficulty, string>> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

const DIFFICULTIES: readonly GameDifficulty[] = ['easy', 'normal', 'hard'];
const DIFFICULTY_COLORS: Readonly<Record<GameDifficulty, { dim: string; bright: string; stroke: number }>> = {
  easy: { dim: '#74c991', bright: '#6dff8b', stroke: 0x6dff8b },
  normal: { dim: '#d6c76e', bright: '#fff36b', stroke: 0xfff36b },
  hard: { dim: '#d96a77', bright: '#ff334f', stroke: 0xff334f },
};

export class MenuScene extends Phaser.Scene {
  private readonly audio = AudioManager.getInstance();
  private menuCards: Phaser.GameObjects.Rectangle[] = [];
  private menuActions: Array<() => void> = [];
  private selectedIndex = 0;
  private selectedDifficulty: GameDifficulty = 'normal';
  private difficultyButtons: Phaser.GameObjects.Rectangle[] = [];
  private difficultyTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.audio.setMood('menu');
    this.menuCards = [];
    this.menuActions = [];
    this.selectedIndex = 0;
    this.selectedDifficulty = 'normal';
    this.difficultyButtons = [];
    this.difficultyTexts = [];
    const records = new StorageService().load();
    const today = getLocalDateSeed();
    const todayRecord = records.dailyRecords[today];

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.grid(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 64, 64, 0x090611, 1, 0x392047, 0.18);
    this.add.circle(1120, 86, 260, COLORS.secondary, 0.07);
    this.add.circle(105, 680, 230, COLORS.primary, 0.05);

    this.add.text(68, 58, '10분 보스 생존 로그라이크', {
      color: '#ff9bea',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      backgroundColor: '#30152c',
      padding: { x: 12, y: 7 },
    });
    this.add.text(64, 112, '지긁재긁', {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '82px',
      fontStyle: 'bold',
      stroke: '#4b1742',
      strokeThickness: 8,
    });
    this.add.text(70, 218, '긁?\n총으로 다 쏴버릴라', {
      color: '#cfc4dc',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '25px',
      lineSpacing: 9,
    });

    this.createModeCard(700, 98, '일반 생존', '3단계 보스와 매 판 새로운 능력 조합', 'PLAY', true, () => {
      this.startGame({ mode: 'normal', difficulty: this.selectedDifficulty, seed: createRandomSeed() });
    });
    this.createModeCard(700, 272, '오늘의 도전', `${today} · 똑같은 패턴`, 'DAILY', false, () => {
      this.startGame({ mode: 'daily', difficulty: this.selectedDifficulty, seed: today, dailyDate: today });
    }, todayRecord ? `오늘 최고  ${todayRecord.score.toLocaleString('ko-KR')}` : '첫 기록을 남겨보세요');

    this.createSmallButton(700, 462, '게임 방법  →', () => {
      this.audio.setMood('paused');
      this.scene.launch('HelpScene');
      this.scene.pause();
    });
    this.createDifficultySelector();
    this.renderSelection();

    this.add.text(68, 386, 'MY RECORD', {
      color: '#8f7ca3',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this.createStat(68, 422, '최고 점수', records.highScore.toLocaleString('ko-KR'));
    this.createStat(270, 422, '최장 생존', this.formatTime(records.longestSurvivalSeconds));
    this.createStat(68, 515, '최대 처치', records.maxKills.toString());
    this.createStat(270, 515, '클리어 목표', '최종 보스 격파');

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '↑ ↓ 메뉴 선택  ·  ← → 난이도  ·  ENTER 선택', {
      color: '#6f6578',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
    }).setOrigin(0.5);

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-UP', this.selectPrevious, this);
    keyboard?.on('keydown-DOWN', this.selectNext, this);
    keyboard?.on('keydown-ENTER', this.activateSelection, this);
    keyboard?.on('keydown-LEFT', this.selectPreviousDifficulty, this);
    keyboard?.on('keydown-RIGHT', this.selectNextDifficulty, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-UP', this.selectPrevious, this);
      keyboard?.off('keydown-DOWN', this.selectNext, this);
      keyboard?.off('keydown-ENTER', this.activateSelection, this);
      keyboard?.off('keydown-LEFT', this.selectPreviousDifficulty, this);
      keyboard?.off('keydown-RIGHT', this.selectNextDifficulty, this);
    });
  }

  private createModeCard(
    x: number,
    y: number,
    title: string,
    description: string,
    badge: string,
    primary: boolean,
    onClick: () => void,
    meta?: string,
  ): void {
    const width = 510;
    const height = 148;
    const fill = primary ? 0x25112b : 0x15101d;
    const stroke = primary ? COLORS.primary : 0x604579;
    const card = this.add.rectangle(x, y, width, height, fill, 0.97)
      .setOrigin(0)
      .setStrokeStyle(primary ? 2 : 1, stroke, 0.9)
      .setInteractive({ useHandCursor: true })
      .setData({ fill, stroke, strokeWidth: primary ? 2 : 1 });
    const menuIndex = this.menuCards.length;
    this.menuCards.push(card);
    this.menuActions.push(onClick);

    this.add.text(x + 28, y + 24, badge, {
      color: primary ? '#ff9bea' : '#aa90d4',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    });
    this.add.text(x + 28, y + 52, title, {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
    });
    this.add.text(x + 28, y + 98, description, {
      color: '#a99eb8',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
    });
    this.add.text(x + width - 30, y + 62, '→', {
      color: primary ? '#fff36b' : '#bda8d8',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);
    if (meta) {
      this.add.text(x + width - 28, y + 112, meta, {
        color: '#7f708e',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
      }).setOrigin(1, 0);
    }

    card.on('pointerover', () => this.setSelectedIndex(menuIndex));
    card.on('pointerout', () => this.renderSelection());
    card.on('pointerdown', () => this.activateIndex(menuIndex));
  }

  private createSmallButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 510, 64, 0x0f0b15, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x44334f, 1)
      .setInteractive({ useHandCursor: true })
      .setData({ fill: 0x0f0b15, stroke: 0x44334f, strokeWidth: 1 });
    const menuIndex = this.menuCards.length;
    this.menuCards.push(button);
    this.menuActions.push(onClick);
    this.add.text(x + 26, y + 20, label, {
      color: '#d8cce2',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
    });
    button.on('pointerover', () => this.setSelectedIndex(menuIndex));
    button.on('pointerout', () => this.renderSelection());
    button.on('pointerdown', () => this.activateIndex(menuIndex));
  }

  private createDifficultySelector(): void {
    this.add.text(700, 544, '난이도 선택', {
      color: '#8f7ca3',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 1,
    });

    DIFFICULTIES.forEach((difficulty, index) => {
      const x = 700 + index * 170;
      const button = this.add.rectangle(x, 572, 158, 54, 0x15101d, 0.98)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      this.difficultyButtons.push(button);
      const label = this.add.text(x + 79, 599, DIFFICULTY_LABELS[difficulty], {
        color: DIFFICULTY_COLORS[difficulty].dim,
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.difficultyTexts.push(label);
      button.on('pointerdown', () => this.setDifficulty(difficulty));
      button.on('pointerover', () => {
        if (this.selectedDifficulty !== difficulty) {
          button.setFillStyle(0x291b35);
        }
      });
      button.on('pointerout', () => this.renderDifficulty());
    });
    this.renderDifficulty();
  }

  private selectPreviousDifficulty(): void {
    this.audio.play('navigate');
    const index = DIFFICULTIES.indexOf(this.selectedDifficulty);
    this.setDifficulty(DIFFICULTIES[Phaser.Math.Wrap(index - 1, 0, DIFFICULTIES.length)]);
  }

  private selectNextDifficulty(): void {
    this.audio.play('navigate');
    const index = DIFFICULTIES.indexOf(this.selectedDifficulty);
    this.setDifficulty(DIFFICULTIES[Phaser.Math.Wrap(index + 1, 0, DIFFICULTIES.length)]);
  }

  private setDifficulty(difficulty: GameDifficulty): void {
    this.selectedDifficulty = difficulty;
    this.audio.unlock();
    this.audio.play('confirm');
    this.renderDifficulty();
  }

  private renderDifficulty(): void {
    this.difficultyButtons.forEach((button, index) => {
      const selected = DIFFICULTIES[index] === this.selectedDifficulty;
      const difficulty = DIFFICULTIES[index];
      const colors = DIFFICULTY_COLORS[difficulty];
      button.setFillStyle(selected ? 0x4a204f : 0x15101d);
      button.setStrokeStyle(selected ? 3 : 1, selected ? colors.stroke : 0x604579, selected ? 1 : 0.75);
      button.setScale(selected ? 1.025 : 1);
      this.difficultyTexts[index]?.setColor(selected ? colors.bright : colors.dim);
      this.difficultyTexts[index]?.setStroke(
        selected && difficulty === 'hard' ? '#5c0715' : '#000000',
        selected && difficulty === 'hard' ? 4 : 0,
      );
    });
  }

  private selectPrevious(): void {
    this.audio.unlock();
    this.audio.play('navigate');
    this.setSelectedIndex(this.selectedIndex - 1);
  }

  private selectNext(): void {
    this.audio.unlock();
    this.audio.play('navigate');
    this.setSelectedIndex(this.selectedIndex + 1);
  }

  private setSelectedIndex(index: number): void {
    this.selectedIndex = Phaser.Math.Wrap(index, 0, this.menuCards.length);
    this.renderSelection();
  }

  private renderSelection(): void {
    this.menuCards.forEach((card, index) => {
      const selected = index === this.selectedIndex;
      card.setFillStyle(selected ? 0x3c173f : card.getData('fill') as number);
      card.setStrokeStyle(
        selected ? 4 : card.getData('strokeWidth') as number,
        selected ? COLORS.projectile : card.getData('stroke') as number,
        selected ? 1 : 0.9,
      );
      card.setScale(selected ? 1.015 : 1);
    });
  }

  private activateSelection(): void {
    this.activateIndex(this.selectedIndex);
  }

  private activateIndex(index: number): void {
    this.setSelectedIndex(index);
    this.audio.unlock();
    this.audio.play('confirm');
    this.menuActions[index]?.();
  }

  private createStat(x: number, y: number, label: string, value: string): void {
    this.add.text(x, y, label, {
      color: '#7f7489',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
    });
    this.add.text(x, y + 24, value, {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
    });
  }

  private startGame(session: GameSession): void {
    this.audio.setMood('game');
    this.scene.start('GameScene', { session });
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
