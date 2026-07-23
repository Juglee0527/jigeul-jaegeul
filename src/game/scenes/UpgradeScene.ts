import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { AudioManager } from '../services/AudioManager';
import type { PlayerStats, UpgradeDefinition, UpgradeRarity } from '../types/game';
import { formatUpgradeChanges } from '../ui/statFormatting';
import type { GameScene } from './GameScene';

interface UpgradeSceneData {
  choices: UpgradeDefinition[];
  levels: Record<string, number>;
  stats: PlayerStats;
}

const RARITY_LABELS: Record<UpgradeRarity, string> = {
  epic: '에픽',
  common: '일반',
  rare: '희귀',
  legendary: '전설',
};

const RARITY_COLORS: Record<UpgradeRarity, number> = {
  epic: 0xc45cff,
  common: 0x75657f,
  rare: 0x8f5bff,
  legendary: 0xffb13b,
};

export class UpgradeScene extends Phaser.Scene {
  private readonly audio = AudioManager.getInstance();
  private choices: UpgradeDefinition[] = [];
  private levels: Record<string, number> = {};
  private stats!: PlayerStats;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private cardFooters: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private selected = false;

  constructor() {
    super('UpgradeScene');
  }

  init(data: UpgradeSceneData): void {
    this.choices = data.choices;
    this.levels = data.levels;
    this.stats = data.stats;
    this.cards = [];
    this.cardFooters = [];
    this.selectedIndex = 0;
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
    this.add.text(GAME_WIDTH / 2, 139, '←  →  방향키로 고르고   ENTER로 선택', {
      color: '#a99bb5',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const spacing = 370;
    const startX = GAME_WIDTH / 2 - ((this.choices.length - 1) * spacing) / 2;
    this.choices.forEach((upgrade, index) => {
      this.createCard(startX + index * spacing, 390, upgrade, index);
    });
    this.renderSelection();

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-LEFT', this.selectPrevious, this);
    keyboard?.on('keydown-RIGHT', this.selectNext, this);
    keyboard?.on('keydown-ENTER', this.confirmSelection, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-LEFT', this.selectPrevious, this);
      keyboard?.off('keydown-RIGHT', this.selectNext, this);
      keyboard?.off('keydown-ENTER', this.confirmSelection, this);
    });
  }

  private createCard(x: number, y: number, upgrade: UpgradeDefinition, index: number): void {
    const currentLevel = this.levels[upgrade.id] ?? 0;
    const accent = RARITY_COLORS[upgrade.rarity];
    if (upgrade.rarity === 'epic' || upgrade.rarity === 'legendary') {
      const glow = this.add.rectangle(x, y, 350, 414, accent, upgrade.rarity === 'legendary' ? 0.14 : 0.08);
      this.tweens.add({
        targets: glow,
        alpha: 0.02,
        scale: 1.04,
        duration: upgrade.rarity === 'legendary' ? 650 : 950,
        yoyo: true,
        repeat: -1,
      });
    }
    const card = this.add.rectangle(x, y, 332, 396, 0x15101d, 0.98)
      .setStrokeStyle(2, accent, 0.55)
      .setInteractive({ useHandCursor: true })
      .setData('accent', accent);
    this.cards.push(card);
    this.add.rectangle(x, y - 190, 332, 7, accent, 1);

    this.add.text(x - 136, y - 158, `CHOICE 0${index + 1}`, {
      color: '#776a82',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
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
    this.add.text(x, y + 48, upgrade.description, {
      align: 'center',
      color: '#a99bb5',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      wordWrap: { width: 270 },
    }).setOrigin(0.5);
    this.add.text(x, y + 98, formatUpgradeChanges(upgrade, this.stats), {
      align: 'center',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      lineSpacing: 6,
      wordWrap: { width: 300 },
    }).setOrigin(0.5);
    const footer = this.add.text(x, y + 154, '', {
      color: '#fff36b',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.cardFooters.push(footer);

    card.on('pointerover', () => this.setSelectedIndex(index));
    card.on('pointerdown', () => {
      this.setSelectedIndex(index);
      this.confirmSelection();
    });
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
    if (this.selected || this.choices.length === 0) {
      return;
    }
    this.selectedIndex = Phaser.Math.Wrap(index, 0, this.choices.length);
    this.renderSelection();
  }

  private renderSelection(): void {
    this.cards.forEach((card, index) => {
      const isFocused = index === this.selectedIndex;
      const accent = card.getData('accent') as number;
      card.setFillStyle(isFocused ? 0x2b1a33 : 0x15101d);
      card.setStrokeStyle(isFocused ? 4 : 2, accent, isFocused ? 1 : 0.55);
      card.setScale(isFocused ? 1.035 : 1);
      this.cardFooters[index]?.setText(isFocused ? '●  ENTER로 선택' : '');
    });
  }

  private confirmSelection(): void {
    const upgrade = this.choices[this.selectedIndex];
    if (upgrade) {
      this.selectUpgrade(upgrade.id);
    }
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
