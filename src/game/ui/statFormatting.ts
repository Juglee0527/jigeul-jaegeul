import type { PlayerStatKey, PlayerStats, StatModifier, UpgradeDefinition } from '../types/game';

const STAT_LABELS: Record<PlayerStatKey, string> = {
  maxHp: '최대 멘탈',
  moveSpeed: '이동속도',
  attackDamage: '공격력',
  attackCooldown: '발사 간격',
  projectileSpeed: '탄환속도',
  projectileCount: '탄환 수',
  attackRange: '공격거리',
  pickupRange: '획득범위',
  armor: '피해감소',
  regeneration: '초당회복',
  enemySpeedMultiplier: '적 속도',
};

export function getCombatStatLines(stats: PlayerStats): string[] {
  const effectiveRegeneration = Math.min(stats.regeneration, stats.maxHp * 0.1);
  return [
    `공격력       ${formatNumber(stats.attackDamage)}`,
    `공격속도     ${formatRate(stats.attackCooldown)}발/초`,
    `발사간격     ${formatSeconds(stats.attackCooldown)}초`,
    `공격거리     ${formatNumber(stats.attackRange)}`,
    `탄환 수      ${formatNumber(stats.projectileCount)}`,
    `탄환속도     ${formatNumber(stats.projectileSpeed)}`,
    `이동속도     ${formatNumber(stats.moveSpeed)}`,
    `획득범위     ${formatNumber(stats.pickupRange)}`,
    `피해감소     ${formatDamageReduction(stats.armor)}  (최대 90%)`,
    `초당회복     ${formatNumber(effectiveRegeneration)}  (멘탈의 최대 10%)`,
    `회복 재개    마지막 피격 1초 후`,
  ];
}

export function getCompactStatLines(stats: PlayerStats): string[] {
  return [
    `공격 ${formatNumber(stats.attackDamage)}   ${formatRate(stats.attackCooldown)}발/초`,
    `거리 ${formatNumber(stats.attackRange)}   탄환 ${formatNumber(stats.projectileCount)}`,
  ];
}

export function formatUpgradeChanges(upgrade: UpgradeDefinition, stats: PlayerStats): string[] {
  const simulated = { ...stats };
  const statChanges = (upgrade.modifiers ?? []).map((modifier) => {
    const before = simulated[modifier.stat];
    const after = applyModifier(before, modifier);
    simulated[modifier.stat] = after;
    return formatStatChange(modifier.stat, before, after);
  });
  return upgrade.special ? [upgrade.special, ...statChanges] : statChanges;
}

function applyModifier(value: number, modifier: StatModifier): number {
  return modifier.operation === 'add' ? value + modifier.value : value * modifier.value;
}

function formatStatChange(stat: PlayerStatKey, before: number, after: number): string {
  if (stat === 'attackCooldown') {
    const beforeRate = formatRate(before);
    const afterRate = formatRate(after);
    return `공격속도  ${beforeRate}발/초 → ${afterRate}발/초`;
  }
  if (stat === 'enemySpeedMultiplier') {
    return `${STAT_LABELS[stat]}  ${Math.round(before * 100)}% → ${Math.round(after * 100)}%`;
  }
  if (stat === 'armor') {
    return `${STAT_LABELS[stat]}  ${formatDamageReduction(before)} → ${formatDamageReduction(after)}`;
  }

  const difference = after - before;
  const sign = difference >= 0 ? '+' : '';
  return `${STAT_LABELS[stat]}  ${formatNumber(before)} → ${formatNumber(after)}  (${sign}${formatNumber(difference)})`;
}

function formatRate(cooldown: number): string {
  return (1000 / cooldown).toFixed(2);
}

function formatSeconds(cooldown: number): string {
  return (cooldown / 1000).toFixed(2);
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

function formatDamageReduction(armor: number): string {
  return `${Math.round(Math.min(0.9, Math.max(0, armor * 0.1)) * 100)}%`;
}
