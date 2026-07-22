import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 42, '지긁재긁', {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '72px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 42, '긁히면 진다.', {
        color: '#ff4fd8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
      })
      .setOrigin(0.5);
  }
}
