import Phaser from 'phaser';

import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { MenuScene } from '../scenes/MenuScene';
import { ResultScene } from '../scenes/ResultScene';
import { UpgradeScene } from '../scenes/UpgradeScene';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './constants';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  scene: [BootScene, MenuScene, GameScene, UpgradeScene, ResultScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};
