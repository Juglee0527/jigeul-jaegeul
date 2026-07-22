export interface GameResult {
  survivalSeconds: number;
  killCount: number;
  level: number;
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
export type UpgradeRarity = 'common' | 'rare' | 'legendary';

export interface StatModifier {
  stat: PlayerStatKey;
  operation: 'add' | 'multiply';
  value: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  rarity: UpgradeRarity;
  weight: number;
  modifiers: readonly StatModifier[];
}

export type EnemyArchetype = 'normal' | 'charger' | 'tank';

export interface EnemyDefinition {
  id: string;
  name: string;
  archetype: EnemyArchetype;
  color: number;
  radius: number;
  maxHp: number;
  moveSpeed: number;
  contactDamage: number;
  experienceValue: number;
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
