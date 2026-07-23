import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { GameDifficulty, PlayerStats } from '../types/game';
import { getCompactStatLines } from './statFormatting';

const HUD_DEPTH = 50;
const DIFFICULTY_LABELS: Readonly<Record<GameDifficulty, string>> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export class Hud {
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly xpText: Phaser.GameObjects.Text;
  private readonly xpBar: Phaser.GameObjects.Rectangle;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly killText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly statsText: Phaser.GameObjects.Text;
  private currentStats?: PlayerStats;

  constructor(scene: Phaser.Scene, difficulty: GameDifficulty) {
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: '#a99eb8', fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold',
    };

    scene.add.rectangle(GAME_WIDTH / 2, 43, GAME_WIDTH - 40, 66, 0x0d0913, 0.92)
      .setStrokeStyle(1, 0x463456, 0.85).setDepth(HUD_DEPTH);
    scene.add.text(40, 24, 'MENTAL', labelStyle).setDepth(HUD_DEPTH + 1);
    scene.add.rectangle(40, 50, 240, 12, 0x2c1c32, 1).setOrigin(0, 0.5).setDepth(HUD_DEPTH + 1);
    this.hpBar = scene.add.rectangle(40, 50, 240, 12, COLORS.primary, 1)
      .setOrigin(0, 0.5).setDepth(HUD_DEPTH + 2);
    this.hpText = scene.add.text(290, 42, '', { ...labelStyle, color: '#f9ecff', fontSize: '15px' })
      .setDepth(HUD_DEPTH + 1);

    this.timerText = scene.add.text(GAME_WIDTH / 2, 18, '', {
      color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: '34px', fontStyle: 'bold', letterSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(HUD_DEPTH + 1);
    this.killText = scene.add.text(GAME_WIDTH - 318, 21, '', labelStyle).setOrigin(1, 0).setDepth(HUD_DEPTH + 1);
    this.scoreText = scene.add.text(GAME_WIDTH - 40, 19, '', {
      ...labelStyle, color: '#fff36b', fontSize: '20px',
    }).setOrigin(1, 0).setDepth(HUD_DEPTH + 1);

    this.levelText = scene.add.text(40, 80, '', {
      color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold',
    }).setDepth(HUD_DEPTH + 1);
    this.xpText = scene.add.text(GAME_WIDTH - 40, 78, '', {
      color: '#d8c9ff', fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(HUD_DEPTH + 2);
    scene.add.rectangle(112, 91, GAME_WIDTH - 152, 8, 0x24172d, 0.95)
      .setOrigin(0, 0.5).setDepth(HUD_DEPTH);
    this.xpBar = scene.add.rectangle(112, 91, GAME_WIDTH - 152, 8, COLORS.secondary, 1)
      .setOrigin(0, 0.5).setDepth(HUD_DEPTH + 1);

    scene.add.rectangle(24, 118, 230, 76, 0x0d0913, 0.86)
      .setOrigin(0).setStrokeStyle(1, 0x463456, 0.8).setDepth(HUD_DEPTH - 1);
    scene.add.text(40, 130, '주요 능력치', {
      color: '#ff9bea', fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold', letterSpacing: 1,
    }).setDepth(HUD_DEPTH);
    this.statsText = scene.add.text(40, 153, '', {
      color: '#e9e0ef', fontFamily: 'monospace', fontSize: '13px', lineSpacing: 2,
    }).setDepth(HUD_DEPTH);

    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 28, 360, 38, 0x0d0913, 0.88)
      .setStrokeStyle(1, COLORS.secondary, 0.6).setDepth(HUD_DEPTH);
    this.waveText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, '', {
      color: '#e7d8ff', fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(HUD_DEPTH + 1);
    scene.add.text(28, GAME_HEIGHT - 24, 'WASD / 방향키 이동', {
      color: '#746a80', fontFamily: 'system-ui, sans-serif', fontSize: '14px',
    }).setOrigin(0, 0.5).setDepth(HUD_DEPTH + 1);
    scene.add.text(230, GAME_HEIGHT - 24, `난이도  ${DIFFICULTY_LABELS[difficulty]}`, {
      color: difficulty === 'easy' ? '#6dff8b' : difficulty === 'hard' ? '#ff6f91' : '#fff36b',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      backgroundColor: '#171022',
      padding: { x: 9, y: 4 },
    }).setOrigin(0, 0.5).setDepth(HUD_DEPTH + 1);
    scene.add.text(GAME_WIDTH - 28, GAME_HEIGHT - 24, 'ESC 일시정지', {
      color: '#746a80', fontFamily: 'system-ui, sans-serif', fontSize: '14px',
    }).setOrigin(1, 0.5).setDepth(HUD_DEPTH + 1);
  }

  update(
    hp: number,
    maxHp: number,
    level: number,
    experience: number,
    requiredExperience: number,
    survivalSeconds: number,
    killCount: number,
    currentScore: number,
    waveName: string,
    stats: PlayerStats,
  ): void {
    this.currentStats = stats;
    const hpRatio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    const xpRatio = Phaser.Math.Clamp(experience / requiredExperience, 0, 1);
    this.hpBar.displayWidth = 240 * hpRatio;
    this.hpBar.setFillStyle(hpRatio <= 0.3 ? 0xff5c72 : COLORS.primary);
    this.hpText.setText(`${Math.ceil(hp)} / ${Math.round(maxHp)}`);
    this.levelText.setText(`LV.${level}`);
    this.xpText.setText(`EXP ${experience} / ${requiredExperience}  (${Math.floor(xpRatio * 100)}%)`);
    this.xpBar.displayWidth = (GAME_WIDTH - 152) * xpRatio;
    this.timerText.setText(this.formatTime(survivalSeconds));
    this.killText.setText(`처치  ${killCount}`);
    this.scoreText.setText(currentScore.toLocaleString('ko-KR'));
    this.waveText.setText(waveName);
    this.refreshStatsText();
  }

  private refreshStatsText(): void {
    if (!this.currentStats) {
      return;
    }
    this.statsText.setText(getCompactStatLines(this.currentStats));
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
