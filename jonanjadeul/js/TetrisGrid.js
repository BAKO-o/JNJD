/**
 * TetrisGrid.js — 테트리스형 함선 모듈 조립 시스템
 *
 * Phase 3: 레벨업 시 BUILDING 상태로 전환하여 캔버스 기반 조립 UI를 표시.
 * 플레이어는 코어 주변 유효 슬롯을 클릭하여 모듈을 부착한다.
 * 모듈 부착 후 player.hitboxRadius가 동적으로 재계산된다.
 */

const TetrisGrid = (() => {

  // ── 상수
  const CELL  = 22;   // 셀 크기 (px) — 게임플레이 & 조립 UI 공통
  const MAX_R = 7;    // 그리드 반경 (코어 기준 ±7 칸)
  const HALF  = CELL / 2;

  // ── 그리드 상태: Map<"gx,gy", moduleType string>
  const grid = new Map();

  // ── 현재 배치 대기 중인 모듈
  let pending     = null;  // { type, name, cells, color, desc, bonus }
  let validSlots  = [];    // 배치 가능한 앵커 위치 [{gx,gy}]
  let moduleQueue = [];    // 드랍된 모듈 대기 큐 (타입 문자열 배열)

  // ── 모듈 정의
  // cells: 앵커(0,0) 기준 차지하는 셀 오프셋 배열
  const MODULE_DEFS = {
    HULL_1: {
      name: '장갑판 I',
      cells: [{gx:0,gy:0}],
      color: '#64748b',
      desc: 'HP +25',
      bonus: { hp: 25 },
    },
    HULL_2: {
      name: '장갑판 II',
      cells: [{gx:0,gy:0},{gx:1,gy:0}],
      color: '#475569',
      desc: 'HP +50',
      bonus: { hp: 50 },
    },
    GUN_1: {
      name: '포탑 마운트',
      cells: [{gx:0,gy:0}],
      color: '#b45309',
      desc: '데미지 +15%',
      bonus: { damage: 0.15 },
    },
    GUN_2: {
      name: '이중 포탑',
      cells: [{gx:0,gy:0},{gx:0,gy:1}],
      color: '#92400e',
      desc: '데미지 +25% / 쿨다운 -15%',
      bonus: { damage: 0.25, cooldownMult: 0.85 },
    },
    THRUSTER: {
      name: '추진기',
      cells: [{gx:0,gy:0},{gx:-1,gy:0}],
      color: '#1e40af',
      desc: '이동속도 +15%',
      bonus: { speed: 0.15 },
    },
    WING_L: {
      name: '좌익 모듈',
      cells: [{gx:0,gy:0},{gx:0,gy:-1}],
      color: '#0e7490',
      desc: 'HP +20 / 속도 +8%',
      bonus: { hp: 20, speed: 0.08 },
    },
    WING_R: {
      name: '우익 모듈',
      cells: [{gx:0,gy:0},{gx:0,gy:1}],
      color: '#0e7490',
      desc: 'HP +20 / 속도 +8%',
      bonus: { hp: 20, speed: 0.08 },
    },

    // ── 무기 모듈 10종
    WPN_GATLING: {
      name: '개틀링포',
      cells: [{gx:0,gy:0}],
      color: '#dc2626',
      desc: '빠른 3방향 연사',
      bonus: { weapon: 'WPN_GATLING' },
    },
    WPN_SPREAD: {
      name: '산탄포',
      cells: [{gx:0,gy:0},{gx:1,gy:0}],
      color: '#ea580c',
      desc: '5발 부채꼴 발사',
      bonus: { weapon: 'WPN_SPREAD' },
    },
    WPN_SNIPER: {
      name: '저격포',
      cells: [{gx:0,gy:0},{gx:0,gy:1}],
      color: '#7c3aed',
      desc: '고데미지 단발 저격',
      bonus: { weapon: 'WPN_SNIPER' },
    },
    WPN_MISSILE: {
      name: '유도탄',
      cells: [{gx:0,gy:0},{gx:1,gy:0}],
      color: '#0891b2',
      desc: '호밍 미사일 발사',
      bonus: { weapon: 'WPN_MISSILE' },
    },
    WPN_FLAK: {
      name: '플랙포',
      cells: [{gx:0,gy:0}],
      color: '#ca8a04',
      desc: '8방향 근거리 폭발',
      bonus: { weapon: 'WPN_FLAK' },
    },
    WPN_ORBIT: {
      name: '궤도포',
      cells: [{gx:0,gy:0},{gx:0,gy:1}],
      color: '#059669',
      desc: '3개 공전 탄',
      bonus: { weapon: 'WPN_ORBIT' },
    },
    WPN_LASER: {
      name: '레이저포',
      cells: [{gx:0,gy:0}],
      color: '#2563eb',
      desc: '초고속 단일 연사',
      bonus: { weapon: 'WPN_LASER' },
    },
    WPN_MINE: {
      name: '기뢰',
      cells: [{gx:0,gy:0},{gx:1,gy:0}],
      color: '#7f1d1d',
      desc: '정지 기뢰 설치',
      bonus: { weapon: 'WPN_MINE' },
    },
    WPN_CHAIN: {
      name: '연쇄탄',
      cells: [{gx:0,gy:0}],
      color: '#9d174d',
      desc: '연쇄 충격파 3회',
      bonus: { weapon: 'WPN_CHAIN' },
    },
    WPN_NOVA: {
      name: '노바포',
      cells: [{gx:0,gy:0},{gx:0,gy:1}],
      color: '#6d28d9',
      desc: '전방향 12발 폭발',
      bonus: { weapon: 'WPN_NOVA' },
    },
  };

  const MODULE_KEYS = Object.keys(MODULE_DEFS);

  // ────────────────── 초기화 ──────────────────

  /** 그리드 초기화 — 코어(0,0) 배치 */
  function init() {
    grid.clear();
    grid.set('0,0', 'CORE');
    pending     = null;
    validSlots  = [];
    moduleQueue = [];
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
    return true;
  }

  // ────────────────── 배치 실행 ──────────────────

  /**
   * 랜덤 모듈을 pending으로 설정하고 유효 슬롯 계산
   * @returns {object} pending 모듈
   */
  function offerRandom() {
    const key  = MODULE_KEYS[Math.floor(Math.random() * MODULE_KEYS.length)];
    const def  = MODULE_DEFS[key];
    // 셀 배열 복사 (원본 불변)
    pending = { type: key, ...def, cells: def.cells.map(c => ({...c})) };
    validSlots = _calcValidSlots();
    return pending;
  }

  /**
   * 랜덤 모듈 타입 키 반환 (EnemyManager 드랍 시 호출)
   */
  function randomModuleKey() {
    return MODULE_KEYS[Math.floor(Math.random() * MODULE_KEYS.length)];
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
   * 큐에서 다음 모듈을 꺼내 pending으로 설정 (Q키 누를 때 Game.js에서 호출)
   * @returns {boolean} 성공 여부
   */
  function nextModule() {
    if (moduleQueue.length === 0) return false;
    const key = moduleQueue.shift();
    const def = MODULE_DEFS[key];
    pending = { type: key, ...def, cells: def.cells.map(c => ({...c})) };
    validSlots = _calcValidSlots();
    return true;
  }

  /** 큐 또는 pending에 모듈이 있으면 true */
  function hasQueued() {
    return moduleQueue.length > 0 || pending !== null;
  }

  /** HUD 뱃지용: 총 대기 모듈 수 */
  function getQueueSize() {
    return moduleQueue.length + (pending ? 1 : 0);
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

    for (const c of pending.cells) {
      grid.set(`${agx + c.gx},${agy + c.gy}`, pending.type);
    }

    _applyBonus(pending.bonus, player);
    recalcHitbox(player);

    pending    = null;
    validSlots = [];
    return true;
  }

  /** 보너스 적용 */
  function _applyBonus(bonus, player) {
    if (bonus.hp) {
      player.maxHp += bonus.hp;
      player.hp     = Math.min(player.maxHp, player.hp + bonus.hp);
    }
    if (bonus.speed)  player.speedMult  += bonus.speed;
    if (bonus.damage) player.damageMult += bonus.damage;
    if (bonus.cooldownMult) {
      const cur = WeaponSystem.getWeaponStat('cooldown') ?? 0.72;
      WeaponSystem.upgradeWeapon('cooldown', Math.max(0.15, cur * bonus.cooldownMult));
    }
    if (bonus.weapon) {
      WeaponSystem.addSecondary(bonus.weapon);
    }
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
    return place(gx, gy, player);
  }

  // ────────────────── 렌더링 ──────────────────

  /**
   * 게임플레이 중 함선 위에 모듈을 그린다 (함선 회전 적용)
   * Player.draw()에서 Renderer.drawPlayer() 호출 전에 실행
   */
  function drawShipModules(ctx, cx, cy, angle) {
    if (grid.size <= 1) return; // 코어만 있으면 스킵

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    for (const [key, type] of grid) {
      if (type === 'CORE') continue;
      const [gx, gy] = key.split(',').map(Number);
      const def = MODULE_DEFS[type];
      const color = def ? def.color : '#334455';

      ctx.fillStyle   = color;
      ctx.fillRect(gx * CELL - HALF, gy * CELL - HALF, CELL, CELL);
      ctx.strokeStyle = 'rgba(150,200,255,0.35)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(gx * CELL - HALF, gy * CELL - HALF, CELL, CELL);
    }

    ctx.restore();
  }

  /**
   * 조립 화면 전체를 캔버스에 그린다 (STATE.BUILDING 시 render()에서 호출)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - 화면 중앙 X
   * @param {number} cy - 화면 중앙 Y
   * @param {number} mouseX - 마우스 화면 X
   * @param {number} mouseY - 마우스 화면 Y
   */
  function drawOnCanvas(ctx, cx, cy, mouseX, mouseY) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // ── 1. 어두운 반투명 오버레이
    ctx.fillStyle = 'rgba(0, 2, 18, 0.80)';
    ctx.fillRect(0, 0, W, H);

    // ── 2. 헤더
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillStyle    = '#93c5fd';
    ctx.fillText('🔧 모듈 조립', cx, cy - CELL * 8 - 10);
    ctx.font      = '13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#5577aa';
    ctx.fillText('유효한 슬롯(파란 테두리)을 클릭하여 부착하세요', cx, cy - CELL * 8 + 22);

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
        const def    = MODULE_DEFS[type];
        const color  = def ? def.color : '#334455';
        ctx.fillStyle   = color;
        ctx.fillRect(sx - HALF, sy - HALF, CELL, CELL);
        ctx.strokeStyle = 'rgba(200,220,255,0.5)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(sx - HALF, sy - HALF, CELL, CELL);
      }
    }

    // ── 5. 유효 슬롯 표시
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.004); // 펄스 효과
    for (const s of validSlots) {
      const sx = cx + s.gx * CELL;
      const sy = cy + s.gy * CELL;
      const isHover = (s.gx === hgx && s.gy === hgy);

      ctx.strokeStyle = isHover
        ? `rgba(100,220,255,${0.9})`
        : `rgba(56,189,248,${0.3 + pulse * 0.4})`;
      ctx.lineWidth = isHover ? 2 : 1.5;
      ctx.strokeRect(sx - HALF + 1, sy - HALF + 1, CELL - 2, CELL - 2);
    }

    // ── 6. 호버 프리뷰 (배치 가능할 때 pending 모듈 반투명 표시)
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

    // ── 7. 우측 패널: 제공 모듈 카드
    if (pending) _drawModulePanel(ctx, W, H);

    // ── 8. 하단 힌트
    ctx.font      = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#334466';
    ctx.fillText('[Space] 건너뛰기', cx, H - 28);
  }

  /** 코어 아이콘 (작은 파란 삼각형) */
  function _drawCoreIcon(ctx, sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    const r = HALF * 0.75;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.6, -r * 0.75);
    ctx.lineTo(-r * 0.6,  r * 0.75);
    ctx.closePath();
    ctx.fillStyle   = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.restore();
  }

  /** 우측 패널: 제공 모듈 정보 카드 */
  function _drawModulePanel(ctx, W, H) {
    const PAD    = 16;
    const PW     = 170;
    const PH     = 160;
    const px     = W - PW - 24;
    const py     = H / 2 - PH / 2;
    const radius = 10;

    // 카드 배경
    ctx.fillStyle = 'rgba(10, 20, 50, 0.92)';
    _roundRect(ctx, px, py, PW, PH, radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 1;
    _roundRect(ctx, px, py, PW, PH, radius);
    ctx.stroke();

    // 헤더
    ctx.font      = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#7dd3fc';
    ctx.textAlign = 'left';
    ctx.fillText('제공 모듈', px + PAD, py + PAD + 4);

    // 모듈 이름
    ctx.font      = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e0f0ff';
    ctx.fillText(pending.name, px + PAD, py + PAD + 28);

    // 미니 형태 프리뷰 (3×3 그리드 미니어처)
    const mini  = 12;
    const offX  = px + PAD;
    const offY  = py + PAD + 45;
    ctx.strokeStyle = 'rgba(100,140,200,0.3)';
    ctx.lineWidth   = 0.5;
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        ctx.strokeRect(offX + c * mini + mini, offY + r * mini + mini, mini, mini);
      }
    }
    // 모듈 셀 채우기
    for (const c of pending.cells) {
      if (c.gx >= -1 && c.gx <= 1 && c.gy >= -1 && c.gy <= 1) {
        ctx.fillStyle = pending.color;
        ctx.fillRect(offX + c.gx * mini + mini, offY + c.gy * mini + mini, mini, mini);
      }
    }
    // 코어 표시
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(offX + mini, offY + mini, mini, mini);

    // 설명 (보너스)
    ctx.font      = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#86efac';
    ctx.fillText(pending.desc, px + PAD, py + PH - 28);

    // 타입 태그
    ctx.font      = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(pending.type, px + PAD, py + PH - 12);
  }

  /** 둥근 사각형 헬퍼 */
  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** 그리드 Map 읽기 전용 반환 (Player.getHitPolygons() 에서 모듈 셀 좌표 참조용) */
  function getGrid() { return grid; }

  // ── 공개 API
  return {
    init,
    offerRandom,
    randomModuleKey,
    queueModule,
    queueRandomModule,
    nextModule,
    hasQueued,
    getQueueSize,
    getGrid,
    canPlace,
    place,
    recalcHitbox,
    handleClick,
    drawShipModules,
    drawOnCanvas,
  };

})();

window.TetrisGrid = TetrisGrid;
