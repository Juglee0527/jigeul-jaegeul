import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { getEnemyDefinition } from '../config/enemies';
import { Enemy } from '../entities/Enemy';
import type { RandomSource } from '../services/SeededRandom';
import type { EnemyWeight, GameDifficulty, WaveConfig } from '../types/game';

const ENEMY_LEVEL_RANGES: Readonly<Record<GameDifficulty, readonly [number, number]>> = {
  easy: [1, 4],
  normal: [1, 5],
  hard: [2, 6],
};
const NON_CHASING_ARCHETYPES = new Set(['wanderer', 'flee', 'orbiter']);
const BOSS_STAGE_STATS = [
  { maxHp: 520, moveSpeed: 62, contactDamage: 22, scoreLevel: 8 },
  { maxHp: 1_500, moveSpeed: 54, contactDamage: 28, scoreLevel: 12 },
  { maxHp: 3_200, moveSpeed: 66, contactDamage: 34, scoreLevel: 18 },
] as const;

export class EnemySpawner {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly group: Phaser.Physics.Arcade.Group,
    private readonly random: RandomSource,
    private readonly difficultyMultiplier: number,
    private readonly difficulty: GameDifficulty,
  ) {}

  spawn(wave: WaveConfig, spawnLimit = wave.spawnCount): void {
    const availableSlots = wave.maxEnemies - this.group.countActive(true);
    const spawnCount = Math.min(spawnLimit, Math.max(0, availableSlots));
    const [minimumLevel, maximumLevel] = ENEMY_LEVEL_RANGES[this.difficulty];
    const eligibleEnemies = wave.enemies
      .filter(({ enemyId }) => {
        const level = getEnemyDefinition(enemyId).scoreLevel ?? 1;
        return level >= minimumLevel && level <= maximumLevel;
      })
      .map((entry) => {
        const archetype = getEnemyDefinition(entry.enemyId).archetype;
        return {
          ...entry,
          weight: NON_CHASING_ARCHETYPES.has(archetype) ? entry.weight * 0.5 : entry.weight,
        };
      });
    if (eligibleEnemies.length === 0) {
      return;
    }

    for (let index = 0; index < spawnCount; index += 1) {
      const definition = getEnemyDefinition(this.weightedPick(eligibleEnemies));
      const position = this.getSpawnPosition(definition.radius);
      const message = this.random.pick(definition.messages);
      this.group.add(
        new Enemy(
          this.scene,
          position.x,
          position.y,
          definition,
          message,
          wave.enemyHpMultiplier * this.difficultyMultiplier,
          wave.enemySpeedMultiplier * this.difficultyMultiplier,
          this.difficultyMultiplier,
        ),
      );
    }
  }

  spawnBoss(enemyId: string, stage: number): Enemy {
    const definition = getEnemyDefinition(enemyId);
    const stageStats = BOSS_STAGE_STATS[Phaser.Math.Clamp(stage - 1, 0, BOSS_STAGE_STATS.length - 1)];
    const position = new Phaser.Math.Vector2(GAME_WIDTH / 2, 235);
    const boss = new Enemy(
      this.scene,
      position.x,
      position.y,
      { ...definition, scoreLevel: stageStats.scoreLevel },
      this.random.pick(definition.messages),
      (stageStats.maxHp / definition.maxHp) * this.difficultyMultiplier,
      (stageStats.moveSpeed / definition.moveSpeed) * this.difficultyMultiplier,
      (stageStats.contactDamage / definition.contactDamage) * this.difficultyMultiplier,
    );
    this.group.add(boss);
    return boss;
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
    const outside = radius + 12;
    const insideMargin = radius + 8;
    const topMargin = 105 + radius;
    const side = this.random.nextInt(0, 3);

    if (side === 0) {
      return new Phaser.Math.Vector2(
        -outside,
        this.random.nextInt(topMargin, GAME_HEIGHT - insideMargin),
      );
    }
    if (side === 1) {
      return new Phaser.Math.Vector2(
        GAME_WIDTH + outside,
        this.random.nextInt(topMargin, GAME_HEIGHT - insideMargin),
      );
    }
    if (side === 2) {
      return new Phaser.Math.Vector2(
        this.random.nextInt(insideMargin, GAME_WIDTH - insideMargin),
        -outside,
      );
    }
    return new Phaser.Math.Vector2(
      this.random.nextInt(insideMargin, GAME_WIDTH - insideMargin),
      GAME_HEIGHT + outside,
    );
  }
}
