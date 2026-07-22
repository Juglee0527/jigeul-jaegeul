import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { PlayerStats } from '../types/game';
import { getCombatStatLines } from './statFormatting';

const HUD_DEPTH = 50;

export class Hud {
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly xpBar: Phaser.GameObjects.Rectangle;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly killText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly comboText: Phaser.GameObjects.Text;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly statsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: '#a99eb8',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    };

    scene.add.rectangle(GAME_WIDTH / 2, 43, GAME_WIDTH - 40, 66, 0x0d0913, 0.92)
      .setStrokeStyle(1, 0x463456, 0.85)
      .setDepth(HUD_DEPTH);

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
    scene.add.rectangle(112, 91, GAME_WIDTH - 152, 8, 0x24172d, 0.95)
      .setOrigin(0, 0.5).setDepth(HUD_DEPTH);
    this.xpBar = scene.add.rectangle(112, 91, GAME_WIDTH - 152, 8, COLORS.secondary, 1)
      .setOrigin(0, 0.5).setDepth(HUD_DEPTH + 1);

    scene.add.rectangle(24, 118, 218, 202, 0x0d0913, 0.82)
      .setOrigin(0).setStrokeStyle(1, 0x463456, 0.8).setDepth(HUD_DEPTH - 1);
    scene.add.text(40, 134, 'GROWTH STATS', {
      color: '#ff9bea', fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold', letterSpacing: 1,
    }).setDepth(HUD_DEPTH);
    this.statsText = scene.add.text(40, 164, '', {
      color: '#e9e0ef', fontFamily: 'monospace', fontSize: '15px', lineSpacing: 7,
    }).setDepth(HUD_DEPTH);

    this.comboText = scene.add.text(GAME_WIDTH / 2, 118, '', {
      color: '#fff36b', fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold',
      stroke: '#3a1832', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(HUD_DEPTH + 1).setVisible(false);

    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 28, 360, 38, 0x0d0913, 0.88)
      .setStrokeStyle(1, COLORS.secondary, 0.6).setDepth(HUD_DEPTH);
    this.waveText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, '', {
      color: '#e7d8ff', fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(HUD_DEPTH + 1);
    scene.add.text(28, GAME_HEIGHT - 24, 'WASD / 방향키 이동', {
      color: '#746a80', fontFamily: 'system-ui, sans-serif', fontSize: '14px',
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
    currentCombo: number,
    currentScore: number,
    waveName: string,
    stats: PlayerStats,
  ): void {
    const hpRatio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    const xpRatio = Phaser.Math.Clamp(experience / requiredExperience, 0, 1);
    this.hpBar.displayWidth = 240 * hpRatio;
    this.hpBar.setFillStyle(hpRatio <= 0.3 ? 0xff5c72 : COLORS.primary);
    this.hpText.setText(`${Math.ceil(hp)} / ${Math.round(maxHp)}`);
    this.levelText.setText(`LV.${level}`);
    this.xpBar.displayWidth = (GAME_WIDTH - 152) * xpRatio;
    this.timerText.setText(this.formatTime(survivalSeconds));
    this.killText.setText(`처치  ${killCount}`);
    this.scoreText.setText(currentScore.toLocaleString('ko-KR'));
    this.comboText.setText(`${currentCombo} COMBO`).setVisible(currentCombo >= 2);
    this.waveText.setText(waveName);
    this.statsText.setText(getCombatStatLines(stats));
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
