# GUIDE.md — AP3: 잔해의 귀환 개발자 가이드
> 버전: v0.9.0
> 최종 갱신: 2026-03-15

---

## 1. 프로젝트 구조

```
JNJD/
├── DEVELOPMENT_PLAN.md         # 4-Phase 기술 설계 전체 계획
├── GUIDE.md                    # 이 파일 — 개발자 레퍼런스
├── archive/antcolony/          # 기존 개미 식민지 시뮬레이터 아카이브
└── jonanjadeul/                # 새 게임 루트
    ├── index.html
    ├── css/style.css
    └── js/
        ├── Game.js
        ├── InputHandler.js
        ├── Renderer.js
        ├── Player.js
        ├── EnemyManager.js
        ├── WeaponSystem.js
        ├── TetrisGrid.js
        └── Collision.js
```

---

## 2. 실행 방법

```
jonanjadeul/index.html 을 브라우저에서 열기 (로컬 파일 직접 실행 가능)
```

> **주의**: `type="module"` 없이 일반 `<script>` 태그로 로드하므로
> 로컬 파일(`file://`) 열기만으로도 동작한다.

---

## 3. 설정값 (Config)

현재는 각 파일 상단 상수(CONST)로 관리한다. 수치를 바꾸고 싶으면 해당 파일의 상수를 수정한다.

| 파일 | 상수 | 설명 | 기본값 |
|---|---|---|---|
| `Game.js` | `WORLD_W / WORLD_H` | 맵 크기 | 12800 × 7200 (16배) |
| `Game.js` | `STAR_COUNT` | 별 배경 수 | 180 |
| `Player.js` | `this.accel` | 가속도 (px/s²) | 520 |
| `Player.js` | `this.drag` | 속도 감쇠 계수 (자연 최대속도 ≈ 217 px/s) | 0.96 |
| `Player.js` | `this.maxSpeed` | 최대 속도 상한 (px/s) | 260 |
| `Player.js` | `this.maxHp` | 최대 HP | 100 |
| `EnemyManager.js` | `MAX_ENEMIES` | 적 풀 크기 | 500 |
| `EnemyManager.js` | `ENEMY_SPEED_BASE` | 적 기본 속도 (웨이브 배율 적용 전) | 58 px/s |
| `EnemyManager.js` | `MODULE_DROP_CHANCE` | 적 처치 시 모듈 드랍 확률 | 0.15 (15%) |
| `EnemyManager.js` | `KILL_BASE` | Wave 1 킬 목표 | 12 |
| `EnemyManager.js` | `KILL_PER_WAVE` | 웨이브당 킬 목표 증가 | 6 |
| `EnemyManager.js` | `REST_DURATION` | 웨이브 사이 휴식 시간 | 6s |
| `EnemyManager.js` | `SPAWN_GROUP_SIZE` | 한 방향당 스폰 수 | 4 |
| `EnemyManager.js` | `SPAWN_INTERVAL` | 그룹 내 스폰 간격 | 0.4s |
| `EnemyManager.js` | `SPAWN_GROUP_GAP` | 방향 전환 대기 시간 | 2.0s |
| `EnemyManager.js` | `MODULE_DROP_COLLECT_RADIUS` | 모듈 드랍 수집 반지름 | 40 px |
| `EnemyManager.js` | `DEBRIS_COUNT` | 배경 잔해물 수 | 1500 |
| `EnemyManager.js` | `MODULE_DROP_LIFETIME` | 모듈 드랍 유효 시간 | 30s |
| `EnemyManager.js` | XP Gem `collectRadius` | 젬 흡수 시작 거리 | 200 px |
| `EnemyManager.js` | XP Gem `speed` | 젬 흡수 이동속도 | 320 px/s |
| `EnemyManager.js` | `ENEMY_TYPES` | 25종 적 타입 | 20종 일반(tier 1~10) + 5종 보스(tier 11) |
| `EnemyManager.js` | `_tierRadiusMult(tier)` | 티어 누적 반경 배율 | `1.2^(tier-1)` (tier 1=×1.0, tier 10=×5.16) |
| `EnemyManager.js` | `MAX_BOSS_PROJS` | 보스 투사체 풀 크기 | 150 |
| `EnemyManager.js` | `BOSS_PROJ_SPEED` | 보스 투사체 기본 속도 | 160 px/s |
| `EnemyManager.js` | `BOSS_CYCLE` | 보스 등장 순서 | OVERLORD→HIVEMOTHER→DREADNOUGHT→SPECTER_LORD→COLOSSUS→반복 |
| `WeaponSystem.js` | `MAX_PROJECTILES` | 투사체 풀 크기 (자동+포탄 공유) | 500 |
| `WeaponSystem.js` | `PROJ_SPEED` | 자동무기 투사체 속도 | 420 px/s |
| `WeaponSystem.js` | `DEFAULT_WEAPON.cooldown` | 자동무기 발사 쿨다운 | 0.72s |
| `WeaponSystem.js` | `DEFAULT_WEAPON.range` | 자동 사거리 | 350 px |
| `WeaponSystem.js` | `CANNON_SPEED` | 수동 포탄 속도 | 260 px/s |
| `WeaponSystem.js` | `CANNON_DAMAGE` | 포탄 데미지 (스플래시 공유) | 5 |
| `WeaponSystem.js` | `CANNON_SPLASH_R` | 포탄 스플래시 반지름 | 65 px |
| `WeaponSystem.js` | `CANNON_COOLDOWN` | 포탄 재사용 대기 | 1.5s |

---

## 4. 클래스 & 모듈 지도

### `Game.js` (IIFE, `window.Game`)
- 메인 게임 루프 (`requestAnimationFrame`)
- 상태머신: `START → PLAYING ↔ PAUSED → LEVELUP / BUILDING → GAMEOVER`
- HUD 업데이트, 파티클, 업그레이드 카드 UI, BUILDING 조립 화면
- **진입점**: `window.addEventListener('DOMContentLoaded', init)`

### `TetrisGrid.js` (IIFE, `window.TetrisGrid`)
- `init()`: 그리드·큐 초기화, 코어(0,0) 배치
- `queueRandomModule()`: 랜덤 모듈을 대기 큐에 추가 (EnemyManager 드랍 시 호출)
- `nextModule()`: 큐에서 다음 모듈을 꺼내 pending으로 설정 (Q키 시 호출)
- `hasQueued()`: 큐 또는 pending에 모듈이 있으면 true
- `getQueueSize()`: HUD 뱃지용 총 대기 모듈 수
- `handleClick(sx,sy,cx,cy,player)`: 클릭→그리드 좌표 변환→배치 시도
- `recalcHitbox(player)`: 부착 모듈 기반 `player.hitboxRadius` 재계산
- `drawOnCanvas(ctx,cx,cy,mouseX,mouseY,player)`: BUILDING 상태 조립 UI 렌더 (3패널)
- `drawShipModules(ctx,cx,cy,angle)`: 게임플레이 중 모듈 렌더 (회전 적용)
- `randomModuleKey()`: 랜덤 모듈 키 반환 (EnemyManager ModuleDrop 생성 시 호출)
- `queueModule(typeKey)`: 특정 모듈을 대기 큐에 추가 (ModuleDrop 수집 시 호출)
- `expandHullSlots(n)`: 함체 슬롯 증설 (+n)
- `getUsedSlots()` / `getMaxSlots()` / `getExpandCost()` / `getExpandAmount()`: 슬롯 정보
- **모듈 17종**: HULL_1/2, GUN_1/2, THRUSTER, WING_L/R + WPN_GATLING/SPREAD/SNIPER/MISSILE/FLAK/ORBIT/LASER/MINE/CHAIN/NOVA

### `InputHandler.js` (IIFE, `window.InputHandler`)
- `state.up/down/left/right`: WASD 상태
- `state.mouseX/Y`: 화면 마우스 좌표
- `consumePause()`: ESC/P 플래그 소비
- `consumeClick()`: mousedown 클릭 플래그 소비 (PLAYING: 포탄 발사, BUILDING: 배치)
- `consumeSkip()`: Space 건너뛰기 플래그 소비 (조립 화면 전용)
- `consumeOpenAssembly()`: Q 키 플래그 소비 (모듈 조립화면 열기)
- `consumeRotate()`: R 키 플래그 소비 (조립 화면 모듈 회전)
- `consumeExpand()`: E 키 플래그 소비 (조립 화면 함체 슬롯 증설)

### `Renderer.js` (IIFE, `window.Renderer`)
- `init(canvas)`: 캔버스 초기화, resize 이벤트 등록
- `clear()`: 매 프레임 배경 지우기
- `drawPlayer(sx, sy, angle, radius)`: 함선 도형
- `drawEnemy(sx, sy, angle, radius, hpRatio)`: 적 마름모
- `drawProjectile(sx, sy, radius, color)`: 투사체 + 글로우
- `drawXpGem(sx, sy)`: XP 다이아몬드
- `drawParticle(sx, sy, radius, alpha, color)`: 폭발 파티클
- `drawModuleDrop(sx, sy, moduleType)`: 모듈 드랍 아이템 (무기=빨강, 일반=파랑)
- `drawBossProjectile(sx, sy, radius, color)`: 보스 투사체 글로우 + 코어
- `drawBossHpBar(type, hp, maxHp)`: 보스 체력바 (화면 하단 중앙, zoom 미적용 UI)
- **5종 보스 draw 함수**: `_drawBossOverlord` (뾰족 붉은 소행성) / `_drawBossHivemother` (촉수 녹색 군체) / `_drawBossDreadnought` (중장갑 전함) / `_drawBossSpecterLord` (왕관형 반투명 유령) / `_drawBossColossus` (거대 보라 요새)

### `Player.js` (Class, `window.Player`)
- `update(dt, input, screenCx, screenCy)`: 이동, 회전, wraparound
- `takeDamage(dmg)`: 피격 (무적 시간 포함)
- `gainXp(amount)`: XP 획득, 레벨업 여부 반환
- `worldToScreen(wx, wy, worldW, worldH)`: 월드→화면 좌표 변환

### `EnemyManager.js` (IIFE, `window.EnemyManager`)
- `init(ww, wh)`: 풀 초기화
- `update(dt, player)`: 웨이브 스폰, AI 이동, XP 젬 흡수 → `{levelUp}`
- `damageEnemy(enemy, dmg)`: 데미지 적용 + 파괴 시 젬·ModuleDrop 드랍, 분열(SPLITTER→SWARM×3, SENTINEL→GRUNT×2, TITAN→BRUTE×2)
- `getActiveEnemies()`: 활성 적 배열 반환
- `getStats()`: `{waveNumber, totalKills, waveKills, waveKillTarget, restTimer, isResting}`
- `getBoss()`: 현재 활성 보스 참조 반환 (없으면 null)
- **20종 일반 적**: DRONE·RUSHER(Tier1) / SWARM·ZIGZAGGER(Tier2) / GRUNT·DASHER(Tier3) / LANCER·SHADE(Tier4) / BRUTE·BOMBER(Tier5) / SPLITTER·SENTINEL(Tier6) / PHANTOM·RAVAGER(Tier7) / JUGGERNAUT·WRAITH(Tier8) / ANCHOR·ELITE(Tier9) / TITAN·APEX(Tier10)
- **5종 보스** (`isBoss:true`, `weight:0`): OVERLORD(w5) / HIVEMOTHER(w10) / DREADNOUGHT(w15) / SPECTER_LORD(w20) / COLOSSUS(w25) → 이후 반복·강화
- **순차 스폰**: 상→하→좌→우 순서로 SPAWN_GROUP_SIZE마리씩, 방향 전환 시 SPAWN_GROUP_GAP 대기
- **보스 풀**: `bossProjs[150]` — 보스 전용 투사체 풀, 보스 사망 시 전부 비활성화

### `WeaponSystem.js` (IIFE, `window.WeaponSystem`)
- `init(ww, wh)`: 풀 초기화
- `update(dt, player, activeEnemies, clicked)`: 자동 타겟팅, 발사, 포탄(클릭), 보조 무기, 충돌
  - `clicked=true` → 포탄 발사 (CANNON_COOLDOWN 준수, 함선 방향, 스플래시 데미지)
- `addSecondary(type)`: 보조 무기 장착 (TetrisGrid._applyBonus에서 호출)
- `upgradeWeapon(key, value)`: 무기 스탯 변경
- `getWeaponStat(key)`: 현재 무기 스탯 읽기

### `Collision.js` (IIFE, `window.Collision`)
- `circleCircle(ax,ay,ar,bx,by,br)`: 기본 원-원 충돌
- `circleCircleWrapped(...)`: wraparound 대응 충돌
- `wrappedDistSq(...)`: wraparound 거리²
- `wrappedDelta(...)`: wraparound 방향 벡터

---

## 5. 상태머신 (Game 상태)

```
START ──[출발하기 클릭]──▶ PLAYING
PLAYING ──[ESC/P]──▶ PAUSED ──[ESC/P]──▶ PLAYING
PLAYING ──[레벨업]──▶ LEVELUP ──[카드 선택]──▶ PLAYING
PLAYING ──[Q키 + 보유 모듈]──▶ BUILDING ──[클릭 배치]──▶ PLAYING
PLAYING ──[HP=0]──▶ GAMEOVER ──[다시 시작]──▶ PLAYING
```

> **v0.4.0 변경**: 레벨업 시 항상 LEVELUP(업그레이드 카드). BUILDING은 Q키로 수동 진입.
> 모듈은 적 처치 시 15% 확률로 드랍되며, 📦 뱃지로 보유 수를 표시한다.

---

## 6. Wraparound 맵 처리

모든 엔티티는 매 업데이트마다 아래 래핑 공식을 적용한다:

```js
entity.x = ((entity.x % WORLD_W) + WORLD_W) % WORLD_W;
entity.y = ((entity.y % WORLD_H) + WORLD_H) % WORLD_H;
```

두 엔티티 간 거리·방향 계산은 반드시 `Collision.wrappedDelta()` / `wrappedDistSq()`를 사용한다.
`Player.worldToScreen()`도 wraparound 최단 경로를 기준으로 화면 좌표를 반환한다.

---

## 7. Object Pooling 패턴

성능을 위해 `new` 키워드는 초기화 시(`init()`)에만 사용한다.

```js
// 비활성 객체 꺼내기
function acquire(pool) {
  for (const obj of pool) {
    if (!obj.active) return obj;
  }
  return null; // 풀 소진
}
// 반납: obj.active = false; 만 하면 자동 재사용됨
```

---

## 8. 렌더링 파이프라인

```
Game.render()
  ├─ Renderer.clear()              // 검은 우주 배경
  ├─ Renderer.drawStars()          // 별 (화면 좌표, 고정)
  ├─ [ctx.save + scale(zoom)]      // 줌 transform 시작
  ├─ EnemyManager.draw()           // 잔해물·보스투사체·적·XP젬·모듈드랍
  ├─ WeaponSystem.draw()           // 투사체 + 궤도무기
  ├─ Game.drawParticles()          // 폭발 파티클
  ├─ player.draw(cx, cy)           // 플레이어 (항상 화면 중앙)
  ├─ [ctx.restore]                 // 줌 transform 종료
  ├─ Renderer.drawBossHpBar()      // 보스 체력바 (UI 공간, 보스 존재 시)
  └─ TetrisGrid.drawOnCanvas()     // BUILDING 상태 조립 UI (UI 공간)
```

모든 월드 엔티티는 `player.worldToScreen(wx, wy, WORLD_W, WORLD_H)`로
화면 좌표를 구한 뒤, 화면 바깥이면 렌더 스킵(frustum culling).

---

## 9. 업그레이드 시스템 (UPGRADE_POOL)

`Game.js` 내 `UPGRADE_POOL` 배열에서 관리. 연구원 4명 컨셉 반영.

| id | 연구원 | 이름 | 효과 |
|---|---|---|---|
| `song_firepower` | 송(전술) | 화력 증가 | `player.damageMult += 0.25` |
| `song_tactics` | 송(전술) | 전술 사격 | 사거리 +60, 쿨다운 ×0.9 |
| `gun_engine` | 건(공학) | 엔진 부스트 | `player.speedMult += 0.20` |
| `gun_rapid` | 건(공학) | 연사 강화 | `weapon.cooldown *= 0.8` |
| `hak_range` | 학(과학) | 사거리 확장 | `weapon.range += 80` |
| `hak_heal` | 학(과학) | 긴급 수리 | `player.hp += 30` |
| `jong_armor` | 종(군사) | 장갑 보강 | `maxHp += 50`, `armorReduction += 0.10` |
| `jong_bulkhead` | 종(군사) | 함체 증설 | `TetrisGrid.expandHullSlots(3)` |

### 함체 슬롯 시스템 (TetrisGrid.js v0.9.0)
- `maxHullSlots`: 초기 12슬롯, `expandHullSlots(n)` 으로 증설
- 슬롯 사용량 = 배치된 모듈 셀 수 합계 (CORE 제외)
- 슬롯 포화 시 빈 공간 배치 불가; 기존 모듈 클릭 → 제거(교체 1단계) → 재배치
- `[E]` 키 (조립 화면): 스크랩 15개 소모 → +3슬롯
- 조립 화면 3패널: **좌**=장착 모듈 목록(능력치) / **중**=그리드 / **우**=제공 모듈 카드

### 스크랩(Scrap) 자원 (v0.9.0)
- 일반 적 처치 시 1~3 scrap 획득, 보스 처치 시 20~30 scrap
- `player.scrap` 필드에 누적; HUD 우측에 🔩 표시
- 조립 화면 [E]키: 15 scrap → +3 함체 슬롯

### 장갑 감소 (armorReduction, v0.9.0)
- `player.armorReduction`: 0.0~0.75 (최대 75% 피해 감소)
- `takeDamage(dmg)`: `actualDmg = max(1, dmg × (1 - armor))`
- 종 업그레이드(`jong_armor`)로 +0.10씩 증가

---

## 10. 자주 나오는 버그 패턴

| 번호 | 현상 | 원인 | 해결 |
|---|---|---|---|
| A | 화면 경계에서 순간이동 | wraparound 후 속도 미리셋 | `_applyWrap()` 후에도 속도 유지가 정상 |
| B | 적이 플레이어와 같은 방향만 공격 | `wrappedDelta` 미사용 | `Collision.wrappedDelta` 로 방향 계산 |
| C | 레벨업 후 게임 안 재개됨 | `setState(PLAYING)` 미호출 | 업그레이드 카드 클릭 핸들러 확인 |

---

## 11. 수정 이력

| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-03-15 | v0.9.1 | 티어 크기 스케일링·피해 면역: 적 tier 필드 추가(1~10, 보스=11), 반경 = ENEMY_RADIUS × radiusMult × 1.2^(tier-1), 최고 활성 티어 기준 2 이상 낮은 티어 적 접촉 피해 면역 |
| 2026-03-15 | v0.9.0 | 시스템 개편: 스크랩(Scrap) 자원(일반 적 1~3·보스 20~30), 함체 슬롯 시스템(초기 12슬롯, 포화 시 교체 모드, [E]키 15scrap→+3슬롯), 장갑 감소(armorReduction 0~75%), 연구원 4명 체계(송-전술/건-공학/학-과학/종-군사), 종 업그레이드 2종(장갑보강·함체증설), 송 방어 업그레이드→전술 사격으로 교체, 조립 UI 3패널(좌=장착모듈·중=그리드·우=제공모듈), 게임 이름 "조난자들"→"AP3: 잔해의 귀환" |
| 2026-03-15 | v0.8.0 | 보스 시스템: 5의 배수 웨이브마다 5종 보스(OVERLORD·HIVEMOTHER·DREADNOUGHT·SPECTER_LORD·COLOSSUS) 순환 등장, 보스 전용 투사체 풀(MAX_BOSS_PROJS=150), 5종 공격 패턴(8/16방향 노바·부채꼴·회전포격·고속 스프레드·12방향 느린 포격), HP 50% 시 페이즈 2 전환, 보스 사망 시 모듈 3개 보장 드랍, Renderer에 5종 보스 draw 함수 + drawBossProjectile + drawBossHpBar 추가, 휴식 오버레이에 보스 웨이브 경고(⚠ 보스 웨이브 ⚠) 표시 |
| 2026-03-15 | v0.7.0 | 플레이 영역 16배(12800×7200), 20종 적 타입(Tier 1~10, minWave 기반 순차 등장), 방향별 순차 그룹 스폰(상→하→좌→우, 4마리씩 2초 대기), 배경 잔해물 1500개(잔해물 풀 draw), Renderer에 11개 신규 적 draw 함수 추가 |
| 2026-03-14 | v0.6.1 | 조립 UI R키 모듈 90° 회전(rotatePending), 기체 크기 따라 자동 줌 아웃(ZOOM_BASE=55, ZOOM_MIN=0.32), ctx 스케일 transform으로 전체 엔티티 줌 적용; 버그 수정 4건: 줌 후 적 스폰 위치 보정(EnemyManager.setZoom), 모듈 드랍 수집 반지름 기체 크기 연동(hitboxRadius+10), 궤도 무기 공전 반지름 기체 크기 연동(hitboxRadius+15), 줌 아웃 시 화면 가장자리 빈 공간 버그(draw 컬링 마진 cullX/cullY = W·H÷zoom÷2 로 역줌 배율 연동) |
| 2026-03-13 | v0.6.0 | 웨이브 킬 목표 시스템(KILL_BASE+KILL_PER_WAVE), 물리 모듈 드랍(ModuleDrop 풀), 10종 무기 모듈(WPN_GATLING·SPREAD·SNIPER·MISSILE·FLAK·ORBIT·LASER·MINE·CHAIN·NOVA), WeaponSystem 보조 무기 시스템(호밍·체인·궤도·기뢰 등), 웨이브 휴식 오버레이 |
| 2026-03-13 | v0.5.0 | 선체 다각형 히트박스(삼각형 분할+모듈 셀 직사각형), 10종 적 타입(RAIDER·JUGGERNAUT·SWARM·LANCER·ANCHOR·ZIGZAGGER·DASHER·SHADE·BOMBER·SPLITTER), 타입별 AI(지그재그·돌진·분열), Collision.js에 polyCircle/polyCircleWrapped 추가 |
| 2026-03-13 | v0.4.0 | 수정 5건: XP 젬 흡수거리·속도 증가(120→200, 200→320), 적 처치 15% 모듈 드랍, Q키 조립화면 수동 진입, 레벨업→항상 업그레이드 카드, 마우스 클릭 포탄(범위공격) 추가 |
| 2026-03-13 | v0.3.0 | Phase 3: TetrisGrid.js 신규 — 7종 테트리스 모듈 조립, 캔버스 기반 BUILDING UI, hitboxRadius 동적 재계산, 짝수 레벨 조립·홀수 레벨 업그레이드 라우팅 |
| 2026-03-13 | v0.2.1 | 버그 수정: 별 배경 시차 스크롤 추가 (layer 0/1 시차 계수 0.12/0.38), 플레이어 drag 0.88→0.96 (실효 최대속도 72→217 px/s), 적 기본속도 80→58 px/s |
| 2026-03-13 | v0.2.0 | Phase 1+2 구현: 엔진 코어, WASD 이동, Wraparound, 자동 무기, 오브젝트 풀, 적 AI, XP 시스템, 레벨업 팝업 |
| 2026-03-13 | -      | 기존 개미 식민지 시뮬레이터 → `archive/antcolony/` 이동 |
