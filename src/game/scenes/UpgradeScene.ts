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
  common: 0x655673,
  rare: 0x4d4bc4,
  legendary: 0xb56912,
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
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050308, 0.88);

    this.add
      .text(GAME_WIDTH / 2, 92, '레벨 업!', {
        color: '#ff4fd8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '58px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 148, '능력 하나를 선택하세요', {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
      })
      .setOrigin(0.5);

    const spacing = 370;
    const startX = GAME_WIDTH / 2 - ((this.choices.length - 1) * spacing) / 2;
    this.choices.forEach((upgrade, index) => {
      this.createCard(startX + index * spacing, 390, upgrade, index);
      this.input.keyboard?.once(`keydown-${index + 1}`, () => this.selectUpgrade(upgrade.id));
    });
  }

  private createCard(x: number, y: number, upgrade: UpgradeDefinition, index: number): void {
    const currentLevel = this.levels[upgrade.id] ?? 0;
    const card = this.add
      .rectangle(x, y, 330, 360, RARITY_COLORS[upgrade.rarity], 0.96)
      .setStrokeStyle(3, COLORS.white, 0.75)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y - 126, `${index + 1}`, {
        color: '#d9d1e4',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5);

    this.add
      .text(x, y - 72, upgrade.name, {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(x, y - 18, `${RARITY_LABELS[upgrade.rarity]} · Lv.${currentLevel} → ${currentLevel + 1}`, {
        color: '#f5d7ff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
      })
      .setOrigin(0.5);

    this.add
      .text(x, y + 66, upgrade.description, {
        align: 'center',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        wordWrap: { width: 270 },
      })
      .setOrigin(0.5);

    card.on('pointerover', () => card.setScale(1.04));
    card.on('pointerout', () => card.setScale(1));
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
