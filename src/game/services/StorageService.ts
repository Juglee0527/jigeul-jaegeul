import type { DailyRecord, GameResult, SavedGameData } from '../types/game';

const STORAGE_KEY = 'jigeul-jaegeul:save:v1';

export interface RecordUpdateResult {
  data: SavedGameData;
  isNewHighScore: boolean;
  isNewDailyRecord: boolean;
  dailyRecord?: DailyRecord;
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
    const previousDailyRecord = result.dailyDate
      ? current.dailyRecords[result.dailyDate]
      : undefined;
    const isNewDailyRecord = result.mode === 'daily'
      && Boolean(result.dailyDate)
      && (!previousDailyRecord || finalScore > previousDailyRecord.score);

    const dailyRecord = result.mode === 'daily' && result.dailyDate
      ? {
          date: result.dailyDate,
          score: isNewDailyRecord ? finalScore : previousDailyRecord?.score ?? finalScore,
          survivalSeconds: isNewDailyRecord
            ? result.survivalSeconds
            : previousDailyRecord?.survivalSeconds ?? result.survivalSeconds,
          kills: isNewDailyRecord ? result.killCount : previousDailyRecord?.kills ?? result.killCount,
          level: isNewDailyRecord ? result.level : previousDailyRecord?.level ?? result.level,
        }
      : undefined;

    const updated: SavedGameData = {
      ...current,
      highScore: Math.max(current.highScore, finalScore),
      longestSurvivalSeconds: Math.max(current.longestSurvivalSeconds, result.survivalSeconds),
      maxKills: Math.max(current.maxKills, result.killCount),
      dailyRecords: dailyRecord
        ? { ...current.dailyRecords, [dailyRecord.date]: dailyRecord }
        : current.dailyRecords,
    };

    this.save(updated);
    return { data: updated, isNewHighScore, isNewDailyRecord, dailyRecord };
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
      dailyRecords: this.sanitizeDailyRecords(value.dailyRecords),
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
      dailyRecords: {},
      settings: { soundEnabled: true },
    };
  }

  private nonNegativeNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  private sanitizeDailyRecords(value: unknown): Record<string, DailyRecord> {
    if (!this.isRecord(value)) {
      return {};
    }

    const records: Record<string, DailyRecord> = {};
    Object.entries(value).forEach(([date, candidate]) => {
      if (
        /^\d{8}$/.test(date)
        && this.isRecord(candidate)
        && candidate.date === date
        && this.isNonNegativeNumber(candidate.score)
        && this.isNonNegativeNumber(candidate.survivalSeconds)
        && this.isNonNegativeNumber(candidate.kills)
        && this.isNonNegativeNumber(candidate.level)
      ) {
        records[date] = {
          date,
          score: candidate.score,
          survivalSeconds: candidate.survivalSeconds,
          kills: candidate.kills,
          level: candidate.level,
        };
      }
    });
    return records;
  }

  private isNonNegativeNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
