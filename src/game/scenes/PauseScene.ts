import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { AudioManager } from '../services/AudioManager';
import type { UpgradeRarity } from '../types/game';
import { getCombatStatLines } from '../ui/statFormatting';
import type { GameScene } from './GameScene';

const RARITY_COLORS: Readonly<Record<UpgradeRarity, number>> = {
  common: 0xc6bfcb,
  rare: 0x59c7ff,
  epic: 0xc783ff,
  legendary: 0xffc43d,
};

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
    const acquired = gameScene.getAcquiredUpgrades();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050308, 0.9);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1180, 600, COLORS.panel, 0.98)
      .setStrokeStyle(3, COLORS.primary, 0.85);

    this.createSection(235, 370, 340, 500, '현재 성장 능력치');
    this.add.text(90, 155, getCombatStatLines(stats), {
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: '17px',
      lineSpacing: 9,
    });

    this.createSection(640, 370, 430, 500, `선택한 능력  ${acquired.length}개`);
    if (acquired.length === 0) {
      this.add.text(640, 360, '아직 선택한 능력이 없습니다.', {
        color: '#a99bb5',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
      }).setOrigin(0.5);
    } else {
      const visible = acquired.slice(0, 22);
      visible.forEach(({ upgrade, level }, index) => {
        const column = Math.floor(index / 11);
        const row = index % 11;
        const x = 535 + column * 210;
        const y = 168 + row * 36;
        const color = RARITY_COLORS[upgrade.rarity];
        this.add.rectangle(x, y, 195, 29, 0x100b18, 0.94)
          .setStrokeStyle(1, color, 0.75);
        this.add.text(x - 88, y, upgrade.name, {
          color: Phaser.Display.Color.IntegerToColor(color).rgba,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
        }).setOrigin(0, 0.5);
        this.add.text(x + 86, y, level >= upgrade.maxLevel ? 'MAX' : `LV.${level}`, {
          color: level >= upgrade.maxLevel ? '#fff19b' : '#ffffff',
          fontFamily: 'monospace',
          fontSize: '13px',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5);
      });
      if (acquired.length > visible.length) {
        this.add.text(640, 578, `외 ${acquired.length - visible.length}개`, {
          color: '#a99bb5',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
        }).setOrigin(0.5);
      }
    }

    this.add.text(1035, 140, '일시 정지', {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '40px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(1035, 188, '빌드를 확인하고 정비하세요', {
      color: '#a99bb5',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
    }).setOrigin(0.5);

    this.createButton(1035, 285, '계속하기', () => this.resumeGame());
    this.createButton(1035, 375, '다시 시작', () => this.restartGame());
    this.createButton(1035, 465, '메인 화면', () => this.returnToMenu());
    this.renderSelection();

    this.add.text(1035, 555, '↑↓ 선택  ·  ENTER 확인\nESC 계속하기', {
      align: 'center',
      color: '#8f8399',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      lineSpacing: 5,
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

  private createSection(x: number, y: number, width: number, height: number, title: string): void {
    this.add.rectangle(x, y, width, height, 0x0d0913, 0.9)
      .setStrokeStyle(1, 0x5d436c, 0.9);
    this.add.text(x, y - height / 2 - 28, title, {
      color: '#ff9bea',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '21px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 235, 62, COLORS.secondary)
      .setStrokeStyle(2, COLORS.white, 0.7)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '23px',
      fontStyle: 'bold',
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
