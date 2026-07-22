import type { EnemyDefinition } from '../types/game';

export const ENEMY_DEFINITIONS: readonly EnemyDefinition[] = [
  {
    id: 'lol',
    name: '한마디',
    messages: ['ㅋ', '왜', '넵', '네'],
    archetype: 'normal',
    color: 0xff5c72,
    radius: 20,
    maxHp: 20,
    moveSpeed: 112,
    contactDamage: 10,
    experienceValue: 2,
  },
  {
    id: 'okay',
    name: '재촉',
    messages: ['급해', '확인', '잠깐', '언제'],
    archetype: 'normal',
    color: 0xff7a59,
    radius: 21,
    maxHp: 26,
    moveSpeed: 102,
    contactDamage: 10,
    experienceValue: 2,
  },
  {
    id: 'five-minutes',
    name: '추가업무',
    messages: ['회의중', '수정요', '보고서', '오분만'],
    archetype: 'normal',
    color: 0xf08bc8,
    radius: 23,
    maxHp: 34,
    moveSpeed: 92,
    contactDamage: 11,
    experienceValue: 3,
  },
  {
    id: 'urgent-deploy',
    name: '긴급 배포',
    messages: ['긴급배포', '오늘마감', '지금통화', '재작업요'],
    archetype: 'charger',
    color: 0xff304f,
    radius: 24,
    maxHp: 44,
    moveSpeed: 72,
    contactDamage: 16,
    experienceValue: 4,
    chargeSpeed: 330,
    chargeTriggerDistance: 280,
    chargeDuration: 620,
    chargeCooldown: 2_300,
  },
  {
    id: 'two-hour-meeting',
    name: '회의 2시간',
    messages: ['회의잡을게요', '잠깐통화돼요', '내일까지주세요', '처음부터다시'],
    archetype: 'tank',
    color: 0x8f5bff,
    radius: 34,
    maxHp: 120,
    moveSpeed: 54,
    contactDamage: 20,
    experienceValue: 7,
  },
] as const;

export function getEnemyDefinition(id: string): EnemyDefinition {
  const definition = ENEMY_DEFINITIONS.find((enemy) => enemy.id === id);
  if (!definition) {
    throw new Error(`알 수 없는 적입니다: ${id}`);
  }
  return definition;
}
