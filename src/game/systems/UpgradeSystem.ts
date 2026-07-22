import { UPGRADES } from '../config/upgrades';
import type { Player } from '../entities/Player';
import type { UpgradeDefinition } from '../types/game';

export class UpgradeSystem {
  private readonly levels = new Map<string, number>();

  getChoices(count = 3): UpgradeDefinition[] {
    const pool = UPGRADES.filter((upgrade) => this.getLevel(upgrade.id) < upgrade.maxLevel);
    const choices: UpgradeDefinition[] = [];

    while (choices.length < count && pool.length > 0) {
      const selected = this.weightedPick(pool);
      choices.push(selected);
      pool.splice(pool.indexOf(selected), 1);
    }

    return choices;
  }

  getLevel(id: string): number {
    return this.levels.get(id) ?? 0;
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

  private weightedPick(pool: readonly UpgradeDefinition[]): UpgradeDefinition {
    const totalWeight = pool.reduce((sum, upgrade) => sum + upgrade.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const upgrade of pool) {
      roll -= upgrade.weight;
      if (roll <= 0) {
        return upgrade;
      }
    }

    return pool[pool.length - 1];
  }
}
