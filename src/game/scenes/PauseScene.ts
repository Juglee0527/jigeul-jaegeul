import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { AudioManager } from '../services/AudioManager';
import { getCombatStatLines } from '../ui/statFormatting';
import type { GameScene } from './GameScene';

export class PauseScene extends Phaser.Scene {
  private readonly audio = AudioManager.getInstance();
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private actions: Array<() => void> = [];
  private selectedIndex = 0;
  constructor() {
    super('PauseScene');
  }

  create(): void {
    this.audio.setMood('paused');
    this.buttons = [];
    this.actions = [];
    this.selectedIndex = 0;
    const gameScene = this.scene.get('GameScene') as GameScene;
    const stats = gameScene.getPlayerStats();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050308, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 980, 550, COLORS.panel, 0.98)
      .setStrokeStyle(3, COLORS.primary, 0.85);

    this.add.text(370, 128, '현재 성장 능력치', {
      color: '#ff9bea', fontFamily: 'system-ui, sans-serif', fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.rectangle(370, 365, 380, 410, 0x0d0913, 0.9)
      .setStrokeStyle(1, 0x5d436c, 0.9);
    this.add.text(220, 180, getCombatStatLines(stats), {
      color: '#ffffff', fontFamily: 'monospace', fontSize: '20px', lineSpacing: 10,
    });

    this.add.text(860, 150, '잠시 멈춤', {
      color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: '48px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(860, 204, '성장 상태를 확인해 보세요', {
      color: '#a99bb5', fontFamily: 'system-ui, sans-serif', fontSize: '19px',
    }).setOrigin(0.5);

    this.createButton(860, 305, '계속하기', () => this.resumeGame());
    this.createButton(860, 400, '다시 시작', () => this.restartGame());
    this.createButton(860, 495, '메인 화면', () => this.returnToMenu());
    this.renderSelection();

    this.add.text(860, 555, '↑ ↓ 메뉴 선택  ·  ENTER 확인  ·  ESC 계속하기', {
      color: '#8f8399', fontFamily: 'system-ui, sans-serif', fontSize: '15px',
    }).setOrigin(0.5);

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-UP', this.selectPrevious, this);
    keyboard?.on('keydown-DOWN', this.selectNext, this);
    keyboard?.on('keydown-ENTER', this.activateSelection, this);
    keyboard?.once('keydown-ESC', this.resumeGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-UP', this.selectPrevious, this);
      keyboard?.off('keydown-DOWN', this.selectNext, this);
      keyboard?.off('keydown-ENTER', this.activateSelection, this);
      keyboard?.off('keydown-ESC', this.resumeGame, this);
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 330, 68, COLORS.secondary)
      .setStrokeStyle(2, COLORS.white, 0.7)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const index = this.buttons.length;
    this.buttons.push(button);
    this.actions.push(onClick);
    button.on('pointerover', () => {
      this.selectedIndex = index;
      this.renderSelection();
    });
    button.on('pointerdown', onClick);
  }

  private selectPrevious(): void {
    this.audio.play('navigate');
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, this.buttons.length);
    this.renderSelection();
  }

  private selectNext(): void {
    this.audio.play('navigate');
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, this.buttons.length);
    this.renderSelection();
  }

  private activateSelection(): void {
    this.actions[this.selectedIndex]?.();
  }

  private renderSelection(): void {
    this.buttons.forEach((button, index) => {
      const selected = index === this.selectedIndex;
      button.setFillStyle(selected ? COLORS.primary : COLORS.secondary);
      button.setStrokeStyle(selected ? 4 : 2, COLORS.white, selected ? 1 : 0.7);
      button.setScale(selected ? 1.035 : 1);
    });
  }

  private resumeGame(): void {
    const gameScene = this.scene.get('GameScene') as GameScene;
    gameScene.grantResumeProtection();
    this.audio.play('confirm');
    this.audio.setMood('game');
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  private restartGame(): void {
    const gameScene = this.scene.get('GameScene') as GameScene;
    const session = gameScene.createRestartSession();
    this.audio.play('confirm');
    this.audio.setMood('game');
    this.scene.stop('GameScene');
    this.scene.start('GameScene', { session });
  }

  private returnToMenu(): void {
    this.audio.play('confirm');
    this.audio.setMood('menu');
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }
}
