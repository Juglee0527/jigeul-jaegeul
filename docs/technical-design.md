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
│  │  ├─ constants.ts
│  │  ├─ gameConfig.ts
│  │  ├─ enemies.ts
│  │  ├─ upgrades.ts
│  │  └─ waves.ts
│  ├─ scenes/
│  │  ├─ BootScene.ts
│  │  ├─ MenuScene.ts
│  │  ├─ HelpScene.ts
│  │  ├─ GameScene.ts
│  │  ├─ UpgradeScene.ts
│  │  ├─ PauseScene.ts
│  │  └─ ResultScene.ts
│  ├─ entities/
│  │  ├─ Player.ts
│  │  ├─ Enemy.ts
│  │  ├─ BossProjectile.ts
│  │  ├─ Projectile.ts
│  │  └─ ExperienceGem.ts
│  ├─ systems/
│  │  ├─ EnemySpawner.ts
│  │  ├─ LevelSystem.ts
│  │  ├─ UpgradeSystem.ts
│  │  ├─ ScoreSystem.ts
│  │  └─ WaveSystem.ts
│  ├─ services/
│  │  ├─ AudioManager.ts
│  │  ├─ SeededRandom.ts
│  │  └─ StorageService.ts
│  ├─ ui/
│  │  ├─ Hud.ts
│  │  └─ statFormatting.ts
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
| UpgradeScene | 게임을 멈추고 좌우 방향키 포커스·Enter 확정 방식으로 능력 선택 처리 |
| PauseScene | 전체 능력치 표시와 위·아래 방향키 메뉴 처리 |
| ResultScene | 결과 계산·저장·표시와 재시작 |

`UpgradeScene`은 `GameScene` 위에 겹쳐 실행하고 게임 시간을 명시적으로 멈춘다. 타이머, 물리, 적 생성이 함께 멈춰야 한다.

## 4. 핵심 타입

```ts
interface PlayerStats {
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

interface GameSession {
  mode: 'normal' | 'daily';
  difficulty: 'easy' | 'normal' | 'hard';
  seed: string;
  dailyDate?: string;
}

interface GameResult {
  score: number;
  survivalSeconds: number;
  killCount: number;
  bossKillCount: number;
  level: number;
  victory?: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  mode: 'normal' | 'daily';
  seed: string;
  dailyDate?: string;
}

interface WaveConfig {
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
```

능력은 식별자, 이름, 설명, 최대 3레벨, 4단계 희귀도, 능력치 modifier와 전투 effect를 데이터로 가진다. `UpgradeSystem`은 생존 시간으로 등급 잠금을 필터링하고 희귀도 가중치와 보장 횟수를 적용한다. `GameScene`은 선택된 effect를 누적해 관통·치명타·추가 사격·연쇄·폭발·보호막·부활 같은 런타임 규칙에 반영한다. 데이터 파일에 Phaser 객체나 Scene 참조를 넣지 않는다.

## 5. 주요 데이터 흐름

```text
입력 → Player 이동
Game Clock → WaveSystem → EnemySpawner
자동 공격 타이머 → 전역 최근접 대상 탐색 → Player 부착 총기 회전·반동 → 매 프레임 직접 이동하는 방향성 Projectile 일제 사격
충돌 → 피해 → 적 사망 → 글자 단계별 경험치/처치/점수
경험치 획득 → LevelSystem → UpgradeScene
기본 3분/6분/10분 또는 퀵 2분/5분 도달 → 단계별 보스 생성 → 타이머 정지 → 중간 보스는 전설 보물상자, 최종 보스는 즉시 ResultScene
플레이어 사망 또는 최종 보스 승리 → GameResult → 점수 계산 → StorageService → ResultScene
```

적 생성 시 시드 난수로 유형별 멘트를 선택한다. `Enemy`는 최대 체력과 현재 체력을 관리하고 피해를 받을 때 부착 체력바의 비율과 색상을 갱신한다. `UpgradeScene`은 현재 `PlayerStats` 복사본을 받아 각 modifier 적용 전·후 값을 계산해 표시한다.

`GameSession`의 난이도를 `EnemySpawner`에 전달해 일반 적과 보스의 체력·속도·접촉 피해에 동일한 배율을 적용한다. 보스 탄환 피해는 `GameScene`에서 같은 배율로 계산한다. 쉬움은 0.5, 보통은 1.0, 어려움은 1.5이며 결과와 재시작 세션에도 난이도를 유지한다. 일반 적 풀은 정의의 점수 레벨로 필터링해 쉬움 1~4, 보통 1~5, 어려움 2~6만 허용한다. 이동 원형은 추적·배회·도망·돌진·중장갑·공전을 지원한다.

`GameSession.gameLength`는 `standard`와 `quick` 중 하나다. 기본 모드는 3·6·10분 보스 세 개를, 퀵 모드는 2·5분 보스 두 개를 예약한다. 보스전에서는 생존 타이머와 별개로 계속 증가하는 전투 시계를 사용한다. 자동 공격 쿨다운, 피격 무적시간, 보스 이동과 패턴 예약은 전투 시계를 참조하므로 예약 시각에 생존 타이머가 정지해도 전투가 멈추지 않는다. 보스 외형과 패턴은 세 유형 중 시드 난수로 선택하고 단계별 체력·속도·피해·점수는 별도 표로 덮어쓴다. 보스는 중앙 상단 고정 위치에 생성하며 생성 직전 활성 일반 적 목록을 섞어 절반을 제거한다. 전투 중에는 일반 적을 간헐적으로 한 마리씩 생성하며, 15초마다 격노 배율을 높여 이동·피해·탄막 속도·패턴 쿨다운에 반영한다. 보스-일반 적 물리 충돌은 process callback에서 제외해 보스 경로를 보장한다. `Enemy`는 대시 이동 오버라이드, 순간이동, 거리 유지와 공전 이동을 지원한다. `BossProjectile`은 조준·원형·회전 탄막을 공통 처리하며 각 공격은 Phaser Tween 경고를 먼저 표시한다.

일반 적 생성 좌표는 화면 네 변 바깥이다. `Enemy`는 최초 진입 전 중앙을 향해 이동하고, 완전히 전장 안으로 들어온 순간 `collideWorldBounds`를 활성화해 이후 화면 밖 이탈을 차단한다. `EnemySpawner`는 배회·도망·공전 archetype의 추첨 가중치를 0.5배로 낮춘다. 이 세 유형은 첫 행동 시 체류 만료 시각을 기록하고 18~26초 후 물리 바디를 끈 뒤 320ms 페이드아웃으로 제거한다.

`Hud`는 공격력·초당 발사 수·공격거리·탄환 수와 현재 난이도 배지를 상시 표시한다. 난이도 색상은 쉬움 초록, 보통 노랑, 어려움 빨강으로 통일한다. `PauseScene`은 `GameScene`의 현재 `PlayerStats`와 획득 능력 목록을 읽어 전체 능력치·능력 레벨을 표시하고 위·아래 방향키와 Enter로 메뉴를 조작한다. 공격속도 카드도 쿨다운 대신 초당 발사 수의 전후 값을 표시한다.

메인 메뉴는 위·아래 방향키로 포커스를 순환하고 Enter로 선택하며, 좌·우 방향키로 난이도를 변경한다. 내부 방어력 1은 피해 감소 10%로 환산하며 UI에는 내부 수치 대신 피해 감소율을 표시한다. 피해 감소는 최대 90%이고 최소 1 피해를 보장한다. 자동 회복은 마지막 피격 1초 뒤 재개하며 최대 멘탈의 초당 10%를 상한으로 둔다. 체력이 0인 플레이어는 전설 부활 횟수가 남은 경우에만 45% 멘탈로 복귀하고, 그 외에는 즉시 게임 종료를 확정한다. HUD 경험치는 `현재 / 필요 (정수%)` 형식으로 표시한다.

`AudioManager`는 최초 사용자 입력에서 Web Audio 그래프를 활성화한다. 짧은 look-ahead 스케줄러로 절차형 BGM을 생성하고 Scene 상태별 템포·음량을 전환한다. 효과음은 오실레이터의 주파수·파형·엔벌로프 조합으로 생성해 별도 음원 파일과 저작권 의존성을 만들지 않는다.

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
