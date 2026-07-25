import type { GameResult, GameSession } from '../types/game';

export const SURVIVAL_POINTS_PER_SECOND = 10;
export const DAMAGE_SCORE_PENALTY = 100;

export function calculateEnemyKillScore(scoreLevel: number): number {
  const level = Math.max(1, Math.floor(scoreLevel));
  return level * level * 20;
}

export function calculateFinalScore(result: GameResult): number {
  return Math.max(0, Math.floor(result.score));
}

export class ScoreSystem {
  killCount = 0;
  bossKillCount = 0;
  private scoreAdjustment = 0;

  constructor(private readonly session: GameSession) {}

  registerKill(scoreLevel: number): number {
    this.killCount += 1;
    const points = calculateEnemyKillScore(scoreLevel);
    this.scoreAdjustment += points;
    return points;
  }

  registerBossKill(): void {
    this.bossKillCount += 1;
  }

  registerDamage(survivalSeconds: number): number {
    const deduction = Math.min(
      DAMAGE_SCORE_PENALTY,
      this.getCurrentScore(survivalSeconds),
    );
    this.scoreAdjustment -= deduction;
    return deduction;
  }

  getCurrentScore(survivalSeconds: number): number {
    const survivalScore = Math.floor(survivalSeconds) * SURVIVAL_POINTS_PER_SECOND;
    return Math.max(0, survivalScore + this.scoreAdjustment);
  }

  createResult(survivalSeconds: number, level: number, victory = false): GameResult {
    return {
      score: this.getCurrentScore(survivalSeconds),
      survivalSeconds,
      killCount: this.killCount,
      level,
      bossKillCount: this.bossKillCount,
      victory,
      ...this.session,
    };
  }
}
