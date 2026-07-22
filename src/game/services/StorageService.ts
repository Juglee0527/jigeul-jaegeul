import type { GameResult, SavedGameData } from '../types/game';

const STORAGE_KEY = 'jigeul-jaegeul:save:v1';

export interface RecordUpdateResult {
  data: SavedGameData;
  isNewHighScore: boolean;
}

export class StorageService {
  load(): SavedGameData {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return this.createDefaultData();
      }
      return this.sanitize(JSON.parse(rawValue) as unknown);
    } catch {
      return this.createDefaultData();
    }
  }

  updateRecords(result: GameResult, finalScore: number): RecordUpdateResult {
    const current = this.load();
    const isNewHighScore = finalScore > current.highScore;
    const updated: SavedGameData = {
      ...current,
      highScore: Math.max(current.highScore, finalScore),
      longestSurvivalSeconds: Math.max(current.longestSurvivalSeconds, result.survivalSeconds),
      maxKills: Math.max(current.maxKills, result.killCount),
      maxCombo: Math.max(current.maxCombo, result.maxCombo),
    };

    this.save(updated);
    return { data: updated, isNewHighScore };
  }

  private save(data: SavedGameData): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 저장소가 차단되거나 가득 차도 게임 진행은 유지한다.
    }
  }

  private sanitize(value: unknown): SavedGameData {
    if (!this.isRecord(value) || value.version !== 1) {
      return this.createDefaultData();
    }

    const defaults = this.createDefaultData();
    return {
      version: 1,
      highScore: this.nonNegativeNumber(value.highScore, defaults.highScore),
      longestSurvivalSeconds: this.nonNegativeNumber(
        value.longestSurvivalSeconds,
        defaults.longestSurvivalSeconds,
      ),
      maxKills: this.nonNegativeNumber(value.maxKills, defaults.maxKills),
      maxCombo: this.nonNegativeNumber(value.maxCombo, defaults.maxCombo),
      dailyRecords: this.isRecord(value.dailyRecords)
        ? value.dailyRecords as SavedGameData['dailyRecords']
        : defaults.dailyRecords,
      settings: this.isRecord(value.settings) && typeof value.settings.soundEnabled === 'boolean'
        ? { soundEnabled: value.settings.soundEnabled }
        : defaults.settings,
    };
  }

  private createDefaultData(): SavedGameData {
    return {
      version: 1,
      highScore: 0,
      longestSurvivalSeconds: 0,
      maxKills: 0,
      maxCombo: 0,
      dailyRecords: {},
      settings: { soundEnabled: true },
    };
  }

  private nonNegativeNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
