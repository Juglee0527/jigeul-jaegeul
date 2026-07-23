import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { createRandomSeed, getLocalDateSeed } from '../services/SeededRandom';
import { AudioManager } from '../services/AudioManager';
import { StorageService } from '../services/StorageService';
import type { GameSession } from '../types/game';

export class MenuScene extends Phaser.Scene {
  private readonly audio = AudioManager.getInstance();
  private menuCards: Phaser.GameObjects.Rectangle[] = [];
  private menuActions: Array<() => void> = [];
  private selectedIndex = 0;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.audio.setMood('menu');
    this.menuCards = [];
    this.menuActions = [];
    this.selectedIndex = 0;
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

    this.createModeCard(700, 98, '일반 생존', '매 판 새로운 적과 능력 조합', 'PLAY', true, () => {
      this.startGame({ mode: 'normal', seed: createRandomSeed() });
    });
    this.createModeCard(700, 272, '오늘의 도전', `${today} · 모두 같은 운명`, 'DAILY', false, () => {
      this.startGame({ mode: 'daily', seed: today, dailyDate: today });
    }, todayRecord ? `오늘 최고  ${todayRecord.score.toLocaleString('ko-KR')}` : '첫 기록을 남겨보세요');

    this.createSmallButton(700, 462, '게임 방법  →', () => {
      this.audio.setMood('paused');
      this.scene.launch('HelpScene');
      this.scene.pause();
    });
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

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, '↑ ↓ 메뉴 선택  ·  ENTER 확인  ·  WASD / 방향키 이동', {
      color: '#6f6578',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
    }).setOrigin(0.5);

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-UP', this.selectPrevious, this);
    keyboard?.on('keydown-DOWN', this.selectNext, this);
    keyboard?.on('keydown-ENTER', this.activateSelection, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-UP', this.selectPrevious, this);
      keyboard?.off('keydown-DOWN', this.selectNext, this);
      keyboard?.off('keydown-ENTER', this.activateSelection, this);
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
