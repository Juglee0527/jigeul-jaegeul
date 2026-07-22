import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { UpgradeDefinition, UpgradeRarity } from '../types/game';
import type { GameScene } from './GameScene';

interface UpgradeSceneData {
  choices: UpgradeDefinition[];
  levels: Record<string, number>;
}

const RARITY_LABELS: Record<UpgradeRarity, string> = {
  common: '일반',
  rare: '희귀',
  legendary: '전설',
};

const RARITY_COLORS: Record<UpgradeRarity, number> = {
  common: 0x75657f,
  rare: 0x8f5bff,
  legendary: 0xffb13b,
};

export class UpgradeScene extends Phaser.Scene {
  private choices: UpgradeDefinition[] = [];
  private levels: Record<string, number> = {};
  private selected = false;

  constructor() {
    super('UpgradeScene');
  }

  init(data: UpgradeSceneData): void {
    this.choices = data.choices;
    this.levels = data.levels;
    this.selected = false;
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050308, 0.92);
    this.add.circle(GAME_WIDTH / 2, 120, 310, COLORS.primary, 0.06);

    this.add.text(GAME_WIDTH / 2, 58, 'LEVEL UP', {
      color: '#ff9bea',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 86, '하나를 선택하세요', {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 139, '숫자 키 1–3으로도 선택할 수 있습니다', {
      color: '#8f829b',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
    }).setOrigin(0.5);

    const spacing = 370;
    const startX = GAME_WIDTH / 2 - ((this.choices.length - 1) * spacing) / 2;
    this.choices.forEach((upgrade, index) => {
      this.createCard(startX + index * spacing, 390, upgrade, index);
      this.input.keyboard?.once(`keydown-${index + 1}`, () => this.selectUpgrade(upgrade.id));
    });
  }

  private createCard(x: number, y: number, upgrade: UpgradeDefinition, index: number): void {
    const currentLevel = this.levels[upgrade.id] ?? 0;
    const accent = RARITY_COLORS[upgrade.rarity];
    const card = this.add.rectangle(x, y, 332, 396, 0x15101d, 0.98)
      .setStrokeStyle(2, accent, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y - 190, 332, 7, accent, 1);

    this.add.text(x - 136, y - 158, `0${index + 1}`, {
      color: '#776a82',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    });
    this.add.text(x + 136, y - 158, RARITY_LABELS[upgrade.rarity], {
      color: Phaser.Display.Color.IntegerToColor(accent).rgba,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.add.text(x, y - 90, upgrade.name, {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '31px',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 280 },
    }).setOrigin(0.5);
    this.add.text(x, y - 26, `LV.${currentLevel}  →  LV.${currentLevel + 1}`, {
      color: '#b7a9c2',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
    }).setOrigin(0.5);
    this.add.rectangle(x, y + 17, 276, 1, 0x3f3348, 1);
    this.add.text(x, y + 76, upgrade.description, {
      align: 'center',
      color: '#e9e0ef',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '21px',
      lineSpacing: 8,
      wordWrap: { width: 270 },
    }).setOrigin(0.5);
    this.add.text(x, y + 154, '선택', {
      color: '#8f829b',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    card.on('pointerover', () => {
      card.setFillStyle(0x24182c);
      card.setScale(1.025);
    });
    card.on('pointerout', () => {
      card.setFillStyle(0x15101d);
      card.setScale(1);
    });
    card.on('pointerdown', () => this.selectUpgrade(upgrade.id));
  }

  private selectUpgrade(id: string): void {
    if (this.selected) {
      return;
    }
    this.selected = true;

    const gameScene = this.scene.get('GameScene') as GameScene;
    gameScene.applyUpgrade(id);
    this.scene.resume('GameScene');
    this.scene.stop();
  }
}
