import Phaser from 'phaser';

import { gameConfig } from './game/config/gameConfig';
import './styles/global.css';

const game = new Phaser.Game(gameConfig);

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});
