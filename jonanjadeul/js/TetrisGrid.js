/**
 * TetrisGrid.js — 테트리스형 함선 모듈 조립 시스템
 *
 * Phase 3: 레벨업 시 BUILDING 상태로 전환하여 캔버스 기반 조립 UI를 표시.
 * 플레이어는 코어 주변 유효 슬롯을 클릭하여 모듈을 부착한다.
 * 모듈 부착 후 player.hitboxRadius가 동적으로 재계산된다.
 */

const TetrisGrid = (() => {

  // ── 상수·카탈로그는 tetris/defs.js 에서 가져온다 (P0-2 stage 1)
  const {
    CELL, MAX_R, HALF,
    HULL_SLOT_EXPAND_COST, HULL_SLOT_EXPAND_AMOUNT, HULL_SLOT_INITIAL,
    TIER_WEIGHTS, TIER_LABELS, TIER_COLORS,
    SCRAP_VALUES,
    MODULE_DEFS, MODULE_KEYS, CRAFT_ONLY_KEYS, DROPPABLE_MODULE_KEYS,
  } = window.TetrisDefs;

  // ── 아이콘 드로잉 헬퍼는 tetris/icons.js 로 이동 (P0-2 stage 2)
  //    호출부는 기존 underscore-prefix 이름을 그대로 사용하도록 alias 바인딩
  const {
    roundRect:      _roundRect,
    drawCoreIcon:   _drawCoreIcon,
    structureIcon:  _structureIcon,
    weaponIcon:     _weaponIcon,
    drawModuleIcon: _drawModuleIcon,
  } = window.TetrisIcons;

  // ── 그리드 상태: Map<"gx,gy", moduleType string>
  const grid = new Map();

  // ── 함체 슬롯 관리 (가변 상태만 로컬)
  let maxHullSlots = HULL_SLOT_INITIAL;   // 초기값은 defs.HULL_SLOT_INITIAL

  // ── 배치된 모듈 추적 (교체 기능용)
  // [{type, anchorGx, anchorGy, cells:[{gx,gy}]}]
  const placedModules = [];

  // ── 현재 배치 대기 중인 모듈
  let pending          = null;  // { type, name, cells, color, desc, bonus }
  let pendingSelectIdx = 0;     // moduleQueue 내 현재 선택 인덱스 (W/S로 변경)
  let validSlots       = [];    // 배치 가능한 앵커 위치 [{gx,gy}]
  let moduleQueue      = [];    // 드랍된 모듈 대기 큐 (타입 문자열 배열)

  // ── 현재 줌 레벨 (Game.js에서 매 프레임 setZoom()으로 갱신)
  let _zoom = 1.0;

  // ── 드래그 & 드롭 상태
  let _isDragging         = false;
  let _dragOriginAnchorGx = 0;
  let _dragOriginAnchorGy = 0;
  let _dragPendingBackup  = null; // 드래그 시작 전 pending 백업
  let _dragPreservedHp    = 0;
  let _dragPreservedMaxHp = 0;

  // ── TIER_*, MODULE_DEFS, MODULE_KEYS, CRAFT_ONLY_KEYS, DROPPABLE_MODULE_KEYS 는
  //    tetris/defs.js 로 이동 (P0-2 stage 1). 파일 상단 destructure 로 참조.
  // ────────────────── 초기화 ──────────────────

  /** 그리드 초기화 — 코어(0,0) 배치 */
  function init() {
    grid.clear();
    grid.set('0,0', 'CORE');
    pending          = null;
    pendingSelectIdx = 0;
    validSlots       = [];
    moduleQueue      = [];
    maxHullSlots     = HULL_SLOT_INITIAL;
    placedModules.length = 0;
    _isDragging        = false;
    _dragPendingBackup = null;
  }

  // ────────────────── 슬롯 계산 ──────────────────

  /**
   * 유효 앵커 슬롯 계산
   * 조건: 빈 칸 + 기존 점유 셀에 상하좌우 인접 + 범위 내
   */
  function _calcValidSlots() {
    const slots = new Map(); // "gx,gy" → {gx,gy}
    const dirs  = [{gx:1,gy:0},{gx:-1,gy:0},{gx:0,gy:1},{gx:0,gy:-1}];

    for (const [key] of grid) {
      const [ox, oy] = key.split(',').map(Number);
      for (const d of dirs) {
        const nx = ox + d.gx, ny = oy + d.gy;
        const nk = `${nx},${ny}`;
        if (!grid.has(nk) && Math.abs(nx) <= MAX_R && Math.abs(ny) <= MAX_R) {
          if (!slots.has(nk)) slots.set(nk, {gx: nx, gy: ny});
        }
      }
    }
    return [...slots.values()];
  }

  // ────────────────── 배치 검증 ──────────────────

  /**
   * pending 모듈을 앵커(agx, agy)에 배치 가능한지 검증
   * @param {number} agx
   * @param {number} agy
   * @returns {boolean}
   */
  function canPlace(agx, agy) {
    if (!pending) return false;
    // 앵커가 유효 슬롯에 있어야 함
    if (!validSlots.some(s => s.gx === agx && s.gy === agy)) return false;
    // pending의 모든 셀이 비어있고 범위 내
    for (const c of pending.cells) {
      const nx = agx + c.gx, ny = agy + c.gy;
      if (grid.has(`${nx},${ny}`)) return false;
      if (Math.abs(nx) > MAX_R || Math.abs(ny) > MAX_R) return false;
    }
    // 함체 슬롯 여유 확인 (CORE 제외)
    const usedSlots = grid.size - 1;
    if (usedSlots + pending.cells.length > maxHullSlots) return false;
    return true;
  }

  // ────────────────── 배치 실행 ──────────────────

  /** 티어 가중치 기반 랜덤 모듈 키 선택 */
  function _weightedRandomKey() {
    const keys = DROPPABLE_MODULE_KEYS;
    let total = 0;
    for (const k of keys) total += TIER_WEIGHTS[MODULE_DEFS[k].tier] ?? 30;
    let r = Math.random() * total;
    for (const k of keys) {
      r -= TIER_WEIGHTS[MODULE_DEFS[k].tier] ?? 30;
      if (r <= 0) return k;
    }
    return keys[keys.length - 1];
  }

  /**
   * 랜덤 모듈을 pending으로 설정하고 유효 슬롯 계산
   * @returns {object} pending 모듈
   */
  function offerRandom() {
    const key  = _weightedRandomKey();
    const def  = MODULE_DEFS[key];
    // 셀 배열 복사 (원본 불변)
    pending = { type: key, ...def, cells: def.cells.map(c => ({...c})) };
    validSlots = _calcValidSlots();
    return pending;
  }

  /**
   * pending 모듈을 90° 시계방향으로 회전 (스크린 좌표계: (gx,gy)→(-gy,gx))
   * R키를 누를 때 Game.js에서 호출
   */
  function rotatePending() {
    if (!pending) return;
    pending.cells = pending.cells.map(c => ({ gx: -c.gy, gy: c.gx }));
    validSlots = _calcValidSlots();
  }

  /**
   * 랜덤 모듈 타입 키 반환 (EnemyManager 드랍 시 호출) — 티어 가중치 적용
   */
  function randomModuleKey() {
    return _weightedRandomKey();
  }

  /**
   * 특정 모듈 타입을 큐에 추가 (ModuleDrop 수집 시 호출)
   */
  function queueModule(typeKey) {
    if (MODULE_DEFS[typeKey]) moduleQueue.push(typeKey);
  }

  /**
   * 랜덤 모듈 타입을 큐에 추가 (하위 호환)
   */
  function queueRandomModule() {
    moduleQueue.push(randomModuleKey());
  }

  /**
   * moduleQueue[pendingSelectIdx]로 pending을 재구성 (내부 헬퍼)
   */
  function _rebuildPending() {
    if (moduleQueue.length === 0) { pending = null; validSlots = []; return; }
    pendingSelectIdx = Math.max(0, Math.min(pendingSelectIdx, moduleQueue.length - 1));
    const key = moduleQueue[pendingSelectIdx];
    const def = MODULE_DEFS[key];
    pending = { type: key, ...def, cells: def.cells.map(c => ({...c})) };
    validSlots = _calcValidSlots();
  }

  /**
   * 조립 화면 열 때 호출 — 첫 번째 큐 항목을 pending으로 설정 (Q키)
   * @returns {boolean} 성공 여부
   */
  function nextModule() {
    if (moduleQueue.length === 0) { pending = null; return false; }
    pendingSelectIdx = 0;
    _rebuildPending();
    return true;
  }

  /**
   * 조립 화면에서 W(-1) / S(+1) 키로 선택 모듈 변경
   * @param {number} dir - -1 (이전) 또는 +1 (다음)
   */
  function cyclePending(dir) {
    if (_isDragging || moduleQueue.length === 0) return;
    pendingSelectIdx = (pendingSelectIdx + dir + moduleQueue.length) % moduleQueue.length;
    _rebuildPending();
  }

  /** 큐에 모듈이 있으면 true */
  function hasQueued() {
    return moduleQueue.length > 0;
  }

  /** pending에 배치 대기 모듈이 있으면 true */
  function hasPending() {
    return pending !== null;
  }

  /** 현재 줌 레벨 설정 — Game.js에서 매 프레임 호출 */
  function setZoom(z) { _zoom = z || 1.0; }

  /** HUD 뱃지용: 총 대기 모듈 수 */
  function getQueueSize() {
    return moduleQueue.length;
  }

  /**
   * pending 모듈을 앵커(agx, agy)에 배치
   * @param {number} agx
   * @param {number} agy
   * @param {object} player - Player 인스턴스
   * @returns {boolean} 성공 여부
   */
  function place(agx, agy, player) {
    if (!canPlace(agx, agy)) return false;

    const placedCells = [];
    for (const c of pending.cells) {
      const cellGx = agx + c.gx, cellGy = agy + c.gy;
      grid.set(`${cellGx},${cellGy}`, pending.type);
      placedCells.push({ gx: cellGx, gy: cellGy });
    }

    // 배치 이력 저장 (모듈 HP 포함)
    const def = MODULE_DEFS[pending.type];
    const hullHp = def?.bonus?.hp ?? 0; // 장갑판 계열만 내구도 보유
    placedModules.push({
      type: pending.type, anchorGx: agx, anchorGy: agy, cells: placedCells,
      hp: hullHp,       // 현재 내구도 (0 = 비장갑 모듈)
      maxHp: hullHp,    // 최대 내구도
    });

    _applyBonus(pending.bonus, player);
    recalcHitbox(player);

    // 큐에서 해당 항목 제거 후 다음 pending 재구성
    moduleQueue.splice(pendingSelectIdx, 1);
    _rebuildPending();
    return true;
  }

  /**
   * 그리드 상의 (gx, gy) 셀을 포함하는 모듈을 제거한다 (교체 모드용)
   * 보너스는 되돌리지 않음 (설계상 유지)
   * @returns {boolean} 제거 성공 여부
   */
  function removeModuleAt(gx, gy) {
    const key = `${gx},${gy}`;
    if (!grid.has(key) || grid.get(key) === 'CORE') return false;
    const idx = placedModules.findIndex(m => m.cells.some(c => c.gx === gx && c.gy === gy));
    if (idx < 0) return false;
    const mod = placedModules[idx];
    for (const c of mod.cells) grid.delete(`${c.gx},${c.gy}`);
    placedModules.splice(idx, 1);
    return true;
  }

  // ────────────────── 드래그 & 드롭 시스템 ──────────────────

  /**
   * (gx, gy) 셀의 모듈을 들어 올려 드래그 시작.
   * 모듈을 그리드에서 제거하고 pending에 임시 설정한다.
   * @returns {boolean} 드래그 시작 성공 여부
   */
  function tryStartDrag(gx, gy, player) {
    const key = `${gx},${gy}`;
    if (!grid.has(key) || grid.get(key) === 'CORE') return false;

    const idx = placedModules.findIndex(m => m.cells.some(c => c.gx === gx && c.gy === gy));
    if (idx < 0) return false;

    const mod = placedModules[idx];
    const def = MODULE_DEFS[mod.type];
    if (!def) return false;

    // pending 및 드래그 원점 백업
    _dragPendingBackup  = pending;
    _dragOriginAnchorGx = mod.anchorGx;
    _dragOriginAnchorGy = mod.anchorGy;
    _dragPreservedHp    = mod.hp;
    _dragPreservedMaxHp = mod.maxHp;

    // 그리드·placedModules 에서 제거
    for (const c of mod.cells) grid.delete(`${c.gx},${c.gy}`);
    placedModules.splice(idx, 1);

    // 절대 좌표 → 앵커 기준 상대 좌표로 복원
    const relativeCells = mod.cells.map(c => ({
      gx: c.gx - mod.anchorGx,
      gy: c.gy - mod.anchorGy,
    }));
    pending = {
      type: mod.type, name: def.name, cells: relativeCells,
      color: def.color, desc: def.desc, bonus: def.bonus, tier: def.tier,
    };

    validSlots  = _calcValidSlots();
    recalcHitbox(player);
    _isDragging = true;
    return true;
  }

  /**
   * 보너스 재적용 없이 지정 앵커에 pending 모듈을 배치한다 (드래그 전용).
   * HP/MaxHp는 보존값을 사용한다.
   */
  function _placePreserved(agx, agy) {
    const placedCells = [];
    for (const c of pending.cells) {
      const cx2 = agx + c.gx, cy2 = agy + c.gy;
      grid.set(`${cx2},${cy2}`, pending.type);
      placedCells.push({ gx: cx2, gy: cy2 });
    }
    placedModules.push({
      type: pending.type, anchorGx: agx, anchorGy: agy,
      cells: placedCells,
      hp: _dragPreservedHp, maxHp: _dragPreservedMaxHp,
    });
  }

  /**
   * 드래그 종료: 현재 마우스 위치가 유효하면 새 위치에, 아니면 원위치에 드롭.
   * @param {number} sx  - 마우스 화면 X
   * @param {number} sy  - 마우스 화면 Y
   * @param {number} cx  - 화면 중앙 X
   * @param {number} cy  - 화면 중앙 Y
   * @param {object} player
   */
  function endDrag(sx, sy, cx, cy, player) {
    if (!_isDragging) return;
    _isDragging = false;

    const tgx = Math.round((sx - cx) / CELL);
    const tgy = Math.round((sy - cy) / CELL);

    if (canPlace(tgx, tgy)) {
      _placePreserved(tgx, tgy);
    } else {
      // 원위치 복구 — canPlace 없이 직접 삽입 (원래 있던 자리이므로 항상 유효)
      _placePreserved(_dragOriginAnchorGx, _dragOriginAnchorGy);
    }

    // 원래 pending 복원
    pending    = _dragPendingBackup;
    _dragPendingBackup = null;
    validSlots = _calcValidSlots();
    recalcHitbox(player);
  }

  /** 드래그 중 여부 반환 */
  function isDragging() { return _isDragging; }

  /**
   * 함체 슬롯 증설 (스크랩 소모 후 Game.js에서 호출)
   */
  function expandHullSlots(amount) {
    maxHullSlots += amount;
  }

  /** 현재 사용 중인 슬롯 수 (CORE 제외) */
  function getUsedSlots() { return grid.size - 1; }

  /** 최대 슬롯 수 */
  function getMaxSlots() { return maxHullSlots; }

  /** 슬롯 증설 비용 */
  function getExpandCost() { return HULL_SLOT_EXPAND_COST; }

  /** 슬롯 증설 시 증가량 */
  function getExpandAmount() { return HULL_SLOT_EXPAND_AMOUNT; }

  // SCRAP_VALUES 는 tetris/defs.js 로 이동 (P0-2 stage 1)

  /** 보너스 적용 (hp는 코어HP에 영향 없음 — 모듈 자체 내구도로 처리) */
  function _applyBonus(bonus, player) {
    // bonus.hp: 장갑판 내구도로 사용; 플레이어 HP에는 가산하지 않음
    if (bonus.speed)        player.speedMult  += bonus.speed;
    if (bonus.damage)       player.damageMult += bonus.damage;
    if (bonus.cooldownMult) {
      const cur = WeaponSystem.getWeaponStat('cooldown') ?? 0.72;
      WeaponSystem.upgradeWeapon('cooldown', Math.max(0.15, cur * bonus.cooldownMult));
    }
    if (bonus.weapon)       WeaponSystem.addSecondary(bonus.weapon, bonus.weaponAttr ?? null);
    if (bonus.weaponAttr)   SynergySystem.addWeaponAttr(bonus.weaponAttr);
    if (bonus.weaponAttrs)  bonus.weaponAttrs.forEach(a => SynergySystem.addWeaponAttr(a));
  }

  /** 보너스 역적용 — unequipModule 시 호출 */
  function _removeBonus(bonus, player) {
    if (bonus.speed)        player.speedMult  = Math.max(1.0, player.speedMult  - bonus.speed);
    if (bonus.damage)       player.damageMult = Math.max(1.0, player.damageMult - bonus.damage);
    if (bonus.cooldownMult) {
      const cur = WeaponSystem.getWeaponStat('cooldown') ?? 0.72;
      // 장착 시 cur * mult 적용했으므로, 해제 시 cur / mult 로 복원
      WeaponSystem.upgradeWeapon('cooldown', Math.min(0.72, cur / bonus.cooldownMult));
    }
    if (bonus.weapon)       WeaponSystem.removeSecondary(bonus.weapon);
    if (bonus.weaponAttr)   SynergySystem.removeWeaponAttr(bonus.weaponAttr);
    if (bonus.weaponAttrs)  bonus.weaponAttrs.forEach(a => SynergySystem.removeWeaponAttr(a));
  }

  /**
   * 그리드의 (gx, gy) 모듈을 해제하여 moduleQueue 맨 앞에 돌려준다.
   * 보너스를 역적용하고 hitbox를 재계산한다.
   * @param {number} gx
   * @param {number} gy
   * @param {object} player
   * @returns {boolean} 성공 여부
   */
  function unequipModule(gx, gy, player) {
    const key = `${gx},${gy}`;
    if (!grid.has(key) || grid.get(key) === 'CORE') return false;

    const idx = placedModules.findIndex(m => m.cells.some(c => c.gx === gx && c.gy === gy));
    if (idx < 0) return false;

    const mod = placedModules[idx];
    const def = MODULE_DEFS[mod.type];
    if (!def) return false;

    // 보너스 역적용
    _removeBonus(def.bonus, player);

    // 그리드 & placedModules 에서 제거
    for (const c of mod.cells) grid.delete(`${c.gx},${c.gy}`);
    placedModules.splice(idx, 1);

    // 큐 맨 앞에 다시 추가
    moduleQueue.unshift(mod.type);
    // pending이 없으면 즉시 활성화
    if (!pending) _rebuildPending();

    recalcHitbox(player);
    validSlots = _calcValidSlots();
    return true;
  }

  /**
   * 현재 pending 모듈을 파괴하고 스크랩을 반환한다.
   * @returns {number} 획득 스크랩량 (0이면 pending 없음)
   */
  function scrapPending() {
    if (!pending) return 0;
    const def = MODULE_DEFS[pending.type];
    const gained = def ? (SCRAP_VALUES[def.tier] ?? 5) : 5;

    // 큐에서 현재 선택 항목 제거
    moduleQueue.splice(pendingSelectIdx, 1);
    _rebuildPending();
    return gained;
  }

  /**
   * 부착된 모든 모듈 셀의 최대 코너 거리로 player.hitboxRadius 재계산
   */
  function recalcHitbox(player) {
    let maxDist = player.radius;
    for (const [key] of grid) {
      if (key === '0,0') continue;
      const [gx, gy] = key.split(',').map(Number);
      // 셀의 4 코너 거리 계산
      const corners = [
        {x: (gx - 0.5) * CELL, y: (gy - 0.5) * CELL},
        {x: (gx + 0.5) * CELL, y: (gy - 0.5) * CELL},
        {x: (gx - 0.5) * CELL, y: (gy + 0.5) * CELL},
        {x: (gx + 0.5) * CELL, y: (gy + 0.5) * CELL},
      ];
      for (const corner of corners) {
        maxDist = Math.max(maxDist, Math.hypot(corner.x, corner.y));
      }
    }
    player.hitboxRadius = maxDist;
  }

  // ────────────────── 피격·모듈 파괴 시스템 ──────────────────

  /**
   * 인덱스로 모듈을 즉시 파괴한다 (그리드 제거 + hitbox 재계산)
   * @param {number} idx - placedModules 배열 인덱스
   * @param {object} player
   */
  function _destroyModule(idx, player) {
    const mod = placedModules[idx];
    if (!mod) return;
    for (const c of mod.cells) grid.delete(`${c.gx},${c.gy}`);
    placedModules.splice(idx, 1);
    recalcHitbox(player);
    // 파괴 시각 효과: 마지막 파괴 정보 기록 (drawShipModules에서 플래시)
    lastDestroyedCell = mod.cells[0] ?? null;
    lastDestroyFlash  = 0.35; // 0.35초 플래시
  }

  /**
   * 공격 위치로부터 피격 모듈을 결정하고 처리한다.
   *  - 장갑판 계열(hp > 0): 내구도 감소 → 0 이하면 파괴
   *  - 비장갑 모듈(hp === 0): 즉시 파괴
   *  - 모듈 없음: 코어 직격 → player.takeDamage()
   * @param {number} impactX - 공격자 월드 X
   * @param {number} impactY - 공격자 월드 Y
   * @param {number} dmg     - 피해량
   * @param {object} player
   */
  function hitShip(impactX, impactY, dmg, player) {
    if (!player || player.invincibleTime > 0) return;
    if (placedModules.length === 0) { player.takeDamage(dmg); return; }

    // 공격 방향 → 플레이어 로컬 좌표계로 변환
    const dex = impactX - player.x, dey = impactY - player.y;
    const d   = Math.hypot(dex, dey) || 1;
    const nx  = dex / d, ny = dey / d;

    // 플레이어 회전각의 역방향 변환 (그리드는 로컬 좌표)
    const cos = Math.cos(-player.angle), sin = Math.sin(-player.angle);
    const ldx = cos * nx - sin * ny;
    const ldy = sin * nx + cos * ny;

    // 공격 방향으로 가장 노출된 모듈 탐색
    let bestScore = -Infinity, bestIdx = -1;
    for (let i = 0; i < placedModules.length; i++) {
      for (const c of placedModules[i].cells) {
        const score = c.gx * ldx + c.gy * ldy;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
    }

    if (bestIdx < 0) { player.takeDamage(dmg); return; }

    const mod = placedModules[bestIdx];
    if (mod.hp > 0) {
      // 장갑판: 내구도 소모
      mod.hp -= dmg;
      if (mod.hp <= 0) _destroyModule(bestIdx, player);
      else { lastDestroyedCell = mod.cells[0]; lastDestroyFlash = 0.18; } // 피격 플래시
    } else {
      // 비장갑 모듈: 즉시 파괴
      _destroyModule(bestIdx, player);
    }
  }

  // ── 파괴 플래시 상태 (drawShipModules에서 소비)
  let lastDestroyedCell = null;
  let lastDestroyFlash  = 0; // 남은 플래시 시간(s)

  /** 파괴 플래시 타이머 업데이트 (Game.js update()에서 dt 전달) */
  function updateFlash(dt) { if (lastDestroyFlash > 0) lastDestroyFlash -= dt; }

  // ────────────────── 조립 UI 클릭 처리 ──────────────────

  /**
   * 조립 화면에서 클릭 위치로 배치 시도
   * @param {number} sx - 화면 클릭 X
   * @param {number} sy - 화면 클릭 Y
   * @param {number} cx - 화면 중앙 X (그리드 원점)
   * @param {number} cy - 화면 중앙 Y
   * @param {object} player
   * @returns {boolean} 배치 성공 여부
   */
  function handleClick(sx, sy, cx, cy, player) {
    const gx = Math.round((sx - cx) / CELL);
    const gy = Math.round((sy - cy) / CELL);

    // 정상 배치 시도
    if (canPlace(gx, gy)) return place(gx, gy, player);

    // 슬롯이 꽉 찼을 때: 기존 모듈 클릭 시 제거 (교체 1단계)
    const usedSlots = grid.size - 1;
    if (usedSlots >= maxHullSlots) {
      const removed = removeModuleAt(gx, gy);
      if (removed) {
        validSlots = _calcValidSlots(); // 슬롯 재계산
        recalcHitbox(player);
      }
    }
    return false; // 조립창 유지
  }

  // ────────────────── 렌더링 ──────────────────

  /**
   * 게임플레이 중 함선 위에 모듈을 그린다 (함선 회전 적용)
   * 실제 드로잉은 tetris/render.js 로 이동 (P0-2 stage 4).
   */
  function drawShipModules(ctx, cx, cy, angle) {
    window.TetrisRender.drawShipModules(ctx, cx, cy, angle, {
      grid, placedModules,
      zoom: _zoom,
      lastDestroyedCell, lastDestroyFlash,
    });
  }

  /**
   * 조립 화면 전체를 캔버스에 그린다 (STATE.BUILDING 시 render()에서 호출)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - 화면 중앙 X
   * @param {number} cy - 화면 중앙 Y
   * @param {number} mouseX - 마우스 화면 X
   * @param {number} mouseY - 마우스 화면 Y
   */
  function drawOnCanvas(ctx, cx, cy, mouseX, mouseY, player) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // ── 1. 어두운 반투명 오버레이
    ctx.fillStyle = 'rgba(0, 2, 18, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // ── 2. 헤더
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillStyle    = '#93c5fd';
    ctx.fillText('🔧 함선 모듈 조립', cx, 36);
    ctx.font      = '12px "Segoe UI", sans-serif';

    const usedSlots = grid.size - 1;
    const isFull    = usedSlots >= maxHullSlots;
    if (isFull) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`⚠ 함체 슬롯 포화 — 기존 모듈을 클릭하면 제거됩니다 (교체 후 재배치)`, cx, 62);
    } else {
      ctx.fillStyle = '#5577aa';
      ctx.fillText('유효한 슬롯(파란 테두리)을 클릭해 부착 · 기존 모듈을 클릭 드래그로 이동', cx, 62);
    }

    // ── 3. 마우스→그리드 좌표
    const hgx = Math.round((mouseX - cx) / CELL);
    const hgy = Math.round((mouseY - cy) / CELL);
    const isValidHover = pending && canPlace(hgx, hgy);

    // ── 4. 배치된 모듈 셀
    for (const [key, type] of grid) {
      const [gx, gy] = key.split(',').map(Number);
      const sx = cx + gx * CELL;
      const sy = cy + gy * CELL;

      if (type === 'CORE') {
        _drawCoreIcon(ctx, sx, sy);
      } else {
        const def   = MODULE_DEFS[type];
        const color = def ? def.color : '#334455';
        // 드래그 중이 아닐 때 hover된 모듈 강조
        const isDragHover = !_isDragging && (gx === hgx && gy === hgy);
        ctx.fillStyle = isDragHover ? (def ? def.color + 'cc' : '#334455cc') : (def ? def.color : '#334455');
        ctx.globalAlpha = isDragHover ? 1.0 : 0.9;
        ctx.fillRect(sx - HALF, sy - HALF, CELL, CELL);
        ctx.globalAlpha = 1.0;
        // 테두리: 드래그 가능 강조(hover) / 슬롯 포화 / 일반
        if (isDragHover) {
          ctx.strokeStyle = 'rgba(251,191,36,0.95)';
          ctx.lineWidth   = 2;
        } else if (isFull) {
          const pulse2 = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
          ctx.strokeStyle = `rgba(251,191,36,${0.5 + pulse2 * 0.5})`;
          ctx.lineWidth   = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(200,220,255,0.5)';
          ctx.lineWidth   = 1;
        }
        ctx.strokeRect(sx - HALF, sy - HALF, CELL, CELL);
      }
    }

    // ── 4b. 드래그 중: 원위치에 점선 테두리 표시
    if (_isDragging && pending) {
      const pulse3 = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = `rgba(251,191,36,${0.45 + pulse3 * 0.45})`;
      ctx.lineWidth   = 1.5;
      for (const c of pending.cells) {
        const ox = cx + (_dragOriginAnchorGx + c.gx) * CELL;
        const oy = cy + (_dragOriginAnchorGy + c.gy) * CELL;
        ctx.strokeRect(ox - HALF + 1, oy - HALF + 1, CELL - 2, CELL - 2);
      }
      ctx.setLineDash([]);
    }

    // ── 5. 유효 슬롯 표시
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
    for (const s of validSlots) {
      const sx = cx + s.gx * CELL;
      const sy = cy + s.gy * CELL;
      const isHover = (s.gx === hgx && s.gy === hgy);
      ctx.strokeStyle = isHover
        ? `rgba(100,220,255,0.9)`
        : `rgba(56,189,248,${0.3 + pulse * 0.4})`;
      ctx.lineWidth = isHover ? 2 : 1.5;
      ctx.strokeRect(sx - HALF + 1, sy - HALF + 1, CELL - 2, CELL - 2);
    }

    // ── 6. 호버 프리뷰
    if (pending && isValidHover) {
      ctx.globalAlpha = 0.45;
      for (const c of pending.cells) {
        const psx = cx + (hgx + c.gx) * CELL;
        const psy = cy + (hgy + c.gy) * CELL;
        ctx.fillStyle = pending.color;
        ctx.fillRect(psx - HALF, psy - HALF, CELL, CELL);
      }
      ctx.globalAlpha = 1;
    }

    // ── 7. 좌측 패널: 현재 장착 모듈 목록
    _drawInstalledPanel(ctx, W, H, player);

    // ── 8. 우측 패널: 모듈 인벤토리 (항상 표시)
    _drawModulePanel(ctx, W, H);

    // ── 9. 하단 힌트
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font      = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#334466';
    const scrap = player ? player.scrap : 0;
    ctx.fillText(
      `[W/S] 모듈 선택   [R] 회전   [Space] 닫기   [E] 슬롯 증설 (+${HULL_SLOT_EXPAND_AMOUNT}슬롯, ${HULL_SLOT_EXPAND_COST}Scrap)   [X] 그리드 위: 장착해제 / 대기모듈: 파괴+Scrap  ─  Scrap: ${scrap}`,
      cx, H - 28
    );
  }

  /** 좌측 패널: 현재 장착된 모듈 목록 */
  function _drawInstalledPanel(ctx, W, H, player) {
    const PAD  = 14;
    const PW   = 190;
    const PH   = Math.min(H - 120, 420);
    const px   = 16;
    const py   = (H - PH) / 2;
    const rad  = 10;
    const usedSlots = grid.size - 1;

    // 카드 배경
    ctx.fillStyle = 'rgba(8, 15, 40, 0.92)';
    _roundRect(ctx, px, py, PW, PH, rad);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99,179,237,0.3)';
    ctx.lineWidth   = 1;
    _roundRect(ctx, px, py, PW, PH, rad);
    ctx.stroke();

    // 헤더
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle    = '#7dd3fc';
    ctx.fillText('장착 모듈', px + PAD, py + PAD + 4);

    // 슬롯 사용량
    const slotText = `${usedSlots} / ${maxHullSlots} 슬롯`;
    const slotColor = usedSlots >= maxHullSlots ? '#fbbf24' : '#86efac';
    ctx.font      = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = slotColor;
    ctx.textAlign = 'right';
    ctx.fillText(slotText, px + PW - PAD, py + PAD + 4);

    // 슬롯 바
    const barY  = py + PAD + 18;
    const barW  = PW - PAD * 2;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px + PAD, barY, barW, 6);
    ctx.fillStyle = slotColor;
    ctx.fillRect(px + PAD, barY, barW * Math.min(1, usedSlots / maxHullSlots), 6);

    // 구분선
    ctx.strokeStyle = 'rgba(100,140,200,0.2)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(px + PAD, barY + 12);
    ctx.lineTo(px + PW - PAD, barY + 12);
    ctx.stroke();

    // 모듈 목록
    const listStartY = barY + 24;
    const itemH      = 36;
    const maxItems   = Math.floor((PH - (listStartY - py) - PAD * 2) / itemH);

    if (placedModules.length === 0) {
      ctx.font      = '12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.fillText('장착된 모듈 없음', px + PW / 2, listStartY + 20);
    } else {
      const visModules = placedModules.slice(0, maxItems);
      for (let i = 0; i < visModules.length; i++) {
        const m   = visModules[i];
        const def = MODULE_DEFS[m.type];
        if (!def) continue;
        const iy  = listStartY + i * itemH;

        // 색상 스워치 (티어 색상 테두리)
        const tc = TIER_COLORS[def.tier] ?? '#94a3b8';
        ctx.fillStyle = def.color;
        ctx.fillRect(px + PAD, iy + 6, 12, 12);
        ctx.strokeStyle = tc;
        ctx.lineWidth   = 1;
        ctx.strokeRect(px + PAD, iy + 6, 12, 12);

        // 모듈 이름
        ctx.font      = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText(def.name, px + PAD + 18, iy + 10);

        // 설명 or HP 바 (장갑판은 HP 바로 대체)
        if (m.maxHp > 0) {
          const ratio = Math.max(0, m.hp / m.maxHp);
          const hbx = px + PAD + 18, hby = iy + 18;
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(hbx, hby, PW - PAD * 2 - 18, 5);
          ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ef4444';
          ctx.fillRect(hbx, hby, (PW - PAD * 2 - 18) * ratio, 5);
          ctx.font = '9px "Segoe UI", sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'left';
          ctx.fillText(`내구도 ${Math.ceil(m.hp)}/${m.maxHp}`, hbx, iy + 32);
        } else {
          ctx.font      = '10px "Segoe UI", sans-serif';
          ctx.fillStyle = '#86efac';
          ctx.textAlign = 'left';
          ctx.fillText(def.desc, px + PAD + 18, iy + 24);
        }

        // 티어 뱃지
        ctx.font      = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = tc;
        ctx.textAlign = 'right';
        ctx.fillText(TIER_LABELS[def.tier] ?? '일반', px + PW - PAD, iy + 10);
      }
      if (placedModules.length > maxItems) {
        ctx.font      = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(`+${placedModules.length - maxItems}개 더...`, px + PW / 2, listStartY + maxItems * itemH + 8);
      }
    }

    // 스크랩 & 증설 정보
    const scrap = player ? player.scrap : 0;
    const footY = py + PH - PAD - 4;
    ctx.strokeStyle = 'rgba(100,140,200,0.2)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(px + PAD, footY - 24);
    ctx.lineTo(px + PW - PAD, footY - 24);
    ctx.stroke();
    ctx.font      = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`🔩 Scrap: ${scrap}`, px + PAD, footY - 10);
    const canExpand = scrap >= HULL_SLOT_EXPAND_COST;
    ctx.fillStyle = canExpand ? '#86efac' : '#475569';
    ctx.fillText(`[E] +${HULL_SLOT_EXPAND_AMOUNT}슬롯 (${HULL_SLOT_EXPAND_COST} Scrap)`, px + PAD, footY + 4);
  }

  /** 우측 패널: 제공 모듈 정보 카드 */
  /**
   * 우측 패널: 모듈 인벤토리 — 배치 대기(pending + 큐) + 장착 완료 목록 표시
   */
  /**
   * 우측 패널: 현재 선택 모듈 프리뷰 카드(W/S 선택) + 모듈 인벤토리 목록
   */
  function _drawModulePanel(ctx, W, H) {
    const PAD = 12;
    const PW  = 190;
    const PH  = Math.min(H - 100, 540);
    const px  = W - PW - 16;
    const py  = (H - PH) / 2;
    const rad = 10;

    // ── 패널 배경
    ctx.fillStyle = 'rgba(8, 15, 40, 0.93)';
    _roundRect(ctx, px, py, PW, PH, rad);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99,179,237,0.3)';
    ctx.lineWidth   = 1;
    _roundRect(ctx, px, py, PW, PH, rad);
    ctx.stroke();

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';

    let curY = py + PAD;

    // ──────── 상단: 선택 모듈 프리뷰 카드 ────────
    if (pending && !_isDragging) {
      const tier     = pending.tier ?? 'COMMON';
      const tc       = TIER_COLORS[tier] ?? '#94a3b8';
      const CARD_H   = 148;

      // 카드 배경 (티어 색상 테두리)
      ctx.fillStyle = 'rgba(14, 24, 60, 0.96)';
      _roundRect(ctx, px + PAD - 2, curY, PW - PAD * 2 + 4, CARD_H, 6);
      ctx.fill();
      ctx.strokeStyle = tc + 'bb';
      ctx.lineWidth   = 1.5;
      _roundRect(ctx, px + PAD - 2, curY, PW - PAD * 2 + 4, CARD_H, 6);
      ctx.stroke();

      // 티어 뱃지
      ctx.font      = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = tc;
      ctx.textAlign = 'left';
      ctx.fillText(`★ ${TIER_LABELS[tier] ?? '일반'}`, px + PAD + 4, curY + 12);

      // 선택 번호 (n/total)
      if (moduleQueue.length > 1) {
        ctx.font      = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.fillText(`${pendingSelectIdx + 1}/${moduleQueue.length}`, px + PW - PAD - 2, curY + 12);
      }

      // 모듈 이름
      ctx.font      = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e0f0ff';
      ctx.textAlign = 'left';
      ctx.fillText(pending.name, px + PAD + 4, curY + 28);

      // ── 5×5 미니 형태 프리뷰 (±2 범위)
      const mini  = 9;
      const gridW = 5 * mini;
      const offX  = px + PAD + 4;
      const offY  = curY + 38;
      ctx.strokeStyle = 'rgba(100,140,200,0.2)';
      ctx.lineWidth   = 0.5;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          ctx.strokeRect(offX + (c + 2) * mini, offY + (r + 2) * mini, mini, mini);
        }
      }
      // 모듈 셀 채우기
      for (const c of pending.cells) {
        if (c.gx >= -2 && c.gx <= 2 && c.gy >= -2 && c.gy <= 2) {
          ctx.fillStyle = pending.color;
          ctx.fillRect(offX + (c.gx + 2) * mini + 1, offY + (c.gy + 2) * mini + 1, mini - 2, mini - 2);
        }
      }
      // 코어 마커
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(offX + 2 * mini + 1, offY + 2 * mini + 1, mini - 2, mini - 2);

      // 설명 (오른쪽에 나머지 정보)
      const infoX = offX + gridW + 8;
      const infoW = px + PW - PAD - infoX - 2;
      ctx.font      = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#86efac';
      ctx.textAlign = 'left';
      // 설명 텍스트 (길면 줄바꿈)
      const descWords = pending.desc.split(' ');
      let line = '', lineY = offY + 6;
      for (const word of descWords) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > infoW && line) {
          ctx.fillText(line, infoX, lineY);
          line = word; lineY += 14;
        } else { line = test; }
      }
      if (line) ctx.fillText(line, infoX, lineY);

      ctx.font      = '9px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`${pending.cells.length}셀`, infoX, offY + 52);

      // ── 속성 뱃지 (무기 모듈이면 표시)
      const _ATTR_COLORS = { FIRE:'#ef4444', ELECTRIC:'#fbbf24', LASER:'#a78bfa', KINETIC:'#94a3b8', WATER:'#38bdf8' };
      const _ATTR_ICONS  = { FIRE:'🔥', ELECTRIC:'⚡', LASER:'💜', KINETIC:'🔩', WATER:'💧' };
      const _pendingAttrs = pending.bonus?.weaponAttrs ?? (pending.bonus?.weaponAttr ? [pending.bonus.weaponAttr] : []);
      if (_pendingAttrs.length > 0) {
        const attrBaseY = curY + (moduleQueue.length > 1 ? CARD_H - 28 : CARD_H - 16);
        let attrDrawX = px + PAD + 4;
        ctx.textAlign = 'left';
        for (const attr of _pendingAttrs) {
          const label = `${_ATTR_ICONS[attr] ?? ''} ${attr}`;
          ctx.font      = 'bold 9px "Segoe UI", sans-serif';
          ctx.fillStyle = _ATTR_COLORS[attr] ?? '#e2e8f0';
          ctx.fillText(label, attrDrawX, attrBaseY);
          attrDrawX += ctx.measureText(label).width + 8;
        }
      }

      // W/S 내비게이션 힌트
      if (moduleQueue.length > 1) {
        const navY = curY + CARD_H - 14;
        ctx.font      = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText('[W] ◀ 이전   [S] 다음 ▶', px + PW / 2, navY);
      }

      curY += CARD_H + 8;
    } else if (moduleQueue.length === 0 && !_isDragging) {
      // 대기 모듈 없음 표시
      ctx.font      = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'left';
      ctx.fillText('모듈 인벤토리', px + PAD, curY + 6);
      ctx.font      = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#334466';
      ctx.textAlign = 'center';
      ctx.fillText('대기 모듈 없음', px + PW / 2, curY + 28);
      curY += 44;
    } else {
      // 드래그 중: 헤더만
      ctx.font      = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'left';
      ctx.fillText('모듈 인벤토리', px + PAD, curY + 6);
      curY += 22;
    }

    // ── 구분선
    const maxY = py + PH - PAD;
    if (curY + 20 <= maxY) {
      ctx.strokeStyle = 'rgba(100,140,200,0.18)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(px + PAD, curY);
      ctx.lineTo(px + PW - PAD, curY);
      ctx.stroke();
      curY += 10;
    }

    const itemH = 36;

    // ──────── 대기 큐 목록 ────────
    if (moduleQueue.length > 0 && curY + 20 <= maxY) {
      ctx.font      = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText(`▶ 배치 대기  (${moduleQueue.length})`, px + PAD, curY + 4);
      curY += 16;

      for (let i = 0; i < moduleQueue.length && curY + itemH <= maxY; i++) {
        const key = moduleQueue[i];
        const def = MODULE_DEFS[key];
        if (!def) continue;
        const tier = def.tier ?? 'COMMON';
        const tc   = TIER_COLORS[tier] ?? '#94a3b8';
        const isSelected = (i === pendingSelectIdx);

        if (isSelected) {
          ctx.fillStyle = 'rgba(251,191,36,0.07)';
          ctx.fillRect(px + PAD - 2, curY, PW - PAD * 2 + 4, itemH - 2);
        }

        ctx.fillStyle = def.color;
        ctx.fillRect(px + PAD + 2, curY + 6, 11, 11);
        ctx.strokeStyle = tc;
        ctx.lineWidth   = isSelected ? 1.5 : 1;
        ctx.strokeRect(px + PAD + 2, curY + 6, 11, 11);

        ctx.font      = `${isSelected ? 'bold' : ''} 11px "Segoe UI", sans-serif`;
        ctx.fillStyle = isSelected ? '#fef08a' : '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText(def.name, px + PAD + 18, curY + 10);

        ctx.font      = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(def.desc, px + PAD + 18, curY + 23);

        ctx.font      = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = tc;
        ctx.textAlign = 'right';
        ctx.fillText(TIER_LABELS[tier] ?? '일반', px + PW - PAD, curY + 10);

        curY += itemH;
      }
      if (moduleQueue.length * itemH > (maxY - (curY - moduleQueue.length * itemH))) {
        // "더 있음" 표시는 루프가 maxY에서 끊겼을 때 자연스럽게 생략
      }
    }

    // ──────── 장착 완료 목록 ────────
    if (curY + 20 <= maxY) {
      ctx.strokeStyle = 'rgba(100,140,200,0.15)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(px + PAD, curY + 4);
      ctx.lineTo(px + PW - PAD, curY + 4);
      ctx.stroke();
      curY += 14;

      ctx.font      = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'left';
      ctx.fillText(`▶ 장착 완료  (${placedModules.length})`, px + PAD, curY + 4);
      curY += 16;

      if (placedModules.length === 0) {
        ctx.font      = '11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#334466';
        ctx.textAlign = 'center';
        ctx.fillText('장착된 모듈 없음', px + PW / 2, curY + 10);
      } else {
        for (let i = 0; i < placedModules.length && curY + itemH <= maxY; i++) {
          const m   = placedModules[i];
          const def = MODULE_DEFS[m.type];
          if (!def) continue;
          const tier = def.tier ?? 'COMMON';
          const tc   = TIER_COLORS[tier] ?? '#94a3b8';

          ctx.fillStyle = def.color;
          ctx.fillRect(px + PAD + 2, curY + 6, 11, 11);
          ctx.strokeStyle = tc;
          ctx.lineWidth   = 1;
          ctx.strokeRect(px + PAD + 2, curY + 6, 11, 11);

          ctx.font      = 'bold 11px "Segoe UI", sans-serif';
          ctx.fillStyle = '#e2e8f0';
          ctx.textAlign = 'left';
          ctx.fillText(def.name, px + PAD + 18, curY + 10);

          if (m.maxHp > 0) {
            const ratio = Math.max(0, m.hp / m.maxHp);
            const hbx = px + PAD + 18, hby = curY + 20;
            const hbw = PW - PAD * 2 - 20;
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(hbx, hby, hbw, 4);
            ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ef4444';
            ctx.fillRect(hbx, hby, hbw * ratio, 4);
            ctx.font = '9px "Segoe UI", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`${Math.ceil(m.hp)}/${m.maxHp}`, hbx, curY + 32);
          } else {
            ctx.font      = '10px "Segoe UI", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(def.desc, px + PAD + 18, curY + 23);
          }

          ctx.font      = '9px "Segoe UI", sans-serif';
          ctx.fillStyle = tc;
          ctx.textAlign = 'right';
          ctx.fillText(TIER_LABELS[tier] ?? '일반', px + PW - PAD, curY + 10);

          curY += itemH;
        }
        if (curY >= maxY && placedModules.length > 0) {
          const shown = Math.floor((maxY - py - PAD - 220) / itemH);
          const hidden = placedModules.length - Math.max(0, shown);
          if (hidden > 0) {
            ctx.font      = '10px "Segoe UI", sans-serif';
            ctx.fillStyle = '#475569';
            ctx.textAlign = 'center';
            ctx.fillText(`+${hidden}개 더...`, px + PW / 2, maxY - 4);
          }
        }
      }
    }
  }

  // ── 인벤토리 오버레이 드로우는 tetris/render.js 로 이동 (P0-2 stage 3)
  function drawInventory(ctx, W, H) {
    window.TetrisRender.drawInventory(ctx, W, H, { pending, moduleQueue, placedModules });
  }


  /** 장갑판 전체 내구도를 최대로 회복 (업그레이드: 긴급 수리) */
  function repairAllHull() {
    for (const mod of placedModules) {
      if (mod.maxHp > 0) mod.hp = mod.maxHp;
    }
  }

  /** 현재 장착된 장갑판 최대 내구도를 비율(mult)만큼 증폭 (업그레이드: 장갑 강화) */
  function boostHullMaxHp(mult) {
    for (const mod of placedModules) {
      if (mod.maxHp > 0) {
        const added = Math.ceil(mod.maxHp * (mult - 1));
        mod.maxHp += added;
        mod.hp = Math.min(mod.hp + added, mod.maxHp);
      }
    }
  }

  /** 그리드 Map 읽기 전용 반환 (Player.getHitPolygons() 에서 모듈 셀 좌표 참조용) */
  function getGrid() { return grid; }

  /** MODULE_DEFS 읽기 전용 반환 (WeaponCombine.js에서 weaponType/attr 참조용) */
  function getModuleDefs() { return MODULE_DEFS; }

  /**
   * 현재 장착된 무기 모듈 중 조합 가능한 쌍 목록 반환
   * @returns {{ keyA:string, keyB:string, result:string, name:string, desc:string }[]}
   */
  function getCraftableWeapons() {
    const wpnMods = placedModules.filter(m => {
      const def = MODULE_DEFS[m.type];
      return def && def.bonus && def.bonus.weapon;
    });
    const results = [];
    const seen = new Set();
    for (let i = 0; i < wpnMods.length; i++) {
      for (let j = i + 1; j < wpnMods.length; j++) {
        const a = wpnMods[i], b = wpnMods[j];
        const pairKey = [a.type, b.type].sort().join('|');
        if (seen.has(pairKey)) continue;
        const recipe = WeaponCombine.findRecipe(a.type, b.type);
        if (recipe) {
          results.push({
            keyA: a.type,
            keyB: b.type,
            anchorGxA: a.anchorGx, anchorGyA: a.anchorGy,
            anchorGxB: b.anchorGx, anchorGyB: b.anchorGy,
            ...recipe,
          });
          seen.add(pairKey);
        }
      }
    }
    return results;
  }

  /**
   * 무기 조합 실행 — 두 무기 해제 후 조합 결과를 큐에 추가
   * @param {number} anchorGxA - 무기 A 앵커 그리드 X
   * @param {number} anchorGyA
   * @param {number} anchorGxB - 무기 B 앵커 그리드 X
   * @param {number} anchorGyB
   * @param {string} resultKey - 결과 모듈 키
   * @param {object} player
   * @returns {boolean} 성공 여부
   */
  function craftCombine(anchorGxA, anchorGyA, anchorGxB, anchorGyB, resultKey, player) {
    const okA = unequipModule(anchorGxA, anchorGyA, player);
    const okB = unequipModule(anchorGxB, anchorGyB, player);
    if (!okA || !okB) return false;

    // 해제로 큐에 들어간 원본 두 무기를 제거
    const idxA = moduleQueue.indexOf(anchorGxA === anchorGxB && anchorGyA === anchorGyB ? resultKey : undefined);
    // 큐에서 원본 두 무기 타입 제거 (각각 첫 번째 매칭)
    // unequipModule이 queue.unshift로 추가하므로 0,1 번 인덱스에 있음
    moduleQueue.splice(0, 2);

    // 결과 무기 큐에 추가
    queueModule(resultKey);
    return true;
  }

  // ── 공개 API
  return {
    init,
    offerRandom,
    randomModuleKey,
    queueModule,
    queueRandomModule,
    nextModule,
    cyclePending,
    hasQueued,
    hasPending,
    setZoom,
    getQueueSize,
    getGrid,
    canPlace,
    place,
    recalcHitbox,
    rotatePending,
    handleClick,
    tryStartDrag,
    endDrag,
    isDragging,
    hitShip,
    updateFlash,
    drawShipModules,
    drawOnCanvas,
    drawInventory,
    repairAllHull,
    boostHullMaxHp,
    // 함체 슬롯 시스템
    expandHullSlots,
    getUsedSlots,
    getMaxSlots,
    getExpandCost,
    getExpandAmount,
    // 장착 해제 & 파괴
    unequipModule,
    scrapPending,
    // 조합 시스템
    getModuleDefs,
    getCraftableWeapons,
    craftCombine,
  };

})();

window.TetrisGrid = TetrisGrid;
