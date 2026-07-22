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
