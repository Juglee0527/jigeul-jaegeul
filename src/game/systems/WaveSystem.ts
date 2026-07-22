import { WAVES } from '../config/waves';
import type { WaveConfig } from '../types/game';

export class WaveSystem {
  getCurrentWave(elapsedSeconds: number): WaveConfig {
    for (let index = WAVES.length - 1; index >= 0; index -= 1) {
      const wave = WAVES[index];
      if (elapsedSeconds >= wave.startTime) {
        return wave;
      }
    }

    return WAVES[0];
  }
}
