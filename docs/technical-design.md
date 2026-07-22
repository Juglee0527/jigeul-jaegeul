# 기술 설계 문서

## 1. 기술 스택

- Vite
- TypeScript
- Phaser 3
- HTML5 Canvas
- npm
- LocalStorage
- GitHub Actions 및 GitHub Pages

React는 사용하지 않는다. DOM은 게임 컨테이너와 최소한의 페이지 셸에만 사용하고 플레이 흐름은 Phaser Scene 중심으로 구성한다.

## 2. 권장 디렉터리 구조

```text
src/
├─ main.ts
├─ game/
│  ├─ config/
│  │  ├─ gameConfig.ts
│  │  ├─ enemies.ts
│  │  ├─ upgrades.ts
│  │  └─ waves.ts
│  ├─ scenes/
│  │  ├─ BootScene.ts
│  │  ├─ MenuScene.ts
│  │  ├─ GameScene.ts
│  │  ├─ UpgradeScene.ts
│  │  └─ ResultScene.ts
│  ├─ entities/
│  │  ├─ Player.ts
│  │  ├─ Enemy.ts
│  │  ├─ Projectile.ts
│  │  └─ ExperienceGem.ts
│  ├─ systems/
│  │  ├─ EnemySpawner.ts
│  │  ├─ CombatSystem.ts
│  │  ├─ LevelSystem.ts
│  │  ├─ UpgradeSystem.ts
│  │  ├─ ScoreSystem.ts
│  │  └─ WaveSystem.ts
│  ├─ services/
│  │  ├─ SeededRandom.ts
│  │  └─ StorageService.ts
│  ├─ ui/
│  │  ├─ Hud.ts
│  │  └─ UpgradeCard.ts
│  └─ types/
│     └─ game.ts
└─ styles/
   └─ global.css
```

초기 구현에서는 작은 시스템을 `GameScene`에 둘 수 있지만, 데이터 정의·저장·난수·점수 계산은 처음부터 분리한다.

## 3. Scene 책임

| Scene | 책임 |
| --- | --- |
| BootScene | 그래픽 생성, 에셋 준비, 공통 설정 |
| MenuScene | 모드 선택, 최고 기록, 게임 방법 |
| GameScene | 월드 시뮬레이션과 시스템 조정 |
| UpgradeScene | 게임을 멈추고 능력 선택 처리 |
| ResultScene | 결과 계산·저장·표시와 재시작 |

`UpgradeScene`은 `GameScene` 위에 겹쳐 실행하거나 게임 시간을 명시적으로 멈추는 방식 중 하나로 구현한다. 어떤 방식을 택하든 타이머, 물리, 적 생성, 콤보 시간이 함께 멈춰야 한다.

## 4. 핵심 타입

```ts
interface PlayerStats {
  maxHp: number;
  hp: number;
  moveSpeed: number;
  attackDamage: number;
  attackCooldown: number;
  projectileSpeed: number;
  projectileCount: number;
  attackRange: number;
  pickupRange: number;
  armor: number;
  regeneration: number;
  criticalChance: number;
  criticalDamage: number;
}

interface GameResult {
  survivalSeconds: number;
  killCount: number;
  bossKillCount: number;
  level: number;
  maxCombo: number;
}

interface WaveConfig {
  startTime: number;
  spawnInterval: number;
  maxEnemies: number;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
  availableEnemyTypes: string[];
}
```

능력은 식별자, 이름, 설명, 최대 레벨, 희귀도와 레벨별 효과를 데이터로 가진다. 데이터 파일에 Phaser 객체나 Scene 참조를 넣지 않고, 시스템이 데이터에 따라 플레이어 상태를 변경하도록 한다.

## 5. 주요 데이터 흐름

```text
입력 → Player 이동
Game Clock → WaveSystem → EnemySpawner
자동 공격 타이머 → 전역 최근접 대상 탐색 → Player 부착 총기 회전·반동 → 방향성 Projectile 일제 사격
충돌 → 피해 → 적 사망 → 경험치/처치/콤보
경험치 획득 → LevelSystem → UpgradeScene
플레이어 사망 → GameResult → 점수 계산 → StorageService → ResultScene
```

프레임 기반 수치 대신 Phaser가 제공하는 델타 시간 또는 타이머를 사용한다.

## 6. 시드 난수

게임 로직에서 `Math.random()`을 직접 호출하지 않는다.

```ts
interface SeededRandom {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}
```

- 오늘의 도전: 로컬 날짜 `YYYYMMDD`
- 일반 플레이: 시작 시 생성한 시드
- 현재 시드는 결과와 디버그 정보에 포함
- 시드 알고리즘 변경 시 기록 호환성을 위해 버전 필드 고려
- 적 생성은 `<seed>:enemies`, 능력 추첨은 `<seed>:upgrades` 스트림을 사용

## 7. 저장 설계

LocalStorage 키는 버전을 포함한 하나의 네임스페이스를 사용한다.

```text
jigeul-jaegeul:save:v1
```

```ts
interface SavedGameData {
  version: 1;
  highScore: number;
  longestSurvivalSeconds: number;
  maxKills: number;
  maxCombo: number;
  dailyRecords: Record<string, DailyRecord>;
  settings: GameSettings;
}
```

`StorageService`는 누락·손상된 값에 기본값을 적용하고 저장 실패가 게임 진행을 중단시키지 않게 한다. 날짜별 기록은 더 높은 점수일 때만 교체한다.

## 8. 성능 기준

- 물리 그룹으로 적, 투사체, 경험치 아이템 관리
- 화면에서 충분히 벗어난 투사체 제거
- 적의 최대 수를 웨이브에 명시
- 경험치 아이템은 동시에 최대 180개로 제한
- 매 프레임 전체 적 배열 정렬 금지
- 자동 공격 시 화면 전체의 가장 가까운 대상은 단일 순회로 탐색하며, 대상이 없으면 쿨다운을 소비하지 않음
- 경험치가 과도하면 가까운 아이템 병합 고려
- 오브젝트 풀링은 프로파일링에서 필요성이 확인된 대상부터 도입

개발 환경에서 개체 수와 FPS를 확인할 수 있는 선택적 디버그 표시를 두면 밸런싱과 성능 점검에 도움이 된다.

## 9. 품질 기준

- `any`와 타입 단언 최소화
- 설정 수치와 UI 문구의 중복 금지
- 시스템 계산은 가능한 한 순수 함수로 작성
- 사용하지 않는 코드와 주석 제거
- 기능 단위로 작은 변경 유지
- 각 마일스톤마다 수동 플레이와 프로덕션 빌드 확인

권장 npm 스크립트:

```text
npm run dev
npm run build
npm run preview
npm run typecheck
```

## 10. GitHub Pages 배포

Vite `base`는 저장소 경로로 설정한다.

```ts
export default defineConfig({
  base: '/jigeul-jaegeul/',
});
```

`main` 브랜치 push 시 GitHub Actions가 의존성 설치, 빌드, `dist/` 업로드, Pages 배포를 수행한다. 배포 전 로컬에서 `npm run build`와 `npm run preview`로 경로 문제를 확인한다.
