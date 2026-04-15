# GUIDE.md — AP3: 잔해의 귀환 개발자 가이드
> 버전: v1.8.0
> 최종 갱신: 2026-04-16

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
        ├── config.js            ← v1.2.0 신규 — 환경 위험 수치
        ├── Game.js
        ├── SynergySystem.js    ← NUKE 속성·시너지 추가
        ├── StageManager.js      ← v1.2.0 신규 — 스테이지 시스템
        ├── WeaponCombine.js     ← v1.2.0 신규 — 무기 조합 레시피
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
- 시너지 HUD 렌더 (`_drawSynergyHUD`) — 활성 속성 슬롯·시너지·총 배율 표시
- **진입점**: `window.addEventListener('DOMContentLoaded', init)`

### `SynergySystem.js` (전역 `window.SynergySystem`) — Phase 4
- `addWeaponAttr(attr)`: 무기 장착 시 속성 등록 (TetrisGrid._applyBonus에서 호출)
- `removeWeaponAttr(attr)`: 무기 해제 시 속성 제거 (TetrisGrid._removeBonus에서 호출)
- `getDamageMult()`: 현재 장착 무기 속성 조합 기반 데미지 배율 반환 (WeaponSystem에서 호출)
- `getActiveEffects()`: HUD용 활성 시너지 목록 `[{name, mult, color}]` 반환
- `getAttrCounts()`: 현재 속성별 장착 수 반환 (HUD 아이콘 표시용)
- `reset()`: 게임 재시작 시 속성 카운트 초기화
- **속성 할당**: KINETIC(개틀링/플랙/산탄/기뢰/레일건/태풍포), FIRE(유도탄/노바/플라즈마/오메가), LASER(레이저/저격포), ELECTRIC(궤도포/연쇄탄/소멸자)
- **시너지 테이블**: FIRE+FIRE=×1.5, ELECTRIC+FIRE=×1.6, ELECTRIC+LASER=×1.7, FIRE+LASER=×1.45, KINETIC+KINETIC=×1.3 등 10종

### `TetrisGrid.js` (IIFE, `window.TetrisGrid`)
- `init()`: 그리드·큐 초기화, 코어(0,0) 배치
- `queueRandomModule()`: 랜덤 모듈을 대기 큐에 추가 (EnemyManager 드랍 시 호출)
- `nextModule()`: 큐에서 다음 모듈을 꺼내 pending으로 설정 (Q키 시 호출)
- `hasQueued()`: 큐 또는 pending에 모듈이 있으면 true
- `getQueueSize()`: HUD 뱃지용 총 대기 모듈 수
- `handleClick(sx,sy,cx,cy,player)`: 클릭→그리드 좌표 변환→배치 시도
- `unequipModule(gx,gy,player)`: 그리드 (gx,gy) 모듈을 해제해 큐 맨 앞으로 돌려줌, 보너스 역적용 — [X]키
- `scrapPending()`: 현재 pending 모듈 파괴 → 티어별 스크랩 반환(COMMON5/RARE15/EPIC30/LEGENDARY60) — [X]키
- `recalcHitbox(player)`: 부착 모듈 기반 `player.hitboxRadius` 재계산
- `drawOnCanvas(ctx,cx,cy,mouseX,mouseY,player)`: BUILDING 상태 조립 UI 렌더 (3패널)
- `drawShipModules(ctx,cx,cy,angle)`: 게임플레이 중 모듈 렌더 (회전 적용)
- `randomModuleKey()`: 랜덤 모듈 키 반환 (EnemyManager ModuleDrop 생성 시 호출)
- `queueModule(typeKey)`: 특정 모듈을 대기 큐에 추가 (ModuleDrop 수집 시 호출)
- `expandHullSlots(n)`: 함체 슬롯 증설 (+n)
- `getUsedSlots()` / `getMaxSlots()` / `getExpandCost()` / `getExpandAmount()`: 슬롯 정보
- **모듈 32종**: HULL_1/2/3, GUN_1/2, THRUSTER/2, WING_L/R/HEAVY, REACTOR, SHIELD_CELL, REINFORCED_HULL, TWIN_GUN, OVERCLOCK, FURY_CORE, TITAN_HULL + WPN_GATLING/FLAK/LASER/SPREAD/MISSILE/ORBIT/MINE/SNIPER/CHAIN/NOVA/PLASMA/RAILGUN/TYPHOON/ANNIHILATOR/OMEGA (각 무기에 weaponAttr 포함)

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
- `damageEnemy(enemy, dmg, attr)`: 데미지 적용 (속성 있으면 weak×1.5/resist×0.6 적용) + 파괴 시 젬·ModuleDrop 드랍, 분열(SPLITTER→SWARM×3, SENTINEL→GRUNT×2, TITAN→BRUTE×2)
- `getActiveEnemies()`: 활성 적 배열 반환
- `getStats()`: `{waveNumber, totalKills, waveKills, waveKillTarget, restTimer, isResting}`
- `getBoss()`: 현재 활성 보스 참조 반환 (없으면 null)
- **20종 일반 적** (각 `weak`/`resist` 속성 포함): DRONE·RUSHER(Tier1) / SWARM·ZIGZAGGER(Tier2) / GRUNT·DASHER(Tier3) / LANCER·SHADE(Tier4) / BRUTE·BOMBER(Tier5) / SPLITTER·SENTINEL(Tier6) / PHANTOM·RAVAGER(Tier7) / JUGGERNAUT·WRAITH(Tier8) / ANCHOR·ELITE(Tier9) / TITAN·APEX(Tier10)
- **5종 보스** (`isBoss:true`, `weight:0`, `weak`/`resist` 포함): OVERLORD(w5,🔥) / HIVEMOTHER(w10,🔥) / DREADNOUGHT(w15,⚡) / SPECTER_LORD(w20,💜) / COLOSSUS(w25,💜) → 이후 반복·강화
- **순차 스폰**: 상→하→좌→우 순서로 SPAWN_GROUP_SIZE마리씩, 방향 전환 시 SPAWN_GROUP_GAP 대기
- **보스 풀**: `bossProjs[150]` — 보스 전용 투사체 풀, 보스 사망 시 전부 비활성화

### `WeaponSystem.js` (IIFE, `window.WeaponSystem`)
- `init(ww, wh)`: 풀 초기화
- `update(dt, player, activeEnemies, clicked)`: 자동 타겟팅, 발사, 포탄(클릭), 보조 무기, 충돌
  - `clicked=true` → 포탄 발사 (CANNON_COOLDOWN 준수, 함선 방향, 스플래시 데미지)
- `addSecondary(type, attr)`: 보조 무기 장착 (TetrisGrid._applyBonus에서 호출, attr 저장으로 투사체에 속성 전달)
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
| 2026-04-16 | v1.8.0 | **Phase B-5 HUD 시각화 (9조합 shape 시너지 가시화)**: Phase B 에서 7개 비수치 훅까지 실구현 완료(B-3a/B-3b-1/B-3b-2) 했지만 플레이어가 "지금 내가 어떤 shape 시너지로 싸우고 있는지" 를 HUD 로 즉시 확인할 수단이 없었다 — 효과 이름과 ×배율만 보이고 어느 무기 조합이 트리거했는지 판단이 어려움. **SynergySystem** 에 `SHAPE_ICONS = { LINE:'━', L:'∟', BLOCK:'■' }` 상수 + 공개 export 추가 (유니코드 박스 드로잉 · 이모지 아님 → 12px monospace 에서 크기 일관). **Game.js `_drawSynergyHUD`** 리팩토링: (1) 기존 속성 카운트 라인(`🔥×2 ⚡×1`) 아래에 **모양 분포 라인** `━×n ∟×n ■×n` 삽입 (색 `#64748b` — 속성 라인 `#94a3b8` 보다 한 단계 흐리게 하여 시각적 계층 분리). (2) 활성 시너지 목록 루프에서 `ef.key.indexOf(':') >= 0` 분기로 shape 시너지만 **뱃지 prefix** `🔥∟ 화염 포위 ×1.20` 형식 렌더 — attr-pair 시너지(`FIRE+FIRE`)는 뱃지 없이 기존 포맷 유지. 두 라인 모두 `SynergySystem.getShapeCounts()` 와 `ATTR_ICONS`/`SHAPE_ICONS` 만 참조 → shape 로직은 전부 SynergySystem 내부, HUD 는 포맷팅만 담당. 모양 분포 계산은 `shapeAgg = { LINE, L, BLOCK }` 으로 속성 축을 축약 — 9조합 중 어떤 attr 이든 같은 모양이면 한 셀에 누적(플레이어가 "L자 무기가 많다" 를 한눈에 인식). `SynergySystem.SHAPE_ICONS` 가 없으면 fallback 으로 shape 이름 원문(`LINE`/`L`/`BLOCK`) 표시(테스트 · 구버전 인접 호환). smoke 14→16 green: **#12** `SHAPE_ICONS` 런타임 export 계약 (LINE/L/BLOCK 세 키 모두 비빈 문자열) + **#13** `Game.js` 소스에 `SHAPE_ICONS` 참조 · `getShapeCounts()` 호출 · `ef.key` 의 `':'` 분기 세 정규식 regression guard. Phase B 잔여 B-4 는 순수 플레이테스트 밸런싱(코드 변경 없음). |
| 2026-04-15 | v1.7.0 | **Phase B-3b-2 반사 DoT + 피격 반사 (FIRE:BLOCK · LASER:L)**: 피격 경로 shape 시너지 2종 구현 — Phase B 초기 설계의 마지막 비수치 훅. **EnemyManager**: 적 `burnTimer`/`burnDps` 필드 + `createEnemy`/`_initEnemy`/`spawnBoss` 에 초기화. update 루프 최상단에 DoT 틱 삽입 (AI/스턴 판정 전, 보스 포함 모든 적 대상) — `tickDmg = burnDps * dt`, `damageEnemy(e, tickDmg, 'FIRE')`, DoT 로 사망 시 `continue` 로 이 프레임 AI 스킵. 신규 API `EnemyManager.applyBurn(e, dur, dps)` — duration/dps 각각 `Math.max(prev, new)` 덮어쓰기(약한 소스로 축소 없음), 보스 허용(CC 가 아닌 단순 데미지 → 밸런스 영향 제한), invalid 인자 noop. **TetrisGrid.hitShip** 시그니처에 5번째 `attacker` 인자 추가 — `invincibleTime` 가드 직후, 모듈 판정 전에 `SynergySystem.getShapeCounts()` 조회하여 FIRE:BLOCK 이면 `EnemyManager.applyBurn(attacker, 2.0, 3)`, LASER:L 이면 `EnemyManager.damageEnemy(attacker, dmg * 0.5, 'LASER')`. `attacker.active === false` 이거나 `null` 이면 skip (보스 투사체가 보스 사후 도착한 경우 등). **EnemyManager** 의 2개 hitShip 호출 업데이트 — 직접 접촉(line 556)은 `e`, 보스 투사체(line 581)은 `bossEnemy` (null 가능). **SynergySystem** `FIRE:BLOCK` desc: `'데미지 +18% · 피격 시 공격자에 2.0s·3dps 화염 DoT'`, `LASER:L`: `'데미지 +15% · 피격 시 받은 피해 50% 공격자에게 즉시 반사'`. `CLAUDE.md` §4.1 에서 B-3b-2 를 ✅ 로 이동, B-4 노트에 B-5 HUD 이관 언급 추가. smoke 12→14 green: **#10** `applyBurn` 런타임 계약 (max 덮어쓰기, 보스 허용, invalid 인자) + **#11** `TetrisGrid.js` 소스에 `FIRE:BLOCK`→`applyBurn` / `LASER:L`→`damageEnemy` / `hitShip(..., attacker, ...)` 세 정규식 regression guard. Phase B 전체 목록(9 shape 시너지) 의 7개 훅 모두 실구현 완료. |
| 2026-04-15 | v1.6.0 | **Phase B-3b-1 EMP 펄스 (ELECTRIC:BLOCK)**: `EnemyManager.js` 에 적 `stunTimer` 필드 + `update` 루프 내 AI 스킵 분기 추가 (보스 방어용 `!e.isBoss && e.stunTimer > 0` 가드 — 스턴 상태에서는 `vx=vy=0` 고정 + `stunTimer -= dt`, 충돌/분리 로직은 계속 작동). `_initEnemy` · `spawnBoss` · `createEnemy` 에 `stunTimer=0` 초기화. 신규 공개 API: `EnemyManager.stunEnemy(enemy, duration)` — (1) `isBoss=true` 면 즉시 noop(보스 면역), (2) `enemy.stunTimer < duration` 일 때만 갱신 → 짧은 펄스가 긴 스턴을 축소하거나 뒤이은 호출로 무한연장되지 않음, (3) `null`/비활성/`duration<=0` 모두 noop. `WeaponSystem.js`: `createProjectile` 에 `stunDuration: 0` 기본 필드 추가, `_applyShapeHooks` 가 `counts['ELECTRIC:BLOCK']` 일 때 `p.stunDuration = 0.8` 로 세팅(아닐 땐 명시적 0 리셋 — 풀 재사용 시 stale 방지). `_chainHit` 시그니처에 `stunDur` 파라미터 추가해 체인도 EMP 전파. 피격 시 stun 호출 4경로: (a) cannon 스플래시 루프 — 스플래시 범위 내 모든 적에게, (b) auto 탄 피격 후, (c) `_chainHit` 내부 재귀, (d) `orbit`/`radiator` 직접 데미지 경로 — `sc['ELECTRIC:BLOCK']` 있으면 고정 0.8s. `SynergySystem.js` `ELECTRIC:BLOCK` desc 업데이트: `'데미지 +22% · 피격 적 0.8s EMP 기절'`. `CLAUDE.md` §4.1 B-3b 를 B-3b-1(✅)/B-3b-2(🔜 반사 DoT + 피격 반사) 로 분리. smoke 10→12 green: **#8** `EnemyManager.stunEnemy` 런타임 검증 (일반 적 max 덮어쓰기, 보스 면역, 잘못된 인자 noop) + **#9** `WeaponSystem` 내 `EnemyManager.stunEnemy(...)` 호출 ≥4 regression guard. |
| 2026-04-15 | v1.5.0 | **Phase B-3a Shape Synergy 비수치 훅 4종**: `WeaponSystem.js` 에 `_applyShapeHooks(p)` 헬퍼 신설 — `SynergySystem.getShapeCounts()` 조회 후 탄(projectile) 에 훅 주입. **LASER:LINE** → `p.pierceLeft += 2` (railgun 기본 3 과 누적 → 최대 5관통). **ELECTRIC:LINE** → `p.chainCount += 1` (chain3 = 3, chain5 = 6, 일반탄 = 1). **FIRE:L** → `p.splashR *= 1.3` (splashR>0 인 포탄·지뢰·핵탄두만. spread/nova/homing 등은 변화 없음). **ELECTRIC:L** → 25% 확률 `p.damage *= 2.0` + `p.isCrit = true` 플래그 (HUD/이펙트용 예약, 탄 단위 스토캐스틱이라 `getDamageMult` 와 별개). 호출 지점: `fireCannon` + `fire` + `_fireSecondary` 의 15개 fire-branch (single/multi3/spread5/spread7/homing/flak8/mine/chain3/chain5/railgun/nova12/nova24/multi5/nova8/nuke_shell) = 17곳. `orbit`/`radiator` 는 탄을 쓰지 않아 crit 롤만 직접 데미지 계산 시 적용. `SHAPE_SYNERGY_TABLE` desc 문구 정리 (4개 훅은 실구현으로, 나머지 3개는 `B-3b` 라벨로 이관). smoke 8→10 green (`_applyShapeHooks` 런타임 검증 + 호출 지점 ≥17 regression guard) |
| 2026-04-15 | v1.4.0 | **Phase B-1/B-2 Shape Synergy 도입**: 테트리스 배치 "모양" 축을 시너지 계산에 추가. **B-1** — `tetris/defs.js` 내부에 `classifyShape(cells)` 추가, 모든 `MODULE_DEFS` 엔트리에 `shape` 필드 자동 주입 (DOT/LINE/L/BLOCK/OTHER 5분류). 1셀=DOT, 동일 행/열=LINE, 2×2=BLOCK, 3셀 꺾임=L, 그 외(T/Z 등)=OTHER. `window.TetrisDefs.classifyShape` 로 노출. **B-2** — `SynergySystem.js` 에 `SHAPE_SYNERGY_TABLE` (9조합 = FIRE/ELECTRIC/LASER × LINE/L/BLOCK, mult 1.15~1.30, 이름·색·desc 포함) · `_shapeCounts` · `addShapeAttr(attr, shape)` / `removeShapeAttr(attr, shape)` 추가. `getDamageMult` 가 속성 쌍 시너지 이후 shape 시너지도 **곱**으로 누적, `getActiveEffects` HUD 목록에도 포함. `reset` 이 `_shapeCounts` 도 초기화. `TetrisGrid.js` 의 `_applyBonus/_removeBonus` 시그니처에 `moduleType` 파라미터 추가 — 무기 장착 시 `MODULE_DEFS[type].shape` 조회하여 `SynergySystem.addShapeAttr(bonus.weaponAttr(s), shape)` 자동 등록/해제. 잘못된 키(KINETIC/NUKE/DOT/OTHER) 는 테이블 검사로 걸러 무시. 비수치 훅(관통·연쇄·크리·반사) 은 Phase B-3 로 분리 — 현재는 측정 가능한 damage 배율 한 축에만 효과 반영. smoke 6→8 green (`defs.js` 런타임 shape 주입 검증 + `SynergySystem` 9조합 배율 곱/역적용 검증) |
| 2026-04-15 | v1.3.0 | **P0-2 완료**: `TetrisGrid.js` god-object(1,860 LOC) → `tetris/` 하위 3개 모듈 + TetrisGrid facade 분할 (stage 1~6, −59.0%). `tetris/defs.js` (129 LOC, 상수·카탈로그)·`tetris/icons.js` (293 LOC, 드로잉 헬퍼 5종)·`tetris/render.js` (806 LOC, 드로잉 함수 5종: `drawShipModules`·`drawOnCanvas`·`drawInstalledPanel`·`drawModulePanel`·`drawInventory`). 렌더 모듈은 state-as-parameter 패턴 채택 — 호출 시마다 state 번들을 전달받아 내부에 가변 상태를 보관하지 않음. `TetrisGrid.js` 는 762 LOC facade 로 축소되어 game loop·mutation·facade wrapper 만 유지. `index.html` 스크립트 로드 순서: `version.js → defs → icons → render → TetrisGrid`. 스모크 테스트를 파일별 LOC 캡(4개 파일)으로 확장. 공개 API·게임플레이 변경 없음. smoke 3→6 green. 커밋 체인: e1521d1 (s1) · a35c856 (s2) · 3e7fa52 (s3) · ef4908e (s4) · d09827c (s5) · e8d5d07 (s6) |
| 2026-04-14 | v1.2.3 | P0-4b 완료: 버전 상수 단일 소스 마이그레이션. `index.html` 에 `js/version.js` 로드 태그 추가(config.js 보다 앞). `Game.js:12` 의 `const VERSION` 제거, `version-display` 갱신 로직이 `window.JNJD_VERSION` 참조. `version.js` 주석에서 레거시 호환 문구 삭제. `tests/smoke.test.js` 2번 케이스를 `version.js` 내 `window.JNJD_VERSION` 존재 + `Game.js` 내 `const VERSION` 잔여 없음 검증으로 재작성. CLAUDE.md §2.1 갱신. `package.json` version bump. 스모크 3/3 green. 선행 커밋으로 `.gitattributes` 추가 (CRLF↔LF 불일치 해소) |
| 2026-03-16 | v1.2.1 | 플레이어 함선 비주얼 전면 개편: Renderer.drawPlayer → 원형 UFO 디스크 디자인(타원 본체·반투명 돔·상하 해치 패널), 포탑(마우스 방향 회전), 추진체 불꽃(이동 방향 반대쪽 분출·3중 젯). Player.draw에 vx/vy 전달, getHitPolygons 8각형 근사로 변경. drawProjectile·drawCannonball 방향각 파라미터 추가(길쭉한 총알/포탄 모양). drawExplosionFlash 신규(팽창 플래시+핵심+링). WeaponSystem _hitEvents+consumeHitEvents() 추가(피격 이벤트 전달). Game.js spawnExplosion 신규(타입/속성별 플래시+불꽃 파편+연기 구름: cannon·NUKE·FIRE·ELECTRIC·LASER·KINETIC 분기). 피격 이벤트→폭발 이펙트 실시간 연결 |
| 2026-03-16 | v1.2.0 | 스테이지 시스템(5스테이지 순환, 보스 처치=클리어, 스크랩+80/모듈+2 보상), 환경 위험(METEORS·CRYO·HEAT·RADIATION), StageManager.js 신규, WeaponCombine.js 신규(8 레시피), NUKE 속성 추가(SynergySystem 5 시너지 + EnemyManager 보스 weak/resist 갱신), 무기 타입(FIREARM/ENERGY/CONVENTIONAL) 분류 + weaponType 필드, 조합 전용 무기 8종(WPN_ION_BLAST 등) + NUKE 기본 무기 2종(WPN_NUKE_SHELL·WPN_RADIATOR_BASE), WeaponSystem setCooldownMult·multi5·nova8·nuke_shell·radiator fire 타입 추가, Player.armorHazardMult + takeDamageEnv 추가, Game.js STATE.STAGE_CLEAR·STATE.CRAFTING 추가·_drawCraftingUI·_drawStageClearOverlay·_drawStageHUD 신규, config.js 신규, InputHandler C키 추가, 튜토리얼 스테이지·무기조합 탭 신규 |
| 2026-03-16 | v1.1.0 | 적 타입별 속성 저항/약점 시스템: ENEMY_TYPES 전 25종에 weak/resist 배열 추가(약점×1.5/저항×0.6), damageEnemy(enemy,dmg,attr)로 확장, WeaponSystem 보조 무기 addSecondary(type,attr) attr 저장·_fireSecondary 전 발사 유형 p.attr 전달, orbit·chain 직접 데미지에도 sec.attr 전달. 조립창 우측 패널 프리뷰 카드 하단에 속성 뱃지(🔥⚡💜🔩) 표시. 튜토리얼 "속성 시너지" 탭 신규·조작법 X키 항목 추가. PLAN.md(개미게임 잔재) 삭제 |
| 2026-03-16 | v1.0.2 | 속성 강화 모듈 8종 추가: 단일(RARE·2셀) FIRE_CORE/ELECTRIC_COIL/LASER_PRISM/KINETIC_MASS, 이중(EPIC·2~3셀) PLASMA_CONDUIT/ION_CIRCUIT/IGNITION_MASS, 삼중(LEGENDARY·4셀) RESONANCE_CORE. _applyBonus·_removeBonus에 weaponAttrs 배열 처리 추가. 장착·해제 시 SynergySystem 속성 카운트 자동 갱신 |
| 2026-03-16 | v1.0.1 | 시너지 시스템 재설계: 레벨업 속성 코어 카드 → 무기 모듈 장착 자동 속성 등록 방식으로 전환. 무기 15종에 weaponAttr 추가(KINETIC/FIRE/LASER/ELECTRIC), _applyBonus에서 SynergySystem.addWeaponAttr 호출, _removeBonus 신규(보너스 역적용+WeaponSystem.removeSecondary+SynergySystem.removeWeaponAttr), unequipModule 신규([X]키: 그리드 모듈→큐 반환), scrapPending 신규([X]키: 대기모듈 파괴→스크랩 획득), InputHandler에 X키 consumeScrap 추가, 시너지 HUD 속성카운트 표시로 갱신 |
| 2026-03-16 | v1.0.0 | Phase 4: 속성 시너지 시스템 — SynergySystem.js 신규(5속성 슬롯·12종 시너지/상쇄 테이블·getDamageMult·getActiveEffects), 레벨업 UPGRADE_POOL에 속성 코어 카드 5종 추가(FIRE/LASER/ELECTRIC/KINETIC/WATER), WeaponSystem 전체 투사체 데미지에 시너지 배율 적용, 캔버스 우측 시너지 HUD(_drawSynergyHUD: 슬롯 아이콘·활성 시너지명·총 배율), 재시작 시 SynergySystem.reset() 호출 |
| 2026-03-15 | v0.9.8 | 시작화면 우하단 버전 표시(version-display, Game.js init에서 동적 세팅), 조립 화면 W/S 키로 대기 모듈 선택(cyclePending/pendingSelectIdx, 큐에서 shift 제거→배치 시 splice), 우측 패널 상단 형태 프리뷰 카드(5×5 미니그리드+W/S 내비게이션 힌트) 복원, TetrisGrid.setZoom으로 drawShipModules 셀 크기 줌 역보정(EC=CELL/zoom, 화면상 고정 22px) |
| 2026-03-15 | v0.9.7 | 시작 화면에 "게임 방법" 버튼 추가, 튜토리얼 오버레이(목표·조작·HP체계·모듈조립·등급·업그레이드·웨이브 7섹션, 스크롤 가능), btn-secondary 스타일 추가 |
| 2026-03-15 | v0.9.6 | Q키 대기 모듈 없어도 조립 화면 열기(재배치 전용), 우측 패널 모듈 인벤토리 재설계(배치 대기+장착 완료 통합 목록, 티어·HP바·설명 표시), hasPending() 추가 |
| 2026-03-15 | v0.9.5 | 조립 UI 모듈 드래그&드롭 이동(tryStartDrag/endDrag/_placePreserved), mouseHeld·mouseReleased 입력 추가, 드래그 원위치 점선 테두리 시각 피드백, HP·보너스 보존 |
| 2026-03-15 | v0.9.4 | 스크랩 반감(보스 10-15/일반 0-1), 티어 확률 조정(COMMON 72/RARE 20/EPIC 6/LEGENDARY 2), 코어HP=10 고정(업그레이드 불가), 장갑판 개별 내구도 시스템(hitShip 방향성 피격), 비장갑 모듈 즉시 파괴, 인벤토리 HP 바+장착 완료 내구도 표시, 피격 셀 플래시 이펙트 |
| 2026-03-15 | v0.9.3 | 모듈 인벤토리 UI(I키 토글, 대기중·장착완료 2섹션, 30종 캔버스 아이콘), 슬롯 증설 비용 15→150 Scrap, 인벤토리 닫기: ESC/I/BUILDING전환 연동 |
| 2026-03-15 | v0.9.2 | 모듈 등급 시스템(COMMON 50%/RARE 30%/EPIC 15%/LEGENDARY 5% 가중치 드랍), 구조 모듈 8→15종·무기 모듈 10→15종 확장(태풍포·소멸자·오메가포·플라즈마포·레일건), 레일건 관통 메카닉(pierceLeft), 웨이브 카운트다운 풀스크린→상단 소형 HUD로 변경 |
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
