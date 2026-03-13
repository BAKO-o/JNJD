# Phase 10 — 질량 & 드래그 역학 (협동 운반) 구현 계획

> 작성일: 2026-03-11  
> 대상 버전: v1.2.3 → v1.3.0

---

## 1. 설계 결정 사항

### 1-1. Food(mass=1) 기존 완전 호환

`Food` 클래스는 `DraggableObject`를 상속하되 `mass=1, maxSlots=1`로 설정한다.
`maxSlots=1`이면 최대 1마리 개미만 부착 가능하므로, 기존처럼 단일 개미가 즉시 수거하는 동작이 그대로 유지된다.
단, 내부 구현은 `_pickup()` 대신 `_tryAttach()` 경로로 통일된다.

`Food.pellets` / `Food.scale` / `Food.draw()` / `Food._anim` 애니메이션은 전혀 변경하지 않는다.
`tryCollect()` 메서드만 제거되고 `DraggableObject.attach()` 로직으로 대체된다.

### 1-2. Carcass만 실질적인 변화

- 이전: 개미 1마리가 즉시 `tryCollect()` → `hasCarcass=true` → `RETURN` 상태
- 이후: 최대 5마리 개미가 ATTACHED 상태로 달라붙어 객체 자체가 집 방향으로 이동

기존 `Carcass.pellets=8` 은 폐기한다. 대신 `mass=3`이 수송 난이도를 결정한다. 둥지 도착 시 `colony.foodStored += mass * 10 = 30` 이 추가된다 (기존 8펠릿 × 1씩 8번 = 최대 8과 비교해 가치 상승).

### 1-3. Red ant 호환성

Phase 10 초기에는 **black 팀 worker만** `_tryAttach()` 호출을 수행한다.
red 팀의 ant FSM (`ra.update()`) 쪽 FOLLOW/WANDER 분기에는 `_tryAttach()` 호출을 추가하지 않는다.
`allFood` 배열은 여전히 red 팀 FSM에 전달되지만, red 팀은 기존처럼 객체 근처에서 접근해도 attach를 시도하지 않는다.
향후 red 팀 확장 시 `_tryAttach()` 호출만 추가하면 되도록 메서드를 팩션 무관하게 설계한다.

### 1-4. `_pickup` → `_tryAttach` 전환 전략

| 단계 | 변경 내용 |
|------|-----------|
| ① | `DraggableObject` 클래스 신설, `Food`/`Carcass` 상속 전환 |
| ② | `Ant._tryAttach(draggables)` 신설, `_pickup()` 호출 위치를 `_tryAttach()`로 교체 |
| ③ | `Ant._pickup()` 메서드 전체 삭제 |
| ④ | FOLLOW/WANDER/CLEAN_FOLLOW 분기의 기존 `_pickup` 호출 2곳 → `_tryAttach` 로 일괄 교체 |

---

## 2. config.js 수치 추가

`config.js`의 `GAME_CONFIG` 객체에 다음 항목들을 추가한다.

```js
// ──────────────────────────────────────────────────────────────
//  Phase 10: 협동 운반 (Mass & Drag)
// ──────────────────────────────────────────────────────────────

CARCASS_MASS:       3,    // 시체 운반에 필요한 최소 개미 수
CARCASS_MAX_SLOTS:  5,    // 시체에 동시 부착 가능한 최대 개미 수
DRAG_BASE_SPEED:    0.55, // 만재 시 기본 속도 배율 (ANT_SPEED × 이 값)
DRAG_SOS_RADIUS:   60,    // SOS 페로몬 폭발 반경 (px)
DRAG_SOS_STR:     140,    // SOS 페로몬 강도
DRAG_FOOD_VALUE:   10,    // 도착 시 질량 1당 식량 증가량 (mass × DRAG_FOOD_VALUE)
ATTACH_R:          16,    // 부착 판정 반경 (px) — Carcass 14px보다 약간 넓게
```

**수치 결정 근거:**
- `DRAG_BASE_SPEED=0.55`: 기존 일반 귀환 속도의 55% → 시체 운반은 느리지만 불가능하지 않은 수준
- `ATTACH_R=16`: 기존 Carcass `tryCollect` 반경(14px)과 유사하게 유지
- `DRAG_FOOD_VALUE=10`: mass=3 시체 → 30 식량. 기존 개별 펠릿 8회(=8 식량)보다 크게 가치 상승시켜 협동 운반을 보상

---

## 3. DraggableObject 클래스 설계

`Food`와 `Carcass` 선언 전에 다음 기반 클래스를 삽입한다 (main.js 706번째 줄 앞).

### 3-1. constructor

```js
class DraggableObject {
  constructor(x, y, mass, maxSlots) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.maxSlots = maxSlots;
    this.attachedAnts = [];  // Ant 참조 배열
    this.active = true;
    this._anim = Math.random() * TWO_PI;
    this._sosTimer = 0;      // SOS 페로몬 쿨다운 (초)
  }
```

### 3-2. slotPositions() — 슬롯 좌표 공식

개미들이 객체 외곽에 균등 배치되도록 각도를 계산한다.

```js
  slotPositions(radius) {
    // mass=1이면 슬롯 1개 (정면), mass≥2이면 원형 균등 배치
    const positions = [];
    for (let i = 0; i < this.maxSlots; i++) {
      const angle = (TWO_PI * i) / this.maxSlots;
      positions.push({
        x: this.x + Math.cos(angle) * (radius + 4),
        y: this.y + Math.sin(angle) * (radius + 4),
        angle: angle
      });
    }
    return positions;
  }
```

`radius`는 서브클래스가 `this.r` 또는 고정값으로 전달한다.

### 3-3. attach(ant) / detach(ant)

```js
  attach(ant) {
    if (this.attachedAnts.length >= this.maxSlots) return false;
    if (this.attachedAnts.includes(ant)) return false;
    const slotIdx = this.attachedAnts.length;
    this.attachedAnts.push(ant);
    ant.attachedTo = this;
    ant.slotIdx = slotIdx;
    ant.state = STATE.ATTACHED;
    return true;
  }

  detach(ant) {
    const idx = this.attachedAnts.indexOf(ant);
    if (idx === -1) return;
    this.attachedAnts.splice(idx, 1);
    // 남은 개미들의 slotIdx 재정렬
    this.attachedAnts.forEach((a, i) => { a.slotIdx = i; });
    ant.attachedTo = null;
    ant.slotIdx = -1;
    // 상태는 호출 쪽에서 설정 (사망이면 dead=true, 생존이면 WANDER)
  }
```

### 3-4. update(dt, grid, homeBase, colony, faction='black') 내부 로직

```
[1] 부착 개미가 0명 → 아무것도 하지 않고 return
[2] SOS 판정: 0 < attachedAnts.length < mass
    → _sosTimer가 0 이하면 SOS 페로몬 폭발 후 _sosTimer = 1.5 재충전
[3] 스티어링 계산: nestGravityVec + homePheroVec 합산 (아래 §8 참조)
[4] 이동: attachedAnts.length >= mass인 경우에만 위치 갱신
    속도 = CFG.ANT_SPEED * CFG.DRAG_BASE_SPEED
           * min(1, attachedAnts.length / mass)
[5] 부착 개미 위치 동기화: 각 개미를 slotPositions() 좌표로 이동
[6] 도착 판정: dist(this, homeBase) < CFG.HOME_RANGE
    → colony.addFoodMass(mass) 호출 (또는 직접 foodStored += mass * CFG.DRAG_FOOD_VALUE)
    → 모든 attachedAnts에 detach 후 state = STATE.WANDER
    → this.active = false
```

### 3-5. draw(ctx) — 추상 메서드 선언

서브클래스에서 반드시 오버라이드한다.
기반 클래스의 `draw()` 는 `throw new Error('DraggableObject.draw() must be overridden')` 로 보호한다.

---

## 4. Food 리팩토링

### 변경 전 → 후 비교

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 상속 | 없음 | `extends DraggableObject` |
| constructor | `this.active, this.r, this.pellets...` | `super(x, y, 1, 1)` 후 pellets/scale/r 추가 |
| `tryCollect()` | 있음 | **제거** |
| `update(dt)` | `_anim` 갱신 | 동일 유지 |
| `draw(ctx)` | 현재 코드 그대로 | 동일 유지 |

### constructor 변경점

```js
class Food extends DraggableObject {
  constructor(x, y, scale) {
    super(x, y, 1, 1);   // mass=1, maxSlots=1
    this.scale = scale ?? (0.7 + Math.random() * 0.8);
    this.r = CFG.FOOD_R * this.scale;
    this._maxPellets = Math.max(5, Math.round(CFG.FOOD_PELLETS * this.scale));
    this.pellets = this._maxPellets;
    this._anim = Math.random() * TWO_PI;
  }
  // tryCollect 완전 삭제
  update(dt) { this._anim = (this._anim + dt * 1.4) % TWO_PI; }
  draw(ctx) { /* 기존 코드 그대로 */ }
}
```

`Food.mass=1, maxSlots=1` 덕분에 단일 개미 부착 즉시 조건 `attachedAnts.length >= mass` 충족 → 기존과 동일한 속도로 귀환한다.

Food 도착 시 `colony.addFood(1)` 대신 `colony.addFoodMass(1)` (= `foodStored += 1 * 10`) 이 호출된다.
**단, 기존 식량 밸런스 유지를 위해** `DRAG_FOOD_VALUE` 를 Food에는 적용하지 않고 `colony.addFood(1)` 직접 호출 방식을 유지하는 옵션도 고려한다. 가장 단순한 접근은:
- Food 도착 → `colony.addFood(mass)` → `addFood(1)` → 기존 동일
- Carcass 도착 → `colony.addFood(mass * CFG.DRAG_FOOD_VALUE / 10)` 등 별도 처리

Food와 Carcass의 도착 처리를 DraggableObject.update() 내에서 통일하되, 각 서브클래스가 `onArrive(colony)` 훅을 오버라이드하는 방식이 가장 깔끔하다.

```js
// DraggableObject 기반
onArrive(colony) { /* 서브클래스 오버라이드 */ }

// Food.onArrive
onArrive(colony) { colony.addFood(1); }

// Carcass.onArrive
onArrive(colony) {
  colony.foodStored = (colony.foodStored ?? 0) + this.mass * CFG.DRAG_FOOD_VALUE;
}
```

---

## 5. Carcass 리팩토링

### constructor 변경점

```js
class Carcass extends DraggableObject {
  constructor(x, y) {
    super(x, y, CFG.CARCASS_MASS, CFG.CARCASS_MAX_SLOTS);
    // pellets 제거 — 이제 mass가 가치를 결정
    this._anim = Math.random() * TWO_PI;
  }
  // tryCollect 완전 삭제
  update(dt) {
    this._anim = (this._anim + dt * 0.8) % TWO_PI;
    // DraggableObject.update()는 Game._update()에서 직접 호출
  }
  draw(ctx) {
    if (!this.active) return;
    // 기존 draw 코드 유지
    // 추가: 부착 개미 수 표시 (옵션)
    if (this.attachedAnts.length > 0) {
      ctx.fillStyle = '#ffe0a0';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.attachedAnts.length}/${this.maxSlots}`, this.x, this.y + 14);
    }
  }
  onArrive(colony) {
    colony.foodStored = (colony.foodStored ?? 0) + this.mass * CFG.DRAG_FOOD_VALUE;
  }
}
```

기존 `Carcass.pellets=8` 기반의 `colony.addCorpse(1)` 호출 8회 방식은 완전히 폐기된다.

---

## 6. STATE.ATTACHED 추가

```js
// main.js 963번째 줄
const STATE = Object.freeze({
  WANDER: 0, FOLLOW: 1, RETURN: 2, CLEAN_FOLLOW: 3,
  RALLY: 4, COMBAT: 5, DEFEND: 6, IDLE_NEST: 7,
  ATTACHED: 8   // ← Phase 10 추가
});
```

### draw() 오버레이 색상

`Ant.draw()` 의 overlay 분기에 다음 추가:

```js
else if (state === STATE.ATTACHED) overlay = '#ffd700'; // 금색 — 운반 중
```

ATTACHED 상태의 개미는 객체 외곽에 달라붙어 움직이므로, `angle` 은 슬롯 방향(객체 중심에서 슬롯을 향하는 벡터)으로 고정한다.

---

## 7. Ant 클래스 변경 목록

### 7-1. 새 속성 (constructor에 추가)

```js
this.attachedTo = null;   // 현재 부착 중인 DraggableObject 참조
this.slotIdx    = -1;     // 객체 내 슬롯 인덱스
```

constructor 의 `this.dead = false;` 직후 줄에 삽입.

### 7-2. `_tryAttach(draggables)` 메서드 신설

```js
_tryAttach(draggables) {
  for (const item of draggables) {
    if (!item.active) continue;
    if (item.attachedAnts.length >= item.maxSlots) continue;
    const d2 = dist2(this.x, this.y, item.x, item.y);
    const r = CFG.ATTACH_R;
    if (d2 < r * r) {
      item.attach(this);
      // ATTACHED 상태는 attach() 내부에서 설정됨
      return true;
    }
  }
  return false;
}
```

### 7-3. FSM 분기 교체

FOLLOW 상태 (1326번째 줄):
```js
// 변경 전
if (this._pickup(foods, colony)) return;
// 변경 후 (role === 'worker'만 부착 가능)
if (this.role === 'worker' && this._tryAttach(foods)) return;
```

WANDER 상태 (1308번째 줄):
```js
// 변경 전
if (this._pickup(foods)) return;
// 변경 후
if (this.role === 'worker' && this._tryAttach(foods)) return;
```

CLEAN_FOLLOW 상태 (1355번째 줄):
```js
// 변경 전
if (this._pickup(crc.length ? crc : foods)) return;
// 변경 후
if (this.role === 'worker' && this._tryAttach(crc.length ? crc : foods)) return;
```

### 7-4. ATTACHED FSM 케이스 추가

switch 블록 내 `case STATE.IDLE_NEST:` 앞에 추가:

```js
case STATE.ATTACHED: {
  // 개미는 DraggableObject.update() 가 위치를 결정하므로 자체 이동 없음
  // combatTarget 이 생기면 전투 진입하지 않도록 방어
  // 객체가 비활성화된 경우 (도착·소멸) 자동으로 WANDER 전환
  if (!this.attachedTo || !this.attachedTo.active) {
    this.attachedTo = null;
    this.slotIdx = -1;
    this.state = STATE.WANDER;
  }
  return; // 하단 공통 이동 코드(mx, my 계산) 실행하지 않음
}
```

**중요:** `case STATE.ATTACHED:` 에서 `return`을 사용해 메서드 끝의 위치 업데이트 코드(`this.x += mx...`)를 건너뛴다.

### 7-5. `_pickup()` 완전 제거

`Ant._pickup()` 메서드 (1391–1408번째 줄) 전체 삭제.

### 7-6. 사망 처리에 detach 호출 추가

`killAnt()` 함수 내 (`this.carcasses.push(new Carcass(a.x, a.y))` 줄 뒤):

```js
// Phase 10: ATTACHED 상태 개미 사망 시 객체에서 분리
if (a.attachedTo) {
  a.attachedTo.detach(a);
  a.attachedTo = null;
}
```

수명 만료 처리 (2022번째 줄 근처, lifespan <= 0 분기):
```js
if (ant.lifespan <= 0) {
  if (ant.attachedTo) { ant.attachedTo.detach(ant); ant.attachedTo = null; }
  this.carcasses.push(new Carcass(ant.x, ant.y));
  // ...
}
```

### 7-7. draw()에서 ATTACHED 상태 처리

ATTACHED 개미의 실제 화면 위치는 `DraggableObject.update()` 가 슬롯 좌표로 설정하므로 `draw()`는 별도 처리 없이 `this.x, this.y` 를 그대로 사용한다.
단, `angle` 을 슬롯 방향으로 설정해 개미가 객체를 "밀고 있는" 방향을 향하도록 한다.

---

## 8. DraggableObject.update() 벡터 수학 상세

### 8-1. nestGravity 벡터

```js
_nestGravityVector(homeBase) {
  const dx = homeBase.x - this.x;
  const dy = homeBase.y - this.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / d, y: dy / d };
}
```

### 8-2. home 페로몬 3-way 센싱 (L/C/R)

현재 이동 방향(`this._moveAngle`)을 기준으로 좌·중·우 3방향을 샘플링한다.

```js
_homePheromoneVector(grid, faction, senseR = 28) {
  const a = this._moveAngle ?? 0;
  const offsets = [
    { da: -Math.PI / 4, weight: 1 },  // L
    { da: 0,            weight: 1 },  // C
    { da:  Math.PI / 4, weight: 1 },  // R
  ];
  let vx = 0, vy = 0;
  for (const { da } of offsets) {
    const sa = a + da;
    const px = this.x + Math.cos(sa) * senseR;
    const py = this.y + Math.sin(sa) * senseR;
    const ph = grid.readF(faction, 'home', px, py);
    vx += Math.cos(sa) * ph;
    vy += Math.sin(sa) * ph;
  }
  const mag = Math.sqrt(vx * vx + vy * vy);
  return mag > 0.5 ? { x: vx / mag, y: vy / mag } : { x: 0, y: 0 };
}
```

### 8-3. 합산 방향 및 속도 공식

```js
update(dt, grid, homeBase, colony, faction = 'black') {
  if (this.attachedAnts.length === 0) return;

  // ── SOS 페로몬 ──
  this._sosTimer -= dt;
  if (this.attachedAnts.length < this.mass && this._sosTimer <= 0) {
    grid.paintF(faction, 'food',  this.x, this.y, CFG.DRAG_SOS_RADIUS, CFG.DRAG_SOS_STR);
    grid.paintF(faction, 'clean', this.x, this.y, CFG.DRAG_SOS_RADIUS, CFG.DRAG_SOS_STR * 0.6);
    this._sosTimer = 1.5; // 1.5초마다 SOS 발신
  }

  // ── 이동 (만재 조건 충족 시에만) ──
  if (this.attachedAnts.length >= this.mass) {
    const gv = this._nestGravityVector(homeBase);
    const pv = this._homePheromoneVector(grid, faction);

    // 가중 합산: gravity 0.3, pheromone 0.7
    let fx = gv.x * 0.3 + pv.x * 0.7;
    let fy = gv.y * 0.3 + pv.y * 0.7;
    const fm = Math.sqrt(fx * fx + fy * fy);
    if (fm < 0.01) { fx = gv.x; fy = gv.y; } // 폴백
    else { fx /= fm; fy /= fm; }

    // 이동 방향 저장 (다음 프레임 페로몬 센싱용)
    this._moveAngle = Math.atan2(fy, fx);

    // 속도 = baseSpeed × clamp(attachedCount / mass, 0, 1)
    const ratio = Math.min(1, this.attachedAnts.length / this.mass);
    const speed = CFG.ANT_SPEED * CFG.DRAG_BASE_SPEED * ratio;

    this.x += fx * speed * dt;
    this.y += fy * speed * dt;

    // 경계 클램프 (캔버스 외부 이탈 방지)
    // cw, ch 는 update() 인자로 받거나 this._cw 에 저장
  }

  // ── 부착 개미 슬롯 위치 동기화 ──
  const slots = this.slotPositions(this._radius ?? 10);
  for (let i = 0; i < this.attachedAnts.length; i++) {
    const ant = this.attachedAnts[i];
    const slot = slots[i];
    ant.x = slot.x;
    ant.y = slot.y;
    // 개미가 객체 중심을 향하도록 각도 설정
    ant.angle = Math.atan2(this.y - ant.y, this.x - ant.x);
  }

  // ── 도착 판정 ──
  const d2 = dist2(this.x, this.y, homeBase.x, homeBase.y);
  if (d2 < CFG.HOME_RANGE * CFG.HOME_RANGE) {
    this.onArrive(colony);
    for (const ant of [...this.attachedAnts]) {
      this.detach(ant);
      ant.state = STATE.WANDER;
      ant.angle += Math.PI + (Math.random() - 0.5) * 1.2;
    }
    this.active = false;
  }
}
```

### 8-4. 페로몬 드롭

이동 중에는 객체 위치에서 home 페로몬을 약하게 증착해 다음 개미들이 경로를 발견할 수 있게 한다:

```js
// update() 이동 블록 내, 위치 갱신 후
if (this.attachedAnts.length >= this.mass) {
  grid.depositF(faction, 'home', this.x, this.y, CFG.DEP_HOME_WALK * 2);
}
```

---

## 9. 메인 루프 `_update()` 변경

### 9-1. allFood 구성 변경

기존 (main.js 2001번째 줄):
```js
const allFood = this.foods.concat(this.carcasses.filter(c => c.active));
```

변경 없음. `foods`와 `carcasses`는 모두 `DraggableObject` 서브클래스이므로 배열 구성 방식은 그대로 유지한다.

### 9-2. draggables.update() 호출 위치

개미 FSM 루프가 모두 끝난 후 (red 팀 FSM 루프 종료 직후, 하우스키핑 앞에) 실행:

```js
// ── Phase 10: DraggableObject 이동 처리 ──────────────────────
const allDraggables = this.foods.concat(this.carcasses.filter(c => c.active));
for (const d of allDraggables) {
  if (d.attachedAnts.length > 0) {
    d.update(dt, grid, queen, colony, 'black', this.worldW, this.worldH);
  } else {
    d.update(dt); // 기존 _anim 업데이트만 (Food/Carcass 의 단순 update)
  }
}
```

**주의:** `Food.update(dt)` 는 여전히 `_anim` 갱신만 한다. `DraggableObject.update()` 와 이름이 겹치므로 Food/Carcass 에서 `animUpdate(dt)` 로 이름을 분리하거나, DraggableObject.update() 내에서 `this._anim` 을 갱신하도록 통합한다.

**권장 방안:** DraggableObject.update()가 인자 수로 구분:
- `update(dt)` (인자 1개) → 애니메이션만 갱신 (개미 미부착 시 Game 루프에서 호출)
- `update(dt, grid, homeBase, colony, faction, cw, ch)` (인자 7개) → 전체 물리 갱신 (개미 부착 시 호출)

또는 단순하게: Game._update()에서 항상 전체 인자로 호출하고 내부에서 `attachedAnts.length` 로 분기.

### 9-3. 도착 처리 코드

DraggableObject.update() 내부에서 직접 `this.active = false` + 개미 detach를 처리하므로 Game._update()에 별도 도착 처리 루프는 불필요하다.

단, 하우스키핑에서 소멸된 객체를 배열에서 제거하는 기존 코드를 확인한다:
```js
// 기존 (2073번째 줄)
this.foods = this.foods.filter(f => f.active);
// 기존 (2070번째 줄)
if (this._frame % 300 === 0) this.carcasses = this.carcasses.filter(c => c.active);
```
이 코드는 그대로 유지한다. `DraggableObject.active = false` 로 설정되면 다음 하우스키핑 사이클에서 자동 제거된다.

### 9-4. 전투 사망 시 detach

`killAnt()` 함수 (1750번째 줄 근처):

```js
const killAnt = (a) => {
  a.dead = true;
  // Phase 10: ATTACHED 상태 개미는 먼저 분리
  if (a.attachedTo) {
    a.attachedTo.detach(a);
    // detach() 내에서 ant.attachedTo = null, ant.slotIdx = -1 처리됨
  }
  this.carcasses.push(new Carcass(a.x, a.y));
  // ... (기존 코드)
};
```

수명 만료 (2021번째 줄):
```js
if (ant.lifespan <= 0) {
  if (ant.attachedTo) { ant.attachedTo.detach(ant); }
  this.carcasses.push(new Carcass(ant.x, ant.y));
  // ...
}
```

---

## 10. 렌더링 순서

### 기존 순서 (main.js `_render()`)

```
pits → obstacles → foods → carcasses → acidPools → ants → commanders → redAnts → projectiles → particles → queen → enemyNest
```

### Phase 10 이후 순서

```
pits → obstacles → [foods draw()] → [carcasses draw()] → acidPools
→ ants(ATTACHED 포함, 슬롯 위치에서 draw()) → commanders → redAnts → projectiles → particles → queen → enemyNest
```

변경 사항은 없다. `foods`와 `carcasses` 루프의 `draw()` 호출은 그대로 유지된다.

ATTACHED 개미의 위치(`ant.x, ant.y`)는 `DraggableObject.update()` 가 슬롯 좌표로 갱신했으므로, `ant.draw(ctx, sprites)` 는 별도 처리 없이 올바른 위치에 렌더링된다.

**시각적 레이어 주의:** DraggableObject(시체/음식)는 개미 아래 레이어에 그려지고, ATTACHED 개미는 그 위에 렌더링된다. 현재 코드 순서(`foods/carcasses` → `ants`)가 이를 자연스럽게 처리한다.

---

## 11. 엣지케이스

### 11-1. maxSlots 초과 방문자 튕겨냄

`attach(ant)` 내에서 `attachedAnts.length >= maxSlots` 확인 후 `return false`. 개미는 부착 실패 시 FOLLOW/WANDER 상태를 유지하고 다른 음식을 찾아 계속 이동한다.

### 11-2. 객체 소멸 시 attachedAnts 초기화

`onArrive()` 후 `this.active = false` 전에 반드시:
```js
for (const ant of [...this.attachedAnts]) {
  this.detach(ant);
  if (!ant.dead) ant.state = STATE.WANDER;
}
// attachedAnts는 detach() 루프 후 자동으로 빈 배열
```

Game._update()의 하우스키핑에서 `this.carcasses.filter(c => c.active)` 실행 시, 소멸된 객체가 가비지 컬렉션되면서 연결이 끊기는 상황을 방지하기 위해 detach를 먼저 실행해야 한다.

### 11-3. COMBAT/DEFEND 중 ATTACHED 전환 방지

`_tryAttach()` 는 `this.role === 'worker'` 조건으로만 호출한다. COMBAT/DEFEND 상태 개미는 FSM switch에서 COMBAT/DEFEND case로 처리되어 `_tryAttach()` 를 호출하는 FOLLOW/WANDER 분기에 도달하지 않는다.

추가 방어로, `attach()` 내에서도 확인:
```js
attach(ant) {
  if (ant.state === STATE.COMBAT || ant.state === STATE.DEFEND) return false;
  // ...
}
```

### 11-4. commander/soldier/acid는 부착 불가 (worker only)

`_tryAttach()` 는 FSM 코드에서 `this.role === 'worker'` 조건으로만 호출한다.
`attach()` 메서드 내에도 방어 조건을 추가:
```js
attach(ant) {
  if (ant.role !== 'worker') return false;
  // ...
}
```

### 11-5. 동일 객체에 부착 시도 중복 방지

`attach()` 내 `this.attachedAnts.includes(ant)` 체크로 중복 부착을 막는다.

### 11-6. ATTACHED 상태에서 경계(bounce) 처리

ATTACHED 개미는 `return` 으로 조기 종료되어 `_bounce()` 를 통과하지 않는다. 객체 자체가 경계 클램프를 구현해야 한다. DraggableObject.update()에서:
```js
this.x = Math.max(5, Math.min(cw - 5, this.x));
this.y = Math.max(5, Math.min(ch - 5, this.y));
```

---

## 12. 구현 순서 (커밋 단위)

### 커밋 ①: config.js 수치 추가

파일: `config.js`

추가 항목:
```
CARCASS_MASS, CARCASS_MAX_SLOTS, DRAG_BASE_SPEED,
DRAG_SOS_RADIUS, DRAG_SOS_STR, DRAG_FOOD_VALUE, ATTACH_R
```

검증: 페이지 로드 후 콘솔에서 `CFG.CARCASS_MASS === 3` 확인.

---

### 커밋 ②: DraggableObject + Food + Carcass 리팩토링

파일: `main.js`

변경 범위:
- `DraggableObject` 클래스를 Food 선언(706번째 줄) 앞에 삽입
- `Food extends DraggableObject` 전환, `tryCollect` 삭제
- `Carcass extends DraggableObject` 전환, `tryCollect` 삭제, `pellets` 제거
- `onArrive()` 훅 구현

검증: 음식이 여전히 화면에 표시되고 `active` 상태가 정상 작동하는지 확인.

---

### 커밋 ③: Ant ATTACHED state + `_tryAttach`

파일: `main.js`

변경 범위:
- `STATE` 상수에 `ATTACHED: 8` 추가
- `Ant` constructor에 `attachedTo`, `slotIdx` 추가
- `_tryAttach(draggables)` 메서드 추가
- `_pickup()` 메서드 삭제
- FSM switch에 `ATTACHED` case 추가
- FOLLOW/WANDER/CLEAN_FOLLOW 에서 `_pickup` → `_tryAttach` 교체
- `draw()` 에 ATTACHED 오버레이 색상 추가
- `killAnt()` 및 수명 만료에 detach 호출 추가

검증: worker 개미가 Carcass 근처에서 ATTACHED 상태로 전환되는지 확인.

---

### 커밋 ④: 메인 루프 + DraggableObject.update() + 렌더링

파일: `main.js`

변경 범위:
- `DraggableObject.update()` 전체 물리 로직 구현 (§8 참조)
- Game._update()에 draggables 물리 루프 삽입 (red 팀 FSM 이후)
- `colony.addFood()`/`colony.addCorpse()` 의존성을 `onArrive()` 로 이전
- `GUIDE.md`의 렌더링 파이프라인 섹션 갱신은 커밋 ⑤로 이연

검증:
- Carcass에 3마리 이상 부착 시 둥지 방향으로 이동
- 1–2마리만 부착 시 SOS 페로몬 발신(그리드 가시화로 확인)
- 둥지 도착 시 `colony.foodStored` 30 증가

---

### 커밋 ⑤: 튜닝 + GUIDE.md 업데이트

파일: `config.js`, `main.js` (수치 조정), `GUIDE.md`

내용:
- `DRAG_BASE_SPEED`, `DRAG_SOS_RADIUS`, `DRAG_SOS_STR` 플레이테스트 기반 조정
- `CARCASS_MASS` 값이 게임플레이에서 너무 높거나 낮으면 조정
- `GUIDE.md` §3(CFG 수치), §4(클래스 지도), §5(FSM), §9(렌더링), §11(수정 이력) 갱신
- `main.js` 3번째 줄 VERSION을 `v1.3.0` 으로 변경

---

## 참고: 주요 코드 위치 인덱스

| 항목 | 파일 | 위치 |
|------|------|------|
| CFG 기본값 | main.js | 8–136번째 줄 |
| STATE 상수 | main.js | 963번째 줄 |
| Food 클래스 | main.js | 707–736번째 줄 |
| Carcass 클래스 | main.js | 741–765번째 줄 |
| Ant constructor | main.js | 965–1013번째 줄 |
| FSM switch | main.js | 1234–1378번째 줄 |
| `_pickup()` | main.js | 1391–1408번째 줄 |
| killAnt() | main.js | 1750–1767번째 줄 |
| 수명 만료 (black) | main.js | 2020–2025번째 줄 |
| 수명 만료 (red) | main.js | 2054–2061번째 줄 |
| allFood 생성 | main.js | 2001번째 줄 |
| _render() | main.js | 2107번째 줄 |
| GAME_CONFIG 끝 | config.js | 155번째 줄 |

