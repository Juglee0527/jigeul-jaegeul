import { UPGRADES } from '../config/upgrades';
import type { Player } from '../entities/Player';
import type { RandomSource } from '../services/SeededRandom';
import type { UpgradeDefinition, UpgradeRarity } from '../types/game';

const RARITY_WEIGHTS: Readonly<Record<UpgradeRarity, number>> = {
  common: 68,
  rare: 22,
  epic: 8,
  legendary: 2,
};

const EPIC_PITY_THRESHOLD = 6;
const LEGENDARY_PITY_THRESHOLD = 14;
const RARITY_UNLOCK_SECONDS: Readonly<Record<UpgradeRarity, number>> = {
  common: 0,
  rare: 30,
  epic: 60,
  legendary: 90,
};

export class UpgradeSystem {
  private readonly levels = new Map<string, number>();
  private offersWithoutEpic = 0;
  private offersWithoutLegendary = 0;

  constructor(private readonly random: RandomSource) {}

  getChoices(survivalSeconds = 0, count = 3): UpgradeDefinition[] {
    const pool = UPGRADES.filter((upgrade) => (
      this.getLevel(upgrade.id) < upgrade.maxLevel
      && survivalSeconds >= RARITY_UNLOCK_SECONDS[upgrade.rarity]
    ));
    const choices: UpgradeDefinition[] = [];

    const guaranteedRarity = this.getGuaranteedRarity(pool);
    if (guaranteedRarity) {
      const guaranteedPool = pool.filter((upgrade) => upgrade.rarity === guaranteedRarity);
      const selected = this.weightedPick(guaranteedPool);
      choices.push(selected);
      pool.splice(pool.indexOf(selected), 1);
    }

    while (choices.length < count && pool.length > 0) {
      const rarity = this.pickRarity(pool);
      const selected = this.weightedPick(pool.filter((upgrade) => upgrade.rarity === rarity));
      choices.push(selected);
      pool.splice(pool.indexOf(selected), 1);
    }

    if (survivalSeconds >= RARITY_UNLOCK_SECONDS.legendary) {
      if (choices.some((upgrade) => upgrade.rarity === 'legendary')) {
        this.offersWithoutLegendary = 0;
      } else {
        this.offersWithoutLegendary += 1;
      }
    }
    if (survivalSeconds >= RARITY_UNLOCK_SECONDS.epic) {
      if (choices.some((upgrade) => upgrade.rarity === 'epic' || upgrade.rarity === 'legendary')) {
        this.offersWithoutEpic = 0;
      } else {
        this.offersWithoutEpic += 1;
      }
    }

    return choices;
  }

  getLevel(id: string): number {
    return this.levels.get(id) ?? 0;
  }

  getLegendaryChoices(count = 3): UpgradeDefinition[] {
    const pool = UPGRADES.filter((upgrade) => (
      upgrade.rarity === 'legendary'
      && this.getLevel(upgrade.id) < upgrade.maxLevel
    ));
    const choices: UpgradeDefinition[] = [];
    while (choices.length < count && pool.length > 0) {
      const selected = this.weightedPick(pool);
      choices.push(selected);
      pool.splice(pool.indexOf(selected), 1);
    }
    return choices;
  }

  apply(id: string, player: Player): void {
    const upgrade = UPGRADES.find((candidate) => candidate.id === id);
    if (!upgrade) {
      throw new Error(`알 수 없는 능력입니다: ${id}`);
    }

    const currentLevel = this.getLevel(id);
    if (currentLevel >= upgrade.maxLevel) {
      return;
    }

    upgrade.modifiers.forEach((modifier) => player.applyStatModifier(modifier));
    this.levels.set(id, currentLevel + 1);
  }

  private getGuaranteedRarity(pool: readonly UpgradeDefinition[]): UpgradeRarity | undefined {
    if (
      this.offersWithoutLegendary >= LEGENDARY_PITY_THRESHOLD
      && pool.some((upgrade) => upgrade.rarity === 'legendary')
    ) {
      return 'legendary';
    }
    if (
      this.offersWithoutEpic >= EPIC_PITY_THRESHOLD
      && pool.some((upgrade) => upgrade.rarity === 'epic')
    ) {
      return 'epic';
    }
    return undefined;
  }

  private pickRarity(pool: readonly UpgradeDefinition[]): UpgradeRarity {
    const available = [...new Set(pool.map((upgrade) => upgrade.rarity))];
    const totalWeight = available.reduce((sum, rarity) => sum + RARITY_WEIGHTS[rarity], 0);
    let roll = this.random.next() * totalWeight;

    for (const rarity of available) {
      roll -= RARITY_WEIGHTS[rarity];
      if (roll <= 0) {
        return rarity;
      }
    }

    return available[available.length - 1];
  }

  private weightedPick(pool: readonly UpgradeDefinition[]): UpgradeDefinition {
    const totalWeight = pool.reduce((sum, upgrade) => sum + upgrade.weight, 0);
    let roll = this.random.next() * totalWeight;

    for (const upgrade of pool) {
      roll -= upgrade.weight;
      if (roll <= 0) {
        return upgrade;
      }
    }

    return pool[pool.length - 1];
  }
}
