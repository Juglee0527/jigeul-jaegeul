export type GameMode = 'normal' | 'daily';
export type GameDifficulty = 'easy' | 'normal' | 'hard';
export type GameLength = 'standard' | 'quick';

export interface GameSession {
  mode: GameMode;
  difficulty: GameDifficulty;
  gameLength: GameLength;
  seed: string;
  dailyDate?: string;
}

export interface GameResult {
  score: number;
  survivalSeconds: number;
  killCount: number;
  level: number;
  bossKillCount: number;
  victory?: boolean;
  mode: GameMode;
  difficulty: GameDifficulty;
  gameLength: GameLength;
  seed: string;
  dailyDate?: string;
}

export interface DailyRecord {
  date: string;
  score: number;
  survivalSeconds: number;
  kills: number;
  level: number;
}

export interface GameSettings {
  soundEnabled: boolean;
}

export interface SavedGameData {
  version: 1;
  highScore: number;
  longestSurvivalSeconds: number;
  maxKills: number;
  dailyRecords: Record<string, DailyRecord>;
  settings: GameSettings;
}

export interface PlayerStats {
  maxHp: number;
  moveSpeed: number;
  attackDamage: number;
  attackCooldown: number;
  projectileSpeed: number;
  projectileCount: number;
  attackRange: number;
  pickupRange: number;
  armor: number;
  regeneration: number;
  enemySpeedMultiplier: number;
}

export type PlayerStatKey = keyof PlayerStats;
export type UpgradeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface StatModifier {
  stat: PlayerStatKey;
  operation: 'add' | 'multiply';
  value: number;
}

export type UpgradeEffectKey =
  | 'bossDamage'
  | 'chainDamage'
  | 'chainTargets'
  | 'criticalChance'
  | 'criticalMultiplier'
  | 'echoShotChance'
  | 'executeThreshold'
  | 'explosionDamage'
  | 'explosionRadius'
  | 'nova'
  | 'onKillHeal'
  | 'pierce'
  | 'projectileScale'
  | 'rearShot'
  | 'retaliationDamage'
  | 'revive'
  | 'shield'
  | 'sideShot';

export interface UpgradeEffect {
  key: UpgradeEffectKey;
  value: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  rarity: UpgradeRarity;
  weight: number;
  modifiers?: readonly StatModifier[];
  effects?: readonly UpgradeEffect[];
  special?: string;
}

export type EnemyArchetype = 'normal' | 'wanderer' | 'charger' | 'tank';

export interface EnemyDefinition {
  id: string;
  name: string;
  messages: readonly string[];
  archetype: EnemyArchetype;
  color: number;
  radius: number;
  maxHp: number;
  moveSpeed: number;
  contactDamage: number;
  experienceValue: number;
  scoreLevel?: number;
  isBoss?: boolean;
  chargeSpeed?: number;
  chargeTriggerDistance?: number;
  chargeDuration?: number;
  chargeCooldown?: number;
}

export interface EnemyWeight {
  enemyId: string;
  weight: number;
}

export interface WaveConfig {
  id: string;
  name: string;
  startTime: number;
  spawnInterval: number;
  spawnCount: number;
  maxEnemies: number;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
  enemies: readonly EnemyWeight[];
}
