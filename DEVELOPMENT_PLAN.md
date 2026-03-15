# DEVELOPMENT_PLAN.md — JONANJADEUL (조난자들)
> 최종 갱신: 2026-03-13
> 목적: Claude Code가 단계별로 구현할 수 있는 완전한 기술 설계 및 마일스톤 문서

---

## 1. System Architecture & File Structure

### 1.1 디렉터리 구조

```
jonanjadeul/
├── index.html                  # 진입점: Canvas, HUD 오버레이, 스크립트 로딩
├── css/
│   └── style.css               # 전체 스타일 (게임 캔버스, UI 패널, 팝업)
└── js/
    ├── Game.js                 # 메인 게임 루프, 상태머신, 씬 조율
    ├── InputHandler.js         # WASD 키보드 + 마우스 위치·각도 추적
    ├── Renderer.js             # Canvas 컨텍스트 래퍼, draw helper 함수 모음
    ├── Player.js               # 플레이어 함선 엔티티 (물리, 모듈 Hitbox 합산)
    ├── EnemyManager.js         # 적 오브젝트 풀, 웨이브 스폰, AI 이동
    ├── WeaponSystem.js         # 투사체 오브젝트 풀, 자동 타겟팅, 발사 쿨다운
    ├── Collision.js            # Circle·AABB 충돌 판정 유틸
    ├── TetrisGrid.js           # [Phase 3] 테트리스 모듈 조립 UI, Hitbox 재계산
    └── SynergySystem.js        # [Phase 4] 송/건/학 업그레이드 트리, 속성 시너지
```

### 1.2 메인 게임 루프 흐름

```
window.onload
  └─ Game.init()
       ├─ Canvas 크기 설정
       ├─ InputHandler.init()
       ├─ Player 생성
       ├─ EnemyManager.init()
       ├─ WeaponSystem.init()
       └─ requestAnimationFrame(Game.loop)
            │
            └─ Game.loop(timestamp)
                 ├─ deltaTime 계산 (cap: 100ms)
                 ├─ [PLAYING]  Game.update(dt)
                 │    ├─ Player.update(dt, input)
                 │    ├─ EnemyManager.update(dt)
                 │    ├─ WeaponSystem.update(dt)
                 │    ├─ Collision.check()
                 │    └─ XpGem 흡수 체크
                 ├─ [PLAYING]  Game.render()
                 │    ├─ Renderer.clear()
                 │    ├─ Player.draw()
                 │    ├─ EnemyManager.draw()
                 │    ├─ WeaponSystem.draw()
                 │    └─ HUD.draw()
                 └─ requestAnimationFrame(Game.loop)
```

### 1.3 상태머신

```
INIT ──▶ PLAYING ◀──▶ PAUSED
             │
             │ (레벨업 트리거)
             ▼
          BUILDING ──▶ PLAYING   ← [Phase 3]
             │
             │ (HP = 0)
             ▼
          GAMEOVER
```

---

## 2. Core Technical Solutions

### 2.1 Infinite Wraparound Map

**좌표계 처리:**
맵 크기는 화면의 배수(기본: `WORLD_W = 3200, WORLD_H = 1800`)로 설정.
모든 엔티티(Player, Enemy, Projectile, XpGem)는 매 업데이트마다 동일한 wrap 함수 적용.

```js
// utils/wrap.js (또는 Game.js 상단 헬퍼)
function wrapCoord(v, max) {
  return ((v % max) + max) % max;
}
// 사용: entity.x = wrapCoord(entity.x, WORLD_W);
```

**고스트 렌더링:**
플레이어·적이 화면 경계 근처에 있을 때 반대편에도 복사본을 그려 시각적 끊김 제거.

```js
// 오프셋 조합: [0, ±WORLD_W] × [0, ±WORLD_H] → 최대 9개 but 실제로는 화면에 걸친 것만
const offsets = [-WORLD_W, 0, WORLD_W];
for (const ox of offsets) {
  for (const oy of offsets) {
    drawEntity(entity.x + ox - cam.x, entity.y + oy - cam.y);
  }
}
```

### 2.2 Vampire Survivors 스타일 전투

**자동 타겟팅:**
```js
// WeaponSystem.findNearestEnemy()
let nearest = null, minDist = WEAPON_RANGE;
for (const e of enemyPool) {
  if (!e.active) continue;
  const d = wrappedDist(player, e, WORLD_W, WORLD_H);
  if (d < minDist) { minDist = d; nearest = e; }
}
```

**대규모 적 렌더링 최적화:**
- Object Pool: `MAX_ENEMIES = 300` 고정 배열, `active` 플래그로 재활성화
- 화면 외 적은 업데이트만 하고 렌더링 스킵 (frustum culling)

### 2.3 Tetris Module Assembly [Phase 3]

**Grid 기반 부품 관리:**
```
코어(0,0) 기준 2D 배열:
[ [null, moduleA, null ],
  [moduleB, CORE, moduleC],
  [null, moduleD, null ] ]
```

**Hitbox 동적 재계산:**
```js
// TetrisGrid.recalcHitbox()
let minX=0, minY=0, maxX=0, maxY=0;
for (const mod of attachedModules) {
  const gx = mod.gridX * CELL_SIZE;
  const gy = mod.gridY * CELL_SIZE;
  minX = Math.min(minX, gx - mod.w/2);
  maxX = Math.max(maxX, gx + mod.w/2);
  // ...
}
player.hitbox = { minX, minY, maxX, maxY };
```

### 2.4 Synergy System [Phase 4]

**5슬롯 속성 배열:**
```
슬롯: [FIRE, LASER, ELECTRIC, KINETIC, WATER]
조합 예: FIRE + FIRE → 1.5× 화염 데미지
         WATER + ELECTRIC → 2.0× 감전 시너지
         FIRE + WATER → 0.8× 상쇄
```

```js
// SynergySystem.calcMultiplier(slots)
const key = slots.sort().join('+');
return SYNERGY_TABLE[key] ?? 1.0;
```

---

## 3. Development Milestones

### Phase 1: 엔진 코어 & 기본 이동

**구현 항목:**
- `Game.js`: requestAnimationFrame 루프, deltaTime, 상태머신
- `InputHandler.js`: WASD keydown/keyup, mousemove → angle
- `Player.js`: 가속도 기반 이동, drag(0.92), wraparound
- `Renderer.js`: Canvas clear, 함선 도형 그리기 (삼각형 + 원)
- `index.html` + `style.css`: Canvas 전체화면, HUD 기초

**완료 조건 (DoD):**
- [x] WASD로 함선이 부드럽게 이동
- [x] 마우스 커서를 향해 함선이 회전
- [x] 화면 좌측 이탈 시 우측에서 재등장 (wraparound)
- [x] 콘솔 에러 없음

---

### Phase 2: 전투 시스템 (Vampire Survivors Style)

**구현 항목:**
- `EnemyManager.js`: 오브젝트 풀(300), 화면 가장자리 스폰, 플레이어 추적 AI
- `WeaponSystem.js`: 투사체 풀(500), 자동 타겟팅(350px), 쿨다운(0.8s)
- `Collision.js`: Circle-Circle 판정 (투사체↔적, 적↔플레이어)
- XpGem 드랍·흡수, XP 바, 레벨업 트리거
- HUD: HP바, XP바, 킬 수, 경과 시간

**완료 조건 (DoD):**
- [x] 적이 15초 간격 웨이브로 스폰, 플레이어를 향해 이동
- [x] 무기가 가장 가까운 적을 자동 조준·발사
- [x] 투사체 명중 시 적 파괴, XP 젬 드랍
- [x] 적 접촉 시 플레이어 HP 감소, HP=0 → GAMEOVER
- [x] 300적 + 500투사체에서 60FPS 유지

---

### Phase 3: 테트리스 모듈 조립 UI

**구현 항목:**
- `TetrisGrid.js`: 2D Grid 자료구조, 부품 드래그 앤 드롭 UI
- 레벨업 시 게임 일시정지 → 조립 화면 팝업
- 드랍된 부품(Module)의 형태: L형, T형, I형 등 테트리스 블록
- 부착 후 Hitbox 재계산, 충돌 판정 업데이트
- 부품 종류: Hull(HP+), Thruster(Speed+), Gun(DPS+)

**완료 조건 (DoD):**
- [x] 레벨업 시 3종 부품 선택지 제시
- [x] 드래그 앤 드롭으로 코어 주변 슬롯에 부착
- [x] 부착 후 함선 렌더링 형태 변경 확인
- [x] Hitbox 크기 변화 → 적·투사체 충돌 범위 확장

---

### Phase 4: 캐릭터 특성 트리 & 속성 시너지

**구현 항목:**
- `SynergySystem.js`: 5개 조합 슬롯, 속성(FIRE/LASER/ELECTRIC/KINETIC/WATER)
- 송(Song) 트리: 무기 화력, 선체 내구도 업그레이드
- 건(Gun) 트리: 이동속도, 방어막(Shield), 에너지 효율
- 학(Hak) 트리: 조합 슬롯 관리, 시너지 발동/상쇄 계산
- 업그레이드 선택 UI (레벨업 팝업 확장)

**완료 조건 (DoD):**
- [x] 3개 캐릭터 업그레이드 선택지 UI 표시
- [x] 5슬롯 속성 배치에 따른 데미지 배율 변화 확인
- [x] 시너지/상쇄 이펙트 HUD에 표시

---

## 4. 성능 목표

| 지표 | 목표 |
|---|---|
| FPS | 60fps (300적 + 500투사체 동시) |
| 메모리 | 오브젝트 풀로 GC 최소화 |
| 입력 지연 | < 16ms (1프레임 이내) |
| 초기 로딩 | < 1초 (외부 리소스 없음) |

---

## 5. 기술 제약 (절대 규칙)

1. **No Frameworks**: React, Vue, Phaser 등 외부 라이브러리 금지. HTML5 Canvas + Vanilla JS(ES6 Modules)만 사용.
2. **Object Pooling**: `EnemyManager`, `WeaponSystem` 모두 풀 기반으로 구현. `new` 키워드는 초기화 시에만.
3. **Modularity**: 기능별 파일 분리. `Game.js`는 오케스트레이터 역할만.
4. **No External Assets**: `fillRect`, `arc`, `beginPath` 등 Canvas 기본 API만으로 시각화.
5. **Comments**: 모든 클래스·함수에 한/영 주석으로 수정 용이성 확보.
