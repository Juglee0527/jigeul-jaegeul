import type { GameResult } from '../types/game';

const COMBO_WINDOW_MS = 2_000;

export function calculateFinalScore(result: GameResult): number {
  return Math.floor(
    result.survivalSeconds * 10
      + result.killCount * 5
      + result.bossKillCount * 5_000
      + result.level * 100
      + result.maxCombo * 2,
  );
}

export class ScoreSystem {
  killCount = 0;
  currentCombo = 0;
  maxCombo = 0;

  private lastKillAt = Number.NEGATIVE_INFINITY;

  registerKill(playTimeMs: number): void {
    this.killCount += 1;
    this.currentCombo = playTimeMs - this.lastKillAt <= COMBO_WINDOW_MS
      ? this.currentCombo + 1
      : 1;
    this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
    this.lastKillAt = playTimeMs;
  }

  update(playTimeMs: number): void {
    if (this.currentCombo > 0 && playTimeMs - this.lastKillAt > COMBO_WINDOW_MS) {
      this.currentCombo = 0;
    }
  }

  getCurrentScore(survivalSeconds: number, level: number): number {
    return calculateFinalScore(this.createResult(survivalSeconds, level));
  }

  createResult(survivalSeconds: number, level: number): GameResult {
    return {
      survivalSeconds,
      killCount: this.killCount,
      level,
      maxCombo: this.maxCombo,
      bossKillCount: 0,
    };
  }
}
