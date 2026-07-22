import Phaser from 'phaser';

import { COLORS, GAME_WIDTH } from '../config/constants';

export class Hud {
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly killText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
    };

    scene.add.rectangle(GAME_WIDTH / 2, 32, GAME_WIDTH, 64, COLORS.panel, 0.92).setDepth(50);
    this.hpText = scene.add.text(28, 18, '', textStyle).setDepth(51);
    this.timerText = scene.add.text(GAME_WIDTH / 2, 18, '', textStyle).setOrigin(0.5, 0).setDepth(51);
    this.killText = scene.add.text(GAME_WIDTH - 28, 18, '', textStyle).setOrigin(1, 0).setDepth(51);

    scene.add
      .text(24, 680, '이동: WASD / 방향키', {
        color: '#aaa0bb',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
      })
      .setDepth(51);
  }

  update(hp: number, maxHp: number, survivalSeconds: number, killCount: number): void {
    this.hpText.setText(`멘탈 ${hp} / ${maxHp}`);
    this.timerText.setText(this.formatTime(survivalSeconds));
    this.killText.setText(`처치 ${killCount}`);
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
