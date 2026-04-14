# P0-2 · TetrisGrid.js 6-모듈 분할 설계

> 작성: 2026-04-14 · v1.2.3 기준 · 분할 대상 1,860 LOC

## 1. 현 상태 요약

`TetrisGrid.js` 는 **IIFE + window 전역** 패턴으로 작성된 단일 파일 god-object 다. 클로저 상태 (`grid`, `placedModules`, `pending`, `moduleQueue`, `_isDragging` 등) 를 공유하는 함수 ~40 개가 한 스코프에 존재한다. 렌더 코드가 1,050 LOC 로 전체의 56%.

## 2. 분할 원칙

1. **기존 런타임 패턴 존중**: ES Module 도입은 P2. 지금은 **IIFE 체인** 으로 `window.TetrisGrid` 를 구성한다.
2. **상태는 한 곳**: 공유 클로저 상태는 `tetris/state.js` 한 모듈에 집중시키고, 다른 모듈은 `state.js` 가 노출한 getter/mutator 로만 접근.
3. **렌더는 순수 함수**: `render-*.js` 는 상태를 인자로 받고 쓰지 않는다. (`drawShipModules(ctx, state, …)`)
4. **공개 API 불변**: 외부 (Game.js, InputHandler.js 등) 에서 `TetrisGrid.place(…)` 호출은 그대로 동작해야 한다. `TetrisGrid.js` 는 6개 모듈을 조합해 동일 facade 를 반환하는 **얇은 진입점** 이 된다.

## 3. 6-모듈 구조

```
jonanjadeul/js/tetris/
├── defs.js        # MODULE_DEFS · TIER_* · CELL · MAX_R                    (~ 95 LOC)
├── state.js       # grid/placedModules/pending/queue + canPlace + hull     (~170 LOC)
├── pending.js     # queue 조작 + bonus 적용/해제 + unequip + scrap         (~180 LOC)
├── actions.js     # place · drag · hitShip · handleClick · craftCombine    (~320 LOC)
├── render.js      # 모든 Canvas 드로잉 (패널 · 아이콘 · 인벤토리)          (~900 LOC)
└── (facade) TetrisGrid.js   # 6모듈 조립 + public API                       (~100 LOC)
```

> **render.js 가 여전히 900 LOC** 지만 god-object 상한(4,000) 에는 한참 못 미친다. 이 파일은 **순수 렌더 함수 모음** 이라 god 성격이 없다. P3 에서 추가로 `render/` 하위로 더 쪼갤 여지는 남겨둔다 (patch / icons / panels / inventory).

### 3.1 파일별 책임

#### `tetris/defs.js`
```js
window.TetrisDefs = (() => {
  const CELL = 22, MAX_R = 7, HALF = CELL / 2;
  const TIER_WEIGHTS = {…}, TIER_LABELS = {…}, TIER_COLORS = {…};
  const MODULE_DEFS = {…};
  const MODULE_KEYS = Object.keys(MODULE_DEFS);
  const CRAFT_ONLY_KEYS = new Set([…]);
  const DROPPABLE_MODULE_KEYS = MODULE_KEYS.filter(k => !CRAFT_ONLY_KEYS.has(k));
  return { CELL, MAX_R, HALF, TIER_WEIGHTS, TIER_LABELS, TIER_COLORS,
           MODULE_DEFS, MODULE_KEYS, CRAFT_ONLY_KEYS, DROPPABLE_MODULE_KEYS };
})();
```

#### `tetris/state.js`
공유 상태 보관 + 저수준 slot 조작.
- 상태: `grid`, `placedModules`, `pending`, `pendingSelectIdx`, `validSlots`, `moduleQueue`, `maxHullSlots`, `_zoom`, 드래그 플래그 일체
- 공개: `init`, `canPlace`, `_calcValidSlots`, `expandHullSlots`, `getUsedSlots/getMaxSlots/getExpandCost/getExpandAmount`, `recalcHitbox`
- 접근자: `getGrid`, `getPending`, `setPending`, `getQueue`, `getPlacedModules`, `getValidSlots`, `getZoom/setZoom`, 드래그 플래그 getter/setter
- `SCRAP_VALUES` 상수

#### `tetris/pending.js`
대기 큐와 보너스 적용.
- `_weightedRandomKey`, `randomModuleKey`, `offerRandom`, `queueModule`, `queueRandomModule`
- `_rebuildPending`, `nextModule`, `cyclePending`, `rotatePending`, `hasQueued`, `hasPending`, `getQueueSize`, `scrapPending`
- `_applyBonus`, `_removeBonus`, `unequipModule`

#### `tetris/actions.js`
상태 변경이 큰 동작들.
- `place`, `removeModuleAt`, `_destroyModule`
- 드래그: `tryStartDrag`, `_placePreserved`, `endDrag`, `isDragging`
- 전투: `hitShip`, `updateFlash`, `handleClick`
- 크래프팅: `getCraftableWeapons`, `craftCombine`
- 기타: `repairAllHull`, `boostHullMaxHp`

#### `tetris/render.js`
순수 렌더. 상태는 `TetrisState` 에서 읽어오지만 쓰지 않는다.
- `drawShipModules`, `drawOnCanvas`
- 패널: `_drawInstalledPanel`, `_drawModulePanel`, `_drawCoreIcon`
- 아이콘: `_structureIcon`, `_weaponIcon`, `_drawModuleIcon`, `_roundRect`
- 인벤토리: `_drawInvSection`, `drawInventory`

#### `TetrisGrid.js` (facade, ~100 LOC)
```js
const TetrisGrid = (() => {
  // 6개 모듈을 묶어 기존 public API 를 그대로 재노출
  return {
    init: TetrisState.init,
    canPlace: TetrisState.canPlace,
    offerRandom: TetrisPending.offerRandom,
    place: TetrisActions.place,
    // … 26개 메서드 재매핑
  };
})();
```

## 4. 스크립트 로드 순서 (index.html)

```html
<!-- 의존 계층: defs ← state ← pending ← actions ← render ← TetrisGrid facade -->
<script src="js/tetris/defs.js"></script>
<script src="js/tetris/state.js"></script>
<script src="js/tetris/pending.js"></script>
<script src="js/tetris/actions.js"></script>
<script src="js/tetris/render.js"></script>
<script src="js/TetrisGrid.js"></script>   <!-- facade -->
```

- `defs` 는 순수 상수. 아무 것도 의존하지 않음.
- `state` 는 `defs` 만 참조.
- `pending` 은 `defs + state` 참조.
- `actions` 는 `defs + state + pending` 참조 (unequip 은 pending 에 있음).
- `render` 는 `defs + state` 만 참조 (쓰기 금지).
- `TetrisGrid.js` 는 모두 조립해 facade 노출.

## 5. 마이그레이션 단계

1. **stage 1** (기계적 이동): `defs` 추출 → 기존 파일에서 상수 제거 + `TetrisDefs.*` 참조로 교체.
2. **stage 2**: `state` 추출. 상태는 여전히 클로저이지만 모듈 내부로 옮김. 공개 getter/setter 추가.
3. **stage 3**: `pending` 추출. `_applyBonus`/`_removeBonus` 도 함께 (`unequipModule` 이 양쪽 다 쓰므로).
4. **stage 4**: `actions` 추출.
5. **stage 5**: `render` 추출 (가장 큰 청크, 거의 순수 이동).
6. **stage 6**: 기존 `TetrisGrid.js` 를 facade 로 교체.
7. **검증**: 매 스테이지마다 `npm test` 3/3 그린 + 브라우저 스모크 (스테이지 1 진입 → 모듈 드랍 → 조립 → 적 처치) 확인.

## 6. 스모크 테스트 보강

`tests/smoke.test.js` 에 추가:
- `tetris/` 하위 5개 파일 존재 검증
- 각 파일 LOC 상한: defs ≤ 200, state ≤ 400, pending ≤ 400, actions ≤ 600, render ≤ 1200
- facade `TetrisGrid.js` 는 ≤ 200 LOC

현재 적용 중인 `TetrisGrid.js 4,000 LOC 상한` 테스트는 분할 직후 제거하고 위 파일별 캡으로 대체.

## 7. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| 상태 공유 깨짐 (각 모듈이 자기 그리드 사본 만듦) | `state.js` 단일 인스턴스 + 다른 모듈은 `TetrisState.getGrid()` 로만 접근 |
| 로드 순서 사고 | `TetrisGrid` facade 가 로드 시점에 6모듈 존재 여부 검증 (undefined 시 throw) |
| 순환 의존 | 위 의존 계층이 DAG 임을 테스트로 고정 (`defs` 가 `state` 참조 금지 등 grep 검증) |
| unequip 위치 모호 | `unequipModule` 은 bonus 제거를 쓰므로 `pending.js` 에 두고, `actions.js` 는 `TetrisPending.unequipModule` 호출 |
| 테스트 미커버리지 | 스테이지마다 수동 브라우저 테스트 + smoke 재실행. P1 에서 실제 단위 테스트 추가 |

## 8. 비-목표 (NOT in P0-2)

- ES Module 전환 (P2)
- CSS 분리 (P2)
- TypeScript (미정)
- 렌더 함수 내부 구조 개선 (매직 넘버, 중복 계산)
- config.js 실사용화 (P1)

## 9. 체크포인트

스테이지별로 작은 커밋. 중간에 중단해도 게임이 돌아가야 한다.

- [ ] stage 1: `defs.js` 추출 + 스모크 그린
- [ ] stage 2: `state.js` 추출 + 스모크 그린
- [ ] stage 3: `pending.js` 추출 + 스모크 그린
- [ ] stage 4: `actions.js` 추출 + 스모크 그린
- [ ] stage 5: `render.js` 추출 + 스모크 그린
- [ ] stage 6: `TetrisGrid.js` facade 전환 + 스모크 보강 + 최종 커밋
