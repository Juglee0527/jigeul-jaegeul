import type { GameResult, GameSession } from '../types/game';

export function calculateFinalScore(result: GameResult): number {
  return Math.floor(
    result.survivalSeconds * 10
      + result.killCount * 5
      + result.bossKillCount * 5_000
      + result.level * 100,
  );
}

export class ScoreSystem {
  killCount = 0;
  bossKillCount = 0;

  constructor(private readonly session: GameSession) {}

  registerKill(): void {
    this.killCount += 1;
  }

  registerBossKill(): void {
    this.bossKillCount += 1;
  }

  getCurrentScore(survivalSeconds: number, level: number): number {
    return calculateFinalScore(this.createResult(survivalSeconds, level));
  }

  createResult(survivalSeconds: number, level: number, victory = false): GameResult {
    return {
      survivalSeconds,
      killCount: this.killCount,
      level,
      bossKillCount: this.bossKillCount,
      victory,
      ...this.session,
    };
  }
}
