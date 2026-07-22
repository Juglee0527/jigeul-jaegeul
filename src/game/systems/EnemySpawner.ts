import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { getEnemyDefinition } from '../config/enemies';
import { Enemy } from '../entities/Enemy';
import type { RandomSource } from '../services/SeededRandom';
import type { EnemyWeight, WaveConfig } from '../types/game';

export class EnemySpawner {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly group: Phaser.Physics.Arcade.Group,
    private readonly random: RandomSource,
  ) {}

  spawn(wave: WaveConfig): void {
    const availableSlots = wave.maxEnemies - this.group.countActive(true);
    const spawnCount = Math.min(wave.spawnCount, Math.max(0, availableSlots));

    for (let index = 0; index < spawnCount; index += 1) {
      const definition = getEnemyDefinition(this.weightedPick(wave.enemies));
      const position = this.getSpawnPosition(definition.radius);
      const message = this.random.pick(definition.messages);
      this.group.add(
        new Enemy(
          this.scene,
          position.x,
          position.y,
          definition,
          message,
          wave.enemyHpMultiplier,
          wave.enemySpeedMultiplier,
        ),
      );
    }
  }

  private weightedPick(weights: readonly EnemyWeight[]): string {
    const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.random.next() * totalWeight;

    for (const entry of weights) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.enemyId;
      }
    }

    return weights[weights.length - 1].enemyId;
  }

  private getSpawnPosition(radius: number): Phaser.Math.Vector2 {
    const margin = radius + 6;
    const topMargin = 70 + radius;
    const side = this.random.nextInt(0, 3);

    if (side === 0) {
      return new Phaser.Math.Vector2(
        margin,
        this.random.nextInt(topMargin, GAME_HEIGHT - margin),
      );
    }
    if (side === 1) {
      return new Phaser.Math.Vector2(
        GAME_WIDTH - margin,
        this.random.nextInt(topMargin, GAME_HEIGHT - margin),
      );
    }
    if (side === 2) {
      return new Phaser.Math.Vector2(
        this.random.nextInt(margin, GAME_WIDTH - margin),
        topMargin,
      );
    }
    return new Phaser.Math.Vector2(
      this.random.nextInt(margin, GAME_WIDTH - margin),
      GAME_HEIGHT - margin,
    );
  }
}
