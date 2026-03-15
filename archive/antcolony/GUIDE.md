# 개미 군락 시뮬레이터 — 코드 가이드라인

> **버전**: `VERSION` 상수(`main.js:3`)를 기준으로 관리
> 코드가 꼬이거나 에러가 발생했을 때 이 문서를 먼저 참고할 것.

---

## 목차

1. [파일 구조](#1-파일-구조)
2. [핵심 데이터 흐름](#2-핵심-데이터-흐름)
3. [설정값 (CFG)](#3-설정값-cfg)
4. [클래스 & 모듈 지도](#4-클래스--모듈-지도)
5. [개미 상태머신 (FSM)](#5-개미-상태머신-fsm)
6. [페로몬 시스템](#6-페로몬-시스템)
7. [전투 시스템](#7-전투-시스템)
8. [식민지 경제 (ColonyManager)](#8-식민지-경제-colonymanager)
9. [렌더링 파이프라인](#9-렌더링-파이프라인)
10. [자주 나오는 버그 패턴](#10-자주-나오는-버그-패턴)
11. [수정 이력](#11-수정-이력)

---

## 1. 파일 구조

```
TEST/
├── index.html   — UI 레이아웃, 도움말 모달, 업그레이드 패널, 스크립트 로드
├── style.css    — 전체 스타일 (캔버스, 패널, 버튼 등)
├── config.js    — 게임 수치 설정 파일 (직접 편집용) ★
├── colony.js    — ColonyManager 클래스 (식민지 경제·업그레이드·DOM 바인딩)
├── main.js      — 나머지 모든 로직 (게임 루프, 개미 AI, 렌더링 등)
├── CLAUDE.md    — Claude Code 작업 지침 (수정 규칙)
└── GUIDE.md     — 이 파일
```

### 스크립트 로드 순서 (index.html 하단)

```html
<script src="config.js"></script>   <!-- 1순서: 수치 설정 -->
<script src="colony.js"></script>   <!-- 2순서 -->
<script src="main.js"></script>     <!-- 3순서 -->
<script> ... 인라인 초기화 ... </script>
```

> **주의**: `config.js` → `colony.js` → `main.js` 순서를 반드시 지켜야 한다.
> `config.js`의 `GAME_CONFIG`가 `main.js`의 CFG에 병합되기 때문에 먼저 로드되어야 함.

### 수치 조정 방법

게임 밸런스를 바꾸고 싶을 때는 **`config.js`만 수정**한다.
`main.js`의 CFG 기본값은 건드리지 않는다.

```js
// config.js 예시
const GAME_CONFIG = {
  ANT_COUNT: 150,      // 시작 개미 수를 150으로
  COST_SOLDIER: 8,     // 병사 비용을 8로
};
```

`GAME_CONFIG`에 없는 항목은 `main.js`의 CFG 기본값이 그대로 사용된다.

---

## 2. 핵심 데이터 흐름

```
[index.html] DOM 준비
       │
       ▼
[main.js] new Game()
       │
       ├─ PheromoneGrid 생성
       ├─ Queen 생성  ──────────────────────────────────────── 플레이어 기지
       ├─ EnemyNest 생성  ──────────────────────────────────── 적 기지
       ├─ ColonyManager 생성  ──────────────────────────────── 플레이어 경제
       ├─ RedColonyManager 생성  ───────────────────────────── 적 AI 경제
       ├─ Ant[] 생성 (black faction)
       ├─ Ant[] 생성 (red faction)
       └─ requestAnimationFrame → _loop()
                │
                ├─ _update(dt)
                │      ├─ 카메라 이동
                │      ├─ 브러시 페로몬 페인팅
                │      ├─ PheromoneGrid.update() — 감쇠·확산
                │      ├─ 개미 FSM update() × N
                │      ├─ ColonyManager.tick() — 알→부화→배치
                │      └─ 전투 처리 (_resolveCombat 등)
                │
                └─ _render()
                       ├─ ctx.translate(-cam.x, 0)  ← 월드 공간
                       │      페로몬, 장애물, 먹이, 개미 ...
                       │      _renderBrush() — 브러시 원
                       │      ctx.resetTransform() ← 스크린 공간
                       │      크로스헤어 그리기
                       └─ _renderHUD() — 통계판, 미니맵
```

---

## 3. 설정값 (CFG)

`main.js:8` ~ `main.js:132`에 **모든 수치 상수**가 `CFG` 객체에 집중되어 있다.
동작을 조정할 때는 반드시 여기서만 수정한다.

### 주요 카테고리별 위치

| 카테고리 | 라인 | 주요 키 |
|---|---|---|
| 개미 물리 | 9–16 | `ANT_SPEED`, `ANT_JITTER`, `ANT_TURN`, `LIFESPAN_BASE` |
| 페로몬 그리드 | 18–23 | `CELL`(셀 크기 6px), `DECAY`, `DIFF_RATE`, `MAX_PH` |
| 증착량 | 25–29 | `DEP_HOME_WALK`, `DEP_FOOD_RET`(170), `BRUSH_STR` |
| 센서 | 31–33 | `SENS_DIST`(26), `SENS_ANG`(π/4) |
| 개미귀신 함정 | 39–46 | `PIT_COUNT`, `PIT_R`, `PIT_SUCTION` |
| 먹이 | 48–55 | `FOOD_COUNT`, `FOOD_PELLETS`, `FOOD_R`(20px) |
| 브러시 | 57–63 | `BRUSH_R`(34), `ENERGY_COST`(10/s) |
| 전투 | 65–83 | `COMBAT_RANGE`(14), `HP_BLACK`(3), `DMG_RED`(1) |
| 병과 시스템 | 85–106 | HP·데미지·속도 배율·비용·산성 개미 수치 |
| 월드 크기 | 108–116 | `WORLD_MULT`(2), `CAM_SPEED`(400) |
| 장애물 | 118–125 | `ROCK_COUNT`(18), `BRANCH_COUNT`(15) |
| ACO 가중치 | 126–131 | `ACO_GRAVITY`(0.2), `ACO_PHEROMONE`(0.8) |
| **개미 무작위성** | 133–135 | `CMD_IGNORE_PROB`(0.15), `DISTRACT_PROB`(0.05) |
| **사령관** | config.js | `HP_COMMANDER`(20), `DMG_COMMANDER`(2), `SPEED_COMMANDER`(0.90), `COST_COMMANDER`(25), `COMMANDER_MAX`(3), `COMMANDER_AURA_R`(120), `COMMANDER_AURA_MULT`(1.3), `COMMANDER_AURA_DMG`(1), `COMMANDER_SCAN`(200), `COMMANDER_HQ_COST`(80) |
| **Phase 10: 협동 운반** | config.js | `DRAG_MASS_PER_PELLET`(0.8), `DRAG_BASE_MASS`(2.0), `DRAG_CARCASS_MASS`(6.0), `DRAG_FORCE_PER_ANT`(28), `DRAG_COEFF`(3.5), `DRAG_MAX_SPEED`(22), `ATTACH_R`(14), `ATTACH_MIN_ANTS`(1), `ATTACH_REQUIRED_MULT`(0.55), `ATTACHED_SPEED_MULT`(0.55), `ATTACHED_MAX_DIST`(20), `ATTACH_PHEROMONE_R`(30), `ATTACH_PHEROMONE_STR`(120) |

---

## 4. 클래스 & 모듈 지도

### main.js 클래스 목록

| 클래스 | 라인 | 역할 |
|---|---|---|
| `SpriteCache` | 151 | 개미 스프라이트 사전 렌더링 (14슬롯, 12-13: 사령관) |
| `SpatialHash` | 275 | 전투용 근접 쿼리 자료구조 |
| `PheromoneGrid` | 300 | 6채널 페로몬 행렬 (감쇠·확산·렌더) |
| `Particle` | 442 | 사망 파티클 |
| `Projectile` | 466 | 산성 개미 발사체 |
| `AcidPool` | 498 | 발사체 충돌 후 AoE 풀 (DoT) |
| `Rock` | 534 | 원형 장애물 |
| `Branch` | 588 | 캡슐형(선분+반지름) 장애물 |
| `DraggableObject` | 707 | **Phase 10** 협동 운반 물리 기반 클래스 (vx/vy 적분, tryAttach/detach, requiredAnts) |
| `Food` | 790 | 먹이 소스 5종 (`DraggableObject` 상속): seed/leaf/berry/mushroom/honeydew — 각기 다른 draw 메서드 |
| `Carcass` | 835 | 사체 (`DraggableObject` 상속, 협동 운반, 8펠릿) |
| `Queen` | 728 | 플레이어 기지 |
| `AntlionPit` | 756 | 개미귀신 함정 |
| `EnemyNest` | 803 | 적 기지 |
| `RedColonyManager` | 843 | 적 AI 경제 |
| `Ant` | 919 | 개미 개체 (FSM 포함) |
| `Game` | 1404 | 최상위 오케스트레이터 |

### colony.js 클래스

| 클래스 | 역할 |
|---|---|
| `ColonyManager` | 플레이어 경제, 업그레이드, DOM 바인딩 |

### 사령관(Commander) 시스템
- **역할**: `'commander'`  병과. 검정 팩션 전용 특수 유닛.
- **오라**: `Game._applyCommanderAura()` → 매 프레임 `COMMANDER_AURA_R`(120px) 내 아군에 `_auraBoosted=true` 플래그. 이동 속도 ×1.3, 전투 공격력 +1.
- **스프라이트**: `SpriteCache` 슬롯 12–13 (황금색, 왕관 무늬).
- **소환**: `ColonyManager.spawnCommander()` — 사령관 막사 건설 후 버튼 클릭으로 직접 소환. 최대 3기.
- **패트롤**: WANDER/DEFEND 상태로 활동하며 rally 페로몬을 주변에 지속 방출 → 병사들이 뒤따름.

---

## 5. 개미 상태머신 (FSM)

**정의 위치**: `main.js` (STATE 객체)

```js
const STATE = {
  WANDER: 0, FOLLOW: 1, RETURN: 2, CLEAN_FOLLOW: 3,
  RALLY: 4, COMBAT: 5, DEFEND: 6, IDLE_NEST: 7,
  ATTACHED: 8   // Phase 10: DraggableObject에 물리 연결
};
```

### 상태 전이 다이어그램

```
IDLE_NEST
  ├─ 랠리 페로몬 감지       → RALLY         ┐
  ├─ 청소 페로몬 감지       → CLEAN_FOLLOW  │ CMD_IGNORE_PROB(15%) 확률로
  ├─ 강한 먹이 흔적 (>40)   → FOLLOW        │ 이번 틱 명령 무시
  ├─ 스카우트 모집 신호     → FOLLOW        ┘
  └─ 적 알람 감지           → WANDER  (무시 없음 — 즉각 반응)

WANDER
  ├─ 먹이 흔적 (>4)         → FOLLOW
  ├─ 청소 페로몬            → CLEAN_FOLLOW
  ├─ 랠리 페로몬            → RALLY
  └─ 먹이 근접 (_tryAttach) → ATTACHED  ← Phase 10

FOLLOW
  ├─ 흔적 소멸 + 집 근처    → WANDER
  ├─ 흔적 소멸 + 멀리 있음
  │    └─ hasFood=true     → RETURN
  │    └─ hasFood=false    → WANDER
  ├─ DISTRACT_PROB/초 확률  → WANDER  (먹이 미보유 시만)
  └─ 먹이 근접 (_tryAttach) → ATTACHED  ← Phase 10

RETURN
  └─ 집 도달               → IDLE_NEST (스카우트는 WANDER)

CLEAN_FOLLOW
  ├─ 흔적 소멸              → WANDER
  ├─ DISTRACT_PROB/초 확률  → WANDER  (임무 이탈)
  └─ 사체 근접 (_tryAttach) → ATTACHED  ← Phase 10

RALLY
  ├─ 흔적 소멸              → WANDER
  └─ 28% 속도로 이동

COMBAT
  └─ 타겟 사망              → 이전 상태

DEFEND
  ├─ 타겟 사망              → WANDER
  └─ 타겟 이탈              → WANDER

ATTACHED  ← Phase 10 신규
  ├─ dragTarget 소실/비활성 → WANDER
  ├─ 거리 초과(>20px)       → WANDER + detach
  ├─ 전투 시작              → COMBAT + detach
  └─ 여왕 도달 시           → IDLE_NEST (전원 해방) + addFood/addCorpse
```

### Phase 10: ATTACHED 상태 물리 메커니즘

```
DraggableObject.update(dt, cw, ch):
  1. 죽은/이탈 개미 attachedAnts에서 제거
  2. 부착 인원 < requiredAnts() → 속도만 감쇠, 이동 없음
  3. 합력 = Σ (cos(ant.angle), sin(ant.angle))  ← 각 개미 진행 방향
  4. 가속도 = (DRAG_FORCE_PER_ANT × n) / mass
  5. vx, vy += 합력 방향 × 가속도 × dt
  6. 선형 항력: vx, vy *= (1 - DRAG_COEFF × dt)
  7. 최대 속도 클램핑 (DRAG_MAX_SPEED = 22 px/s)
  8. x, y += vx×dt, vy×dt  /  경계 반사

Ant.update() ATTACHED 분기:
  - 소프트 스프링: 개미를 오브젝트 쪽으로 살짝 당김
  - home 방향으로 각도 회전 → 이것이 오브젝트에 합력을 생성
  - 인원 부족 시 food 페로몬 방출 → 동료 모집
```

### FSM 핵심 메서드 위치

| 메서드 | 설명 |
|---|---|
| `Ant.update()` | FSM 메인 디스패치 |
| `Ant._tryAttach()` | 먹이/사체 부착 시도, ATTACHED 전환 (Phase 10) |
| `Ant._deposit()` | 페로몬 증착 (상태별 채널) |
| `Ant._steer()` | 페로몬 그라디언트 조향 |
| `Ant._applyACO()` | 귀환용 복합 벡터 항법 |
| `Ant._sense()` | 3방향(L/C/R) 페로몬 샘플링 |
| `DraggableObject.update()` | 협동 운반 물리 적분 (Phase 10) |

---

## 6. 페로몬 시스템

**클래스**: `PheromoneGrid` (`main.js:300`)

### 6채널 구조

| 채널 | 색 | 증착 조건 | 기능 |
|---|---|---|---|
| `food` | 초록 | RETURN 상태 | 먹이→집 귀환 경로 표시 |
| `home` | 파랑 | WANDER/FOLLOW | 집 방향 빵부스러기 |
| `danger` | 빨강 | 브러시·함정·전투 | 개미 회피 유도 |
| `clean` | 보라 | CLEAN_FOLLOW | 사체 위치 신호 |
| `rally` | 주황 | 브러시 | 방어 집결 신호 |
| `enemy` | (숨김) | 자동 | 적 페로몬, 워커 알람 트리거 |

### 감쇠·확산

```
update() 매 프레임:
  전체 셀 × DECAY (0.9942)
  DIFF_EVERY(3) 프레임마다 4-이웃 확산 (_diffuse)

업그레이드 시:
  colony.upgradePheromone() → grid.decayRate = 0.9942 + level×0.0014
  (최대 0.9985 — 페로몬이 오래 지속)
```

### 렌더 합성 (`main.js:420`)

```
R 채널 = danger×1.6 + clean×0.7 + rally×1.0
G 채널 = food×1.3 + rally×0.65
B 채널 = home×1.3 + clean×1.4
```

---

## 7. 전투 시스템

### 처리 순서 (`_update` 내부, `main.js:1971~1996`)

```
1. _resolveCombat(dt)          — 직접 접촉 데미지
2. _resolveFactionCombat(...)  — 알람·병사 소집
3. _updateAcidShooters()       — 산성 개미 원거리 공격
4. _updateProjectiles()        — 발사체 이동·충돌
5. _updateAcidPools()          — 풀 DoT 데미지
```

### 데미지 수치

| 병과 | HP | 공격력 | 스캔 범위 |
|---|---|---|---|
| 일꾼 (black) | 3 | 1 | 85px |
| 병사 (black) | 8 | 3 | 120px |
| 산성 (black) | 2 | — (원거리) | 80px |
| 스카우트 | 4 | 1 | — |
| 일꾼 (red) | 3 | 1 | — |
| 병사 (red) | 4 | 1 | — |

### 알람 시스템 (`main.js:1701`)

```
워커가 적 감지 → 반경 ALARM_BURST_R(70px) danger 페로몬 폭발
              → 500px 내 아군 병사 자동 DEFEND 상태 전환
```

---

## 8. 식민지 경제 (ColonyManager)

**파일**: `colony.js:8`

### 틱 처리 순서 (`colony.js:76`)

```
매 프레임 tick(dt):
  1. 알 생산 — 굶주림 아니면 5초마다 1개
  2. 부화     — 병과별 음식 소모 후 배치 (부족시 강등)
                acid(10) → soldier(6) → worker(2) → 실패
  3. 여왕 에너지 — 5초마다 음식 1 → 에너지 20 충전
  4. 사체 자연 감소 — 60초마다 1개 제거
  5. 사체 재활용 — 업그레이드 레벨별 일괄 처리
```

### 업그레이드 비용 공식

| 업그레이드 | 비용 공식 | 효과 |
|---|---|---|
| 페로몬 강화 | 50 + level×30 | 감쇠율 ↑ (오래 지속) |
| 저장고 확장 | 30 + level×20 | 최대 용량 +50 |
| 육아방 강화 | 40 + level×25 | 최대 인구 +10, 부화 속도 +0.8s |
| 산성 시설 | 100 (1회) | 산성 개미 해금 |
| 사체 재활용 | 60 + level×30 | 배치량 3→7, 주기 4s→1.5s |

### 수명 배율

```
기본 수명: 600~840s (black), 480~680s (red)
굶주림 시: ×3 가속
질병 시 (사체>40): ×1.15 가속
중첩: ×3.45 가속
```

---

## 9. 렌더링 파이프라인

**메서드**: `Game._render()` (`main.js:1999`)

### 좌표 공간 전환 구조

```
_render() {
  ctx.save()
  ctx.translate(-cam.x, 0)   ← [월드 공간 시작]
    페로몬 그리드
    장애물 (Rock, Branch)
    먹이, 사체
    산성 풀
    개미 스프라이트
    발사체, 파티클
    Queen, EnemyNest
    _renderBrush()
      ctx.save()
        브러시 원 (wx, wy — 월드 좌표)
      ctx.restore()           ← 아직 월드 공간
      ctx.save()
      ctx.resetTransform()    ← [스크린 공간 전환] ★ 핵심
        크로스헤어 (sx, sy — 화면 좌표)
      ctx.restore()
  ctx.restore()               ← [월드 공간 종료]

  _renderHUD()                ← [스크린 공간] HUD 전부
}
```

> **중요**: `_renderBrush` 내부에서 크로스헤어를 그리기 전 반드시 `ctx.resetTransform()`을 호출해야 한다. 그렇지 않으면 카메라 오프셋만큼 커서가 왼쪽으로 밀린다. (버그 수정됨)

### 스프라이트 슬롯 (SpriteCache)

| 슬롯 | 개미 종류 |
|---|---|
| 0–1 | 검정 일꾼 (애니프레임 0, 1) |
| 2–3 | 검정 병사 |
| 4–5 | 산성 개미 |
| 6–7 | 붉은 일꾼 |
| 8–9 | 붉은 병사 |
| 10–11 | 스카우트 |
| 12–13 | 사령관 |

### Phase 10 ATTACHED 상태 오버레이

| 상태 | 색상 |
|---|---|
| RETURN (먹이) | `#50ff70` 녹색 |
| RETURN (사체) | `#9090c8` 보라 |
| FOLLOW | `#80d4ff` 하늘 |
| **ATTACHED** | **`#ffd700` 황금** |
| CLEAN_FOLLOW | `#cc44ff` 보라 |
| RALLY | `#ff8820` 주황 |
| DEFEND | `#ff7030` 적주황 |
| COMBAT | `#ffee20` 노랑 |

HUD에 `Carrying: N` 항목이 추가되었으며, Food/Carcass 위에 `n/req` 비율 링이 표시된다.

---

## 10. 자주 나오는 버그 패턴

### A. 개미가 이상한 위치에서 먹이를 들고 귀환

**원인**: `FOLLOW` 상태에서 페로몬이 소멸되면 `hasFood` 없이 `RETURN`으로 전환됨 →
`RETURN` 도달 시 `addFood(1)` 무조건 호출.

**수정 위치**:
- `main.js:1248` — `!this.hasFood` 조건 추가로 WANDER 전환
- `main.js:1261` — `else if (this.hasFood)` 조건 추가

**확인 포인트**: `_pickup()`이 호출되어야만 `hasFood = true`가 설정된다.

---

### B. 마우스 커서(크로스헤어)가 스크롤하면 왼쪽으로 밀림

**원인**: `_renderBrush()`가 월드 공간 `translate(-cam.x, 0)` 안에서 호출되는데, 크로스헤어 그리기 직전 `ctx.restore()`가 여전히 `-cam.x` 상태로 돌아감.

**수정 위치**: `main.js:2061` — `ctx.save()` 후 `ctx.resetTransform()` 추가.

**핵심 규칙**: `_renderBrush` 내부에서 크로스헤어를 그릴 때는 항상 `ctx.resetTransform()`으로 스크린 공간을 명시 복원해야 한다.

---

### D. Rally 개미가 너무 느리거나 중간에 이탈

**원인**: `STATE.RALLY` 케이스에서 `this.speed * 0.28` 배율로 수동 이동 후 `return`했고, `DISTRACT_PROB` 이탈 확률이 적용됨.

**수정 위치**: `main.js` `case STATE.RALLY` 블록
- `this.speed * 0.28` 수동 이동 제거 → `break`으로 변경해 하단 공통 이동 코드(일반 속도) 사용
- `DISTRACT_PROB` 이탈 조건 제거 — 페로몬이 소멸될 때까지 이탈 불가

---

### E. 장군이 클릭한 위치로 이동하지 않음

**원인**: 좌클릭이 브러쉬 페인팅에만 연결되어 있었고 장군 이동 명령이 없었음.

**수정 위치**: `main.js`
- `_update()`의 브러쉬 페인팅 코드를 `mouse.leftClick` 감지 → 가장 가까운 장군에게 `moveTarget` 설정으로 교체
- `case STATE.WANDER`에 장군 moveTarget 네비게이션 추가 (25px 이내 도착 시 해제)
- 장군이 자신이 발산하는 Rally 페로몬을 감지해 RALLY 상태로 전환되는 순환 참조 방지: `this.role !== 'commander'` 조건 추가

---

### C. 페로몬이 너무 빨리/느리게 사라짐

**조정**: `CFG.DECAY` (`main.js:20`) 값 변경.
- 올리면(→1.0 방향): 더 오래 지속
- 내리면(→0.9 방향): 더 빨리 소멸
업그레이드로도 조정 가능: `colony.upgradePheromone()` → `grid.decayRate`

---

### D. 개미가 집 밖에서 멈추거나 무한 WANDER

**원인 후보**:
1. `maxS` (페로몬 최댓값) 계산 오류 → `_sense()` 반환값 확인 (`main.js:966`)
2. `HOME_RANGE` 너무 작음 → `CFG.HOME_RANGE` (`main.js:52`) 확인
3. 장애물에 끼어 탈출 못함 → `_applyObstaclePhysics()` (`main.js:1581`) 확인

---

### E. 병과 비율 슬라이더가 합계 100을 유지 못함

**위치**: `colony.js:384` — 슬라이더 `input` 이벤트 핸들러.
다른 슬라이더 합이 100을 넘으면 현재 슬라이더를 강제 조정하는 로직.
DOM id 순서: `scout → worker → soldier → acid`

---

### F. 적 개미가 생성되지 않음

**체크리스트**:
1. `CFG.ENEMY_MAX_ANTS` (`main.js:80`) — 현재 붉은 개미 수 초과 여부
2. `RedColonyManager.food` — 음식 부족 시 부화 실패
3. `_spawnEnemyNest()` (`main.js:1586`) — EnemyNest가 정상 생성됐는지 확인

---

### H. 먹이가 소진돼도 리스폰이 안 됨

**원인**: `prevFoodCount`를 `filter(f => f.active).length`로 계산하면, 그 직후 같은 필터로 배열을 교체하기 때문에 `this.foods.length === prevFoodCount`가 항상 성립해 리스폰 조건이 절대 true가 되지 않는다.

**수정 위치**: `main.js` 먹이 하우스키핑 섹션
```js
// 수정 전 (버그)
const prevFoodCount = this.foods.filter(f => f.active).length;
// 수정 후
const prevFoodCount = this.foods.length; // 비활성 포함 전체 수
```

**핵심 규칙**: `prevFoodCount`는 필터 전 **전체** 길이를 기록해야 한다.

---

### G. 업그레이드 버튼이 비활성화 상태로 고착

**원인**: `_shadeBtn()` (`colony.js:310`)이 음식이 충분해도 `cant-afford` 클래스를 제거 안 하는 경우.
**확인**: `_refreshUI()` 호출 여부 → `ColonyManager.tick()` 반환값 처리 흐름 확인.

---

## 11. 수정 이력

| 날짜 | 커밋 | 내용 |
|---|---|---|
| 2026-03-11 | — | **v1.3.1** ATTACHED 스프링 표면 분산 수정 + 먹이 5종 시각화 (씨앗/잎/열매/버섯/감로), 정찰병 먹이 발견 시 귀환→모집 복구 |
| 2026-03-11 | — | **v1.3.0** Phase 10 Mass & Drag Mechanics — DraggableObject 협동 운반 물리, STATE.ATTACHED(8), 개미 합력 벡터로 먹이/사체 이동, 여왕 도달 시 일괄 pellets 지급, 전투 시 자동 이탈, HUD Carrying 카운트 추가 |
| 2026-03-11 | — | **v1.2.3** 장군 QWER 페로몬 모드 전환 — Q먹이/W위험/E청소/R집결, 선택 링 색상 모드별 변경 |
| 2026-03-11 | — | **v1.2.2** 장군 RTS 조작 — 좌클릭=선택(선택 링), 우클릭=이동 명령, moveTarget→FOLLOW 전환 방지 |
| 2026-03-11 | — | **v1.2.1** 브러쉬 기능 제거, 좌클릭 → 장군 이동 명령, Rally 속도 정상화·결속력 강화 |
| 2026-03-11 | — | **v1.2.0** 사령관(Commander) 개미 계급 추가 — 오라·고체력·집결 페로몬·황금 스프라이트·막사 업그레이드 |
| 2026-03-10 | — | **v1.1.2** 붉은 개미 초기 군체 재설정 (일개미 50·병정 20·정찰 10), 먹이 리스폰 버그 수정 |
| 2026-03-10 | — | **v1.1.1** 개미 속도 절반 감소 — `ANT_SPEED` 85 → 42.5 |
| 2026-03-10 | — | **v1.1.0** 개미 무작위성 추가 — `CMD_IGNORE_PROB`(명령 무시), `DISTRACT_PROB`(작업 이탈) |
| 2026-03-10 | `5796c4d` | 스크롤 시 마우스 커서 위치 오류 수정 (`ctx.resetTransform()`) |
| 2026-03-10 | `eb5d133` | 빈 공간에서 먹이 수집 버그 수정 (`hasFood` 조건 강화) |
| 2026-03-10 | `e3fa7d7` | 도움말 제목에 버전(`VERSION`) 표시 추가 |
| 2026-03-10 | — | `config.js` 생성 — 게임 수치 외부 편집 파일 |
| 2026-03-10 | — | `CLAUDE.md` 생성 — 수정 시 GUIDE.md 업데이트 규칙 |
| 2026-03-10 | — | 도움말 버그 수정 — `#surface-wrap pointer-events:none`, 인라인 스크립트 방어 처리 |

---

*이 문서는 코드 변경 시 함께 업데이트할 것. 특히 버그 수정, 신규 시스템 추가, CFG 값 대규모 변경 시 해당 섹션을 갱신한다.*
