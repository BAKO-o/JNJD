'use strict';

const VERSION = 'v1.3.1';

// ================================================================
//  CONFIGURATION
// ================================================================
const CFG = Object.freeze(Object.assign({
  // Ants
  ANT_COUNT: 100,
  ANT_SPEED: 85,
  ANT_JITTER: 2.4,
  ANT_TURN: 3.8,
  ANT_SIZE: 5,
  LIFESPAN_BASE: 600,        // seconds (Phase 3: life cycle) — ×4
  LIFESPAN_VAR: 240,

  // Pheromone grid
  CELL: 6,
  DECAY: 0.9942,
  DIFF_RATE: 0.018,
  DIFF_EVERY: 3,
  MAX_PH: 255,

  // Deposit amounts
  DEP_HOME_WALK: 5,
  DEP_HOME_RET: 12,
  DEP_FOOD_RET: 170,
  BRUSH_STR: 20,

  // Sensors
  SENS_DIST: 26,
  SENS_ANG: Math.PI / 4,

  // Danger / flee
  FLEE_THRESH: 18,
  FLEE_TURN: 5.5,

  // Antlion pit
  PIT_COUNT: 1,
  PIT_R: 75,
  PIT_CAP: 12,
  PIT_SUCTION: 12,
  PIT_DANG_R: 50,
  PIT_DANG_STR: 220,
  PIT_MIN_DIST: 250,

  // World entities
  FOOD_COUNT: 20,         // ×2 food sources
  FOOD_PELLETS: 30,
  FOOD_R: 20,
  QUEEN_R: 22,
  HOME_RANGE: 38,
  HOME_SEED_R: 90,
  HOME_RESEED: 150,

  // Brush
  BRUSH_R: 34,

  // Phase 5: QWER brush modes + ant tuning thresholds
  CLEAN_THRESH: 8,
  RALLY_THRESH: 8,
  ENERGY_COST: 10,

  // Phase 6: Sprite animation
  ANIM_STRIDE: 10,

  // Phase 6 Step 2-4: Combat & Enemy faction
  COMBAT_RANGE: 14,
  COMBAT_TICK: 0.6,
  HP_BLACK: 3,
  HP_RED: 4,
  DMG_BLACK: 1,
  DMG_RED: 1,
  DEFEND_SCAN: 80,
  // Alarm pheromone system (worker combat)
  WORKER_SCAN: 85,   // how far a worker ant directly detects enemies
  ALARM_BURST_R: 70,   // radius of alarm pheromone burst when worker spots enemy
  ALARM_BURST_STR: 190,  // intensity of alarm burst
  ALARM_JOIN: 16,   // enemy pheromone level that pulls idle workers toward fight
  ENEMY_SPAWN_RATE: 8,          // red colony controls spawning now (this is fallback)
  ENEMY_MAX_ANTS: 60,
  ENEMY_INIT: 50,

  // Phase 7: Caste system
  HP_WORKER: 3,
  HP_SOLDIER: 8,
  HP_ACID: 2,
  HP_SCOUT: 4,
  DMG_SOLDIER: 3,
  SPEED_SOLDIER: 0.72,
  SPEED_ACID: 1.12,
  SPEED_SCOUT: 1.4,
  COST_WORKER: 2,          // 20% of original (10→2)
  COST_SOLDIER: 6,          // 20% of original (30→6)
  COST_ACID: 10,         // 20% of original (50→10)
  COST_SCOUT: 3,
  WAKE_THRESH: 15,       // threshold for idle workers/soldiers to wake up
  SOLDIER_SCAN: 120,
  ACID_RANGE: 80,
  ACID_COOLDOWN: 2.0,
  ACID_KITE_R: 50,
  ACID_PROJ_SPEED: 200,
  ACID_POOL_R: 20,
  ACID_POOL_LIFE: 2.0,
  ACID_POOL_DOT: 0.5,

  // Phase 8: 5× World expansion + Red Colony AI
  WORLD_MULT: 2,          // world is N× wider than viewport (5→2, ~1/3 축소)
  CAM_SPEED: 400,        // camera scroll speed px/s (arrow keys)
  RED_SOLDIER_RATIO: 0.38,     // fraction of red ants spawned as soldiers
  RED_LIFESPAN_BASE: 480,      // red ant base lifespan seconds — ×4
  RED_LIFESPAN_VAR: 200,
  RED_EGG_RATE: 9,          // seconds per red egg
  RED_HATCH_RATE: 13,         // seconds per red hatch
  RED_MAX_EGGS: 20,

  // Phase 9: Obstacles
  ROCK_COUNT: 18,
  ROCK_R_MIN: 18,
  ROCK_R_MAX: 44,
  BRANCH_COUNT: 15,
  BRANCH_LEN_MIN: 70,
  BRANCH_LEN_MAX: 160,
  BRANCH_W: 7,          // capsule half-width
  // Phase 8 ACO: Ecological steering weights for Return_Home
  // FinalVector = (Gravity * ACO_GRAVITY) + (Pheromone * ACO_PHEROMONE) + (Danger * ACO_DANGER)
  ACO_GRAVITY: 0.2,  // low constant pull toward nest when trails evaporate
  ACO_PHEROMONE: 0.8,  // primary navigation: follow home pheromone gradient
  ACO_DANGER: 3.0,  // strong repulsion from danger / enemy pheromones
  ACO_SENS_MULT: 1.6,  // sampling radius multiplier (vs SENS_DIST) for 8-dir gradient

  // Ant randomness — imperfect obedience
  CMD_IGNORE_PROB: 0.15, // probability of ignoring a pheromone command in IDLE_NEST (0–1)
  DISTRACT_PROB: 0.05,   // probability per second of wandering off during FOLLOW/RALLY/CLEAN_FOLLOW
}, typeof GAME_CONFIG !== 'undefined' ? GAME_CONFIG : {}));

// 장군 페로몬 모드 (QWER 키로 전환)
const PH_MODE = {
  food:   { key: 'Q', label: '먹이 유도',  color: '#50ff70' },
  danger: { key: 'W', label: '위험 경보',  color: '#ff4030' },
  clean:  { key: 'E', label: '청소 신호',  color: '#cc44ff' },
  rally:  { key: 'R', label: '집결 명령',  color: '#ff8820' },
};

// ================================================================
//  UTILITIES
// ================================================================
const TWO_PI = Math.PI * 2;
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

// ================================================================
//  SPRITE CACHE  — Phase 8: 10 cells
//  Slots: [worker-f0][worker-f1][soldier-f0][soldier-f1]
//         [acid-f0][acid-f1][red-worker-f0][red-worker-f1]
//         [red-soldier-f0][red-soldier-f1]
// ================================================================
class SpriteCache {
  static SIZE = 32;

  constructor() {
    const S = SpriteCache.SIZE;
    this._c = document.createElement('canvas');
    this._c.width = S * 14;
    this._c.height = S;
    const ctx = this._c.getContext('2d');
    // Black faction
    this._bakeWorker(ctx, 0, '#1c1c1c', '#3a3a3a', 0);
    this._bakeWorker(ctx, 1, '#1c1c1c', '#3a3a3a', 1);
    this._bakeSoldier(ctx, 2, '#2e1508', '#5e3012', 0);
    this._bakeSoldier(ctx, 3, '#2e1508', '#5e3012', 1);
    this._bakeAcid(ctx, 4, 0);
    this._bakeAcid(ctx, 5, 1);

    // Scout (Slots 10 & 11) - Lighter grey/blue color
    this._bakeWorker(ctx, 10, '#364147', '#5a6b75', 0);
    this._bakeWorker(ctx, 11, '#364147', '#5a6b75', 1);

    // Commander (Slots 12 & 13) - Gold/amber, regal
    this._bakeCommander(ctx, 12, 0);
    this._bakeCommander(ctx, 13, 1);

    // Red faction
    this._bakeWorker(ctx, 6, '#bb1414', '#6e0a0a', 0);
    this._bakeWorker(ctx, 7, '#bb1414', '#6e0a0a', 1);
    this._bakeSoldier(ctx, 8, '#6e0505', '#cc1515', 0);  // red soldier
    this._bakeSoldier(ctx, 9, '#6e0505', '#cc1515', 1);
  }

  _bakeWorker(ctx, slot, bodyCol, legCol, frame) {
    const S = SpriteCache.SIZE, ox = slot * S;
    const cx = S / 2, cy = S / 2;
    const roots = [2, 0, -2];
    const tilts = frame === 0 ? [0.42, 0, -0.42] : [-0.42, 0, 0.42];
    const legLen = 5.5;
    ctx.strokeStyle = legCol; ctx.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      const rx = ox + cx + roots[i];
      const ex = Math.sin(tilts[i]) * legLen * 0.55;
      const ey = Math.cos(tilts[i]) * legLen;
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + ex, cy - ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + ex, cy + ey); ctx.stroke();
    }
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.ellipse(ox + cx - 6, cy, 4.5, 3.2, 0, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + cx, cy, 2.8, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + cx + 5, cy, 2.2, 0, TWO_PI); ctx.fill();
  }

  _bakeSoldier(ctx, slot, bodyCol, legCol, frame) {
    const S = SpriteCache.SIZE, ox = slot * S;
    const cx = S / 2, cy = S / 2;
    const roots = [1, -1, -3];
    const tilts = frame === 0 ? [0.35, 0, -0.35] : [-0.35, 0, 0.35];
    const legLen = 5.5;
    ctx.strokeStyle = legCol; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const rx = ox + cx + roots[i];
      const ex = Math.sin(tilts[i]) * legLen * 0.55;
      const ey = Math.cos(tilts[i]) * legLen;
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + ex, cy - ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + ex, cy + ey); ctx.stroke();
    }
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.ellipse(ox + cx - 6, cy, 5.0, 3.8, 0, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + cx, cy, 3.5, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + cx + 5, cy, 3.0, 0, TWO_PI); ctx.fill();
    const hx = ox + cx + 5;
    ctx.strokeStyle = legCol; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hx + 3, cy - 1.5); ctx.lineTo(hx + 7, cy - 3.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 3, cy + 1.5); ctx.lineTo(hx + 7, cy + 3.5); ctx.stroke();
  }

  _bakeAcid(ctx, slot, frame) {
    const S = SpriteCache.SIZE, ox = slot * S;
    const cx = S / 2, cy = S / 2;
    const legCol = '#1a4a08';
    const roots = [2, 0, -2];
    const tilts = frame === 0 ? [0.42, 0, -0.42] : [-0.42, 0, 0.42];
    const legLen = 5;
    ctx.strokeStyle = legCol; ctx.lineWidth = 1.0;
    for (let i = 0; i < 3; i++) {
      const rx = ox + cx + roots[i];
      const ex = Math.sin(tilts[i]) * legLen * 0.55;
      const ey = Math.cos(tilts[i]) * legLen;
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + ex, cy - ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + ex, cy + ey); ctx.stroke();
    }
    ctx.fillStyle = '#3a7e10';
    ctx.beginPath(); ctx.ellipse(ox + cx - 6, cy, 6.0, 4.6, 0, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = '#5db820';
    ctx.beginPath(); ctx.ellipse(ox + cx - 5, cy - 1, 3.5, 2.5, -0.3, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = '#c8ff20';
    ctx.beginPath(); ctx.arc(ox + cx - 8, cy, 1.6, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = '#2a5e10';
    ctx.beginPath(); ctx.arc(ox + cx, cy, 2.3, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + cx + 5, cy, 1.9, 0, TWO_PI); ctx.fill();
  }

  _bakeCommander(ctx, slot, frame) {
    const S = SpriteCache.SIZE, ox = slot * S;
    const cx = S / 2, cy = S / 2;
    const bodyCol = '#c8860a', legCol = '#8a5500', crownCol = '#ffe040';
    const roots = [1, -1, -3];
    const tilts = frame === 0 ? [0.35, 0, -0.35] : [-0.35, 0, 0.35];
    const legLen = 6.0;
    // Legs — thick, gold-tinted
    ctx.strokeStyle = legCol; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const rx = ox + cx + roots[i];
      const ex = Math.sin(tilts[i]) * legLen * 0.55;
      const ey = Math.cos(tilts[i]) * legLen;
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + ex, cy - ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + ex, cy + ey); ctx.stroke();
    }
    // Body — amber/gold, larger than soldier
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.ellipse(ox + cx - 6, cy, 5.5, 4.2, 0, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + cx, cy, 4.0, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + cx + 6, cy, 3.2, 0, TWO_PI); ctx.fill();
    // Crown mark — bright yellow dot on head
    ctx.fillStyle = crownCol;
    ctx.beginPath(); ctx.arc(ox + cx + 6, cy - 1.5, 1.6, 0, TWO_PI); ctx.fill();
    // Large mandibles
    const hx = ox + cx + 6;
    ctx.strokeStyle = legCol; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(hx + 3, cy - 2); ctx.lineTo(hx + 8, cy - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 3, cy + 2); ctx.lineTo(hx + 8, cy + 5); ctx.stroke();
  }

  // role: 'worker'|'soldier'|'acid'|'scout'|'commander'   faction: 'black'|'red'
  draw(ctx, role, faction, animFrame, x, y, angle, overlay) {
    const S = SpriteCache.SIZE;
    let slot;
    if (faction === 'red') {
      const base = role === 'soldier' ? 8 : 6;
      slot = base + (animFrame & 1);
    } else {
      const base = role === 'commander' ? 12 : role === 'soldier' ? 2 : role === 'acid' ? 4 : role === 'scout' ? 10 : 0;
      slot = base + (animFrame & 1);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(this._c, slot * S, 0, S, S, -S / 2, -S / 2, S, S);
    if (overlay) {
      ctx.beginPath(); ctx.arc(-2, 0, 2.8, 0, TWO_PI);
      ctx.fillStyle = overlay; ctx.fill();
    }
    ctx.restore();
  }
}

// ================================================================
//  SPATIAL HASH  — O(N) proximity queries for combat
// ================================================================
class SpatialHash {
  constructor(cellSize) { this.cs = cellSize; this._m = new Map(); }
  clear() { this._m.clear(); }
  _k(x, y) { return `${Math.floor(x / this.cs)},${Math.floor(y / this.cs)}`; }
  insert(obj) {
    const k = this._k(obj.x, obj.y);
    let cell = this._m.get(k);
    if (!cell) { cell = []; this._m.set(k, cell); }
    cell.push(obj);
  }
  nearby(x, y, r) {
    const out = [], cs = this.cs;
    const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs);
    const y0 = Math.floor((y - r) / cs), y1 = Math.floor((y + r) / cs);
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++) {
        const cell = this._m.get(`${cx},${cy}`);
        if (cell) for (const o of cell) out.push(o);
      }
    return out;
  }
}

// ================================================================
//  PHEROMONE GRID  — Phase 8: adds red_food / red_home / red_clean
// ================================================================
class PheromoneGrid {
  constructor(w, h) { this._build(Math.ceil(w / CFG.CELL), Math.ceil(h / CFG.CELL)); }

  _build(cols, rows) {
    this.cols = cols; this.rows = rows;
    const n = cols * rows;

    // Unified faction pheromone matrices
    this.ph = {
      black: {
        food: new Float32Array(n),
        home: new Float32Array(n),
        danger: new Float32Array(n),
        clean: new Float32Array(n),
        rally: new Float32Array(n),
        enemy: new Float32Array(n)
      },
      red: {
        food: new Float32Array(n),
        home: new Float32Array(n),
        danger: new Float32Array(n),
        clean: new Float32Array(n),
        rally: new Float32Array(n),
        enemy: new Float32Array(n)
      }
    };

    this._tmp = new Float32Array(n);
    this.decayRate = null;
    this._off = document.createElement('canvas');
    this._off.width = cols; this._off.height = rows;
    this._offCtx = this._off.getContext('2d');
    this._img = this._offCtx.createImageData(cols, rows);
  }

  resize(w, h) {
    const c = Math.ceil(w / CFG.CELL), r = Math.ceil(h / CFG.CELL);
    if (c !== this.cols || r !== this.rows) this._build(c, r);
  }

  _cx(wx) { return (wx / CFG.CELL) | 0; }
  _cy(wy) { return (wy / CFG.CELL) | 0; }
  _i(cx, cy) { return cy * this.cols + cx; }
  _ok(cx, cy) { return cx >= 0 && cx < this.cols && cy >= 0 && cy < this.rows; }

  // Unified read/deposit/paint accessors
  readF(faction, channel, wx, wy) {
    const cx = this._cx(wx), cy = this._cy(wy);
    return this._ok(cx, cy) ? this.ph[faction][channel][this._i(cx, cy)] : 0;
  }

  depositF(faction, channel, wx, wy, v) {
    const cx = this._cx(wx), cy = this._cy(wy);
    if (!this._ok(cx, cy)) return;
    const i = this._i(cx, cy);
    const arr = this.ph[faction][channel];
    arr[i] = Math.min(CFG.MAX_PH, arr[i] + v);
  }

  paintF(faction, channel, wx, wy, radius, strength) {
    const gcx = this._cx(wx), gcy = this._cy(wy);
    const gr = Math.ceil(radius / CFG.CELL), gr2 = (radius / CFG.CELL) ** 2;
    const { cols, rows } = this;
    const arr = this.ph[faction][channel];
    for (let dy = -gr; dy <= gr; dy++) {
      for (let dx = -gr; dx <= gr; dx++) {
        if (dx * dx + dy * dy > gr2) continue;
        const nx = gcx + dx, ny = gcy + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const i = this._i(nx, ny);
        arr[i] = Math.min(CFG.MAX_PH, arr[i] + strength);
      }
    }
  }

  update(frame) {
    const d = this.decayRate ?? CFG.DECAY;
    const n = this.ph.black.food.length;

    // Decay all channels dynamically
    for (const faction of ['black', 'red']) {
      for (const channel in this.ph[faction]) {
        const arr = this.ph[faction][channel];
        for (let i = 0; i < n; i++) {
          arr[i] *= d;
          if (arr[i] < 0.5) arr[i] = 0;
        }
      }
    }

    // Diffuse all channels dynamically
    if (frame % CFG.DIFF_EVERY === 0) {
      for (const faction of ['black', 'red']) {
        for (const channel in this.ph[faction]) {
          this._diffuse(this.ph[faction][channel]);
        }
      }
    }
  }

  _diffuse(arr) {
    const { cols, rows, _tmp: tmp } = this;
    const r = CFG.DIFF_RATE;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        let sum = 0, cnt = 0;
        if (cx > 0) { sum += arr[i - 1]; cnt++; }
        if (cx < cols - 1) { sum += arr[i + 1]; cnt++; }
        if (cy > 0) { sum += arr[i - cols]; cnt++; }
        if (cy < rows - 1) { sum += arr[i + cols]; cnt++; }
        const v = arr[i] * (1 - r) + (cnt ? sum / cnt : 0) * r;
        tmp[i] = v < 0.5 ? 0 : v;
      }
    }
    arr.set(tmp);
  }

  // Render black colony channels only; red channels invisible
  render(ctx, worldW, worldH) {
    const { cols, rows, ph } = this;
    const { food, home, danger, clean, rally } = ph.black;
    const data = this._img.data;
    for (let i = 0, p = 0; i < cols * rows; i++, p += 4) {
      const f = food[i], h = home[i], dg = danger[i], cl = clean[i], ra = rally[i];
      data[p] = Math.min(255, dg * 1.6 + cl * 0.7 + ra * 1.0) | 0;
      data[p + 1] = Math.min(255, f * 1.3 + ra * 0.65) | 0;
      data[p + 2] = Math.min(255, h * 1.3 + cl * 1.4) | 0;
      const mx1 = dg > f ? (dg > h ? dg : h) : (f > h ? f : h);
      const mx2 = cl > ra ? cl : ra;
      data[p + 3] = Math.min(200, mx1 > mx2 ? mx1 : mx2) | 0;
    }
    this._offCtx.putImageData(this._img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._off, 0, 0, worldW, worldH);
  }
}

// ================================================================
//  PARTICLE  — death-burst sprite
// ================================================================
class Particle {
  constructor(x, y) {
    const a = Math.random() * TWO_PI, spd = 30 + Math.random() * 60;
    this.x = x; this.y = y;
    this.vx = Math.cos(a) * spd; this.vy = Math.sin(a) * spd;
    this.life = 0; this.max = 0.35 + Math.random() * 0.4;
  }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.87; this.vy *= 0.87;
    return (this.life += dt) < this.max;
  }
  draw(ctx) {
    const t = 1 - this.life / this.max;
    ctx.save(); ctx.globalAlpha = t * 0.92;
    ctx.beginPath(); ctx.arc(this.x, this.y, 1.5 + t * 2.5, 0, TWO_PI);
    ctx.fillStyle = `rgb(255,${(55 + t * 125) | 0},0)`; ctx.fill();
    ctx.restore();
  }
}

// ================================================================
//  PROJECTILE  — acid glob fired by Acid-Shooter ants
// ================================================================
class Projectile {
  constructor(x, y, tx, ty) {
    this.x = x; this.y = y;
    this.tx = tx; this.ty = ty;
    const d = Math.sqrt((tx - x) ** 2 + (ty - y) ** 2) || 1;
    this.vx = (tx - x) / d * CFG.ACID_PROJ_SPEED;
    this.vy = (ty - y) / d * CFG.ACID_PROJ_SPEED;
    this.done = false;
    this._anim = 0;
  }
  update(dt) {
    if (this.done) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this._anim += dt;
    const dx = this.tx - this.x, dy = this.ty - this.y;
    if (dx * this.vx + dy * this.vy <= 0) this.done = true;
  }
  draw(ctx) {
    if (this.done) return;
    const pulse = 1 + Math.sin(this._anim * 18) * 0.25;
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = '#88ff00';
    ctx.beginPath(); ctx.arc(this.x, this.y, 3.5 * pulse, 0, TWO_PI);
    ctx.fillStyle = '#aaff30'; ctx.fill();
    ctx.restore();
  }
}

// ================================================================
//  ACID POOL  — AoE hazard created when a Projectile lands
// ================================================================
class AcidPool {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.life = CFG.ACID_POOL_LIFE;
    this.r = CFG.ACID_POOL_R;
    this.dead = false;
    this._anim = Math.random() * TWO_PI;
  }
  update(dt, redHash) {
    this._anim = (this._anim + dt * 3) % TWO_PI;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const r2 = this.r * this.r;
    const near = redHash.nearby(this.x, this.y, this.r);
    for (const ra of near) {
      if (!ra.dead && dist2(this.x, this.y, ra.x, ra.y) < r2) {
        ra.hp -= CFG.ACID_POOL_DOT * dt;
      }
    }
  }
  draw(ctx) {
    const { x, y, r, life } = this;
    const t = life / CFG.ACID_POOL_LIFE;
    ctx.save();
    ctx.globalAlpha = 0.2 + t * 0.45;
    ctx.beginPath(); ctx.arc(x, y, r * (0.7 + Math.sin(this._anim) * 0.08), 0, TWO_PI);
    ctx.fillStyle = `rgba(90,220,20,0.55)`; ctx.fill();
    ctx.strokeStyle = `rgba(180,255,30,${0.5 + t * 0.4})`; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ================================================================
//  ROCK  — circular obstacle; ants are physically pushed out
// ================================================================
class Rock {
  constructor(x, y, r) {
    this.x = x; this.y = y; this.r = r;
    // Pre-compute irregular polygon offsets for stable rendering
    this._pts = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * TWO_PI;
      const rr = r * (0.78 + Math.random() * 0.32);
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
    });
    this._hue = 18 + Math.floor(Math.random() * 18); // subtle warm tint
  }

  // Push ant out if it overlaps the rock; deflect angle along surface normal.
  resolveAnt(ant) {
    const dx = ant.x - this.x, dy = ant.y - this.y;
    const d2 = dx * dx + dy * dy;
    const minD = this.r + 3;
    if (d2 < minD * minD && d2 > 0.01) {
      const d = Math.sqrt(d2);
      ant.x = this.x + (dx / d) * minD;
      ant.y = this.y + (dy / d) * minD;
      ant.angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2;
      return true;
    }
    return false;
  }

  draw(ctx) {
    const { x, y, r, _pts } = this;
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.45)';
    // Irregular rock polygon
    ctx.beginPath();
    ctx.moveTo(x + _pts[0].x, y + _pts[0].y);
    for (let i = 1; i < _pts.length; i++) ctx.lineTo(x + _pts[i].x, y + _pts[i].y);
    ctx.closePath();
    const g = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.08, x, y, r * 1.1);
    g.addColorStop(0, `hsl(${this._hue},14%,64%)`);
    g.addColorStop(0.55, `hsl(${this._hue},11%,44%)`);
    g.addColorStop(1, `hsl(${this._hue}, 9%,30%)`);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `hsl(${this._hue},7%,22%)`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowBlur = 0;
    // Surface highlight
    ctx.beginPath();
    ctx.ellipse(x - r * 0.18, y - r * 0.22, r * 0.38, r * 0.18, -0.6, 0, TWO_PI);
    ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fill();
    ctx.restore();
  }
}

// ================================================================
//  BRANCH  — capsule (line-segment + width) obstacle
// ================================================================
class Branch {
  constructor(x1, y1, x2, y2, w) {
    this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
    this.w = w;
    this._angle = Math.atan2(y2 - y1, x2 - x1);
    this._len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    // Pre-compute bark knot positions for stable rendering
    this._knots = [];
    for (let pos = -this._len / 2 + 12; pos < this._len / 2 - 8; pos += 16 + Math.random() * 10) {
      this._knots.push({ pos, wave: (Math.random() - 0.5) * w * 0.6 });
    }
  }

  // Closest point on the line segment to (px, py)
  _closest(px, py) {
    const abx = this.x2 - this.x1, aby = this.y2 - this.y1;
    const len2 = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((px - this.x1) * abx + (py - this.y1) * aby) / len2));
    return { x: this.x1 + t * abx, y: this.y1 + t * aby };
  }

  // Push ant out of capsule; deflect angle along surface.
  resolveAnt(ant) {
    const { x: cx, y: cy } = this._closest(ant.x, ant.y);
    const dx = ant.x - cx, dy = ant.y - cy;
    const d2 = dx * dx + dy * dy;
    const minD = this.w + 3;
    if (d2 < minD * minD && d2 > 0.01) {
      const d = Math.sqrt(d2);
      ant.x = cx + (dx / d) * minD;
      ant.y = cy + (dy / d) * minD;
      ant.angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.9;
      return true;
    }
    return false;
  }

  draw(ctx) {
    const { x1, y1, x2, y2, w, _angle: a, _len: len, _knots } = this;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.shadowBlur = 7; ctx.shadowColor = 'rgba(0,0,0,0.35)';
    // Branch body (rounded rect)
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-len / 2, -w, len, w * 2, w);
    } else {
      ctx.rect(-len / 2, -w, len, w * 2);
    }
    const g = ctx.createLinearGradient(0, -w, 0, w);
    g.addColorStop(0, '#8a5228');
    g.addColorStop(0.38, '#5e3414');
    g.addColorStop(1, '#3c1e08');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#2a1005'; ctx.lineWidth = 1; ctx.stroke();
    ctx.shadowBlur = 0;
    // Bark grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.9;
    for (const k of _knots) {
      ctx.beginPath();
      ctx.moveTo(k.pos, -w * 0.5 + k.wave);
      ctx.lineTo(k.pos + 7, w * 0.55 + k.wave);
      ctx.stroke();
    }
    // Top highlight
    ctx.beginPath();
    ctx.rect(-len / 2 + 4, -w + 1, len - 8, w * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.restore();
  }
}

// ================================================================
//  FOOD SOURCE
// ================================================================
// ================================================================
//  DRAGGABLE OBJECT — Phase 10: 협동 운반 물리 기반 클래스
// ================================================================
class DraggableObject {
  constructor(x, y, pellets, mass) {
    this.x = x; this.y = y;
    this.pellets = pellets;
    this._maxPellets = pellets;
    this.mass = mass;
    this.active = true;
    this.vx = 0; this.vy = 0;
    this.attachedAnts = [];
    this._anim = Math.random() * TWO_PI;
  }

  /** 개미 부착 시도. 반경 내 미부착이면 true 반환 */
  tryAttach(ant) {
    if (!this.active) return false;
    if (this.attachedAnts.includes(ant)) return false;
    const dx = ant.x - this.x, dy = ant.y - this.y;
    // 겉면 접촉 판정: 오브젝트 시각 반경 + 여유 6px 이내
    const touchR = (this.r ?? CFG.ATTACH_R) + 6;
    if (dx * dx + dy * dy > touchR * touchR) return false;
    this.attachedAnts.push(ant);
    return true;
  }

  /** 개미 이탈 */
  detach(ant) {
    const idx = this.attachedAnts.indexOf(ant);
    if (idx !== -1) this.attachedAnts.splice(idx, 1);
  }

  /** 질량 기준 필요 최소 개미 수 */
  requiredAnts() {
    return Math.max(CFG.ATTACH_MIN_ANTS, Math.floor(this.mass * CFG.ATTACH_REQUIRED_MULT));
  }

  /**
   * 물리 업데이트: 부착 개미들의 합력 벡터로 오브젝트를 이동
   * @param {number} dt  델타 타임 (초)
   * @param {number} cw  월드 너비
   * @param {number} ch  월드 높이
   */
  update(dt, cw, ch) {
    this._anim = (this._anim + dt * 1.2) % TWO_PI;
    if (!this.active) return;

    // 죽은/이탈한 개미 참조 정리 (STATE.ATTACHED = 8)
    this.attachedAnts = this.attachedAnts.filter(a => !a.dead && a.state === 8);

    const n = this.attachedAnts.length;
    if (n < this.requiredAnts()) {
      // 최소 인원 미달: 속도 감쇠만 적용
      const slowDrag = Math.max(0, 1 - CFG.DRAG_COEFF * 0.3 * dt);
      this.vx *= slowDrag; this.vy *= slowDrag;
      return;
    }

    // 합력 벡터: 각 개미의 진행 방향(angle) 단위벡터 합산
    let fx = 0, fy = 0;
    for (const ant of this.attachedAnts) {
      fx += Math.cos(ant.angle);
      fy += Math.sin(ant.angle);
    }
    const fMag = Math.sqrt(fx * fx + fy * fy) || 1;

    // 가속도 = (힘 × 개미 수) / 질량
    const accel = (CFG.DRAG_FORCE_PER_ANT * n) / this.mass;
    this.vx += (fx / fMag) * accel * dt;
    this.vy += (fy / fMag) * accel * dt;

    // 선형 항력
    const drag = Math.max(0, 1 - CFG.DRAG_COEFF * dt);
    this.vx *= drag; this.vy *= drag;

    // 최대 속도 클램핑
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > CFG.DRAG_MAX_SPEED) {
      this.vx = (this.vx / spd) * CFG.DRAG_MAX_SPEED;
      this.vy = (this.vy / spd) * CFG.DRAG_MAX_SPEED;
    }

    // 위치 적분
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 월드 경계 반사
    const m = 8;
    if (this.x < m)      { this.x = m;      this.vx =  Math.abs(this.vx) * 0.3; }
    if (this.x > cw - m) { this.x = cw - m; this.vx = -Math.abs(this.vx) * 0.3; }
    if (this.y < m)      { this.y = m;      this.vy =  Math.abs(this.vy) * 0.3; }
    if (this.y > ch - m) { this.y = ch - m; this.vy = -Math.abs(this.vy) * 0.3; }
  }
}

// ================================================================
//  FOOD  — 5종 시각화: 씨앗/잎/열매/버섯/감로
// ================================================================
class Food extends DraggableObject {
  // scale: 0.7 ~ 1.5 (70%~150% of base size); random if omitted
  constructor(x, y, scale) {
    const s = scale ?? (0.7 + Math.random() * 0.8);
    const pellets = Math.max(5, Math.round(CFG.FOOD_PELLETS * s));
    const mass = CFG.DRAG_BASE_MASS + pellets * CFG.DRAG_MASS_PER_PELLET;
    super(x, y, pellets, mass);
    this.scale = s;
    this.r = CFG.FOOD_R * s;
    // 먹이 종류 결정 (씨앗 2배 확률)
    const types = ['seed', 'seed', 'leaf', 'berry', 'mushroom', 'honeydew'];
    this.type = types[Math.floor(Math.random() * types.length)];
    // 버섯 점 위치, 열매 색상 등 인스턴스별 고정 랜덤
    this._rng = Math.random();
  }

  draw(ctx) {
    if (!this.active) return;
    const t = this.pellets / this._maxPellets;
    const r = this.r * (0.55 + 0.45 * t);
    const pulse = 1 + Math.sin(this._anim) * 0.06;
    const { x, y, type } = this;

    ctx.save();
    switch (type) {
      case 'seed': this._drawSeed(ctx, x, y, r * pulse, t); break;
      case 'leaf': this._drawLeaf(ctx, x, y, r * pulse, t); break;
      case 'berry': this._drawBerry(ctx, x, y, r * pulse, t); break;
      case 'mushroom': this._drawMushroom(ctx, x, y, r * pulse, t); break;
      case 'honeydew': this._drawHoneydew(ctx, x, y, r * pulse, t); break;
    }

    // 부착 상태 표시
    const n = this.attachedAnts.length, req = this.requiredAnts();
    if (n > 0) {
      ctx.strokeStyle = n >= req ? '#ffaa00' : '#ff6644';
      ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(x, y, r + 6, 0, TWO_PI); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe080'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${n}/${req}`, x, y + r + 16);
    }

    // 펠릿 수 라벨
    const emoji = { seed: '🌰', leaf: '🍃', berry: '🍇', mushroom: '🍄', honeydew: '🍯' }[type];
    ctx.fillStyle = 'rgba(255,255,220,0.9)'; ctx.font = '10px monospace';
    ctx.textAlign = 'center'; ctx.fillText(`${emoji} ${this.pellets}`, x, y - r - 6);
    ctx.restore();
  }

  // ── 씨앗: 타원형 갈색, 가운데 세로줄 ──────────────────────────
  _drawSeed(ctx, x, y, r, t) {
    ctx.shadowBlur = 10; ctx.shadowColor = `rgba(180,120,40,${t * 0.5})`;
    ctx.save(); ctx.translate(x, y); ctx.rotate(this._rng * TWO_PI);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.75, r, 0, 0, TWO_PI);
    ctx.fillStyle = `rgba(${160 + (t * 40) | 0},${100 + (t * 30) | 0},30,0.92)`; ctx.fill();
    ctx.strokeStyle = `rgba(220,160,60,${0.5 + t * 0.4})`; ctx.lineWidth = 1.5; ctx.stroke();
    // 중앙 세로줄
    ctx.strokeStyle = `rgba(100,60,10,0.55)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6); ctx.stroke();
    ctx.restore(); ctx.shadowBlur = 0;
  }

  // ── 잎: 타원 + 잎맥 ──────────────────────────────────────────
  _drawLeaf(ctx, x, y, r, t) {
    const g = (70 + t * 80) | 0;
    ctx.shadowBlur = 14; ctx.shadowColor = `rgba(30,${g + 50},30,${t * 0.6})`;
    ctx.save(); ctx.translate(x, y); ctx.rotate(this._rng * TWO_PI);
    // 잎 외형
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.8, -r * 0.4, r * 0.8, r * 0.4, 0, r);
    ctx.bezierCurveTo(-r * 0.8, r * 0.4, -r * 0.8, -r * 0.4, 0, -r);
    ctx.fillStyle = `rgba(20,${g + 60},20,0.88)`; ctx.fill();
    ctx.strokeStyle = `rgba(60,${g + 100},40,${0.5 + t * 0.4})`; ctx.lineWidth = 1.5; ctx.stroke();
    // 중앙 잎맥
    ctx.strokeStyle = `rgba(10,${g + 30},10,0.45)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.75); ctx.lineTo(0, r * 0.75); ctx.stroke();
    // 측면 잎맥 2개
    for (const dir of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(dir * r * 0.45, r * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, r * 0.2); ctx.lineTo(dir * r * 0.4, r * 0.5); ctx.stroke();
    }
    ctx.restore(); ctx.shadowBlur = 0;
  }

  // ── 열매: 동그란 베리, 하이라이트 ───────────────────────────
  _drawBerry(ctx, x, y, r, t) {
    // 색상 변형: rng 기준으로 빨강/보라/남색
    const hues = [[180,20,60], [120,10,140], [50,20,160]];
    const [rv, gv, bv] = hues[Math.floor(this._rng * 3)];
    ctx.shadowBlur = 16; ctx.shadowColor = `rgba(${rv},${gv},${bv},${t * 0.7})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fillStyle = `rgba(${rv},${gv},${bv},0.9)`; ctx.fill();
    ctx.strokeStyle = `rgba(${rv + 40},${gv + 40},${bv + 40},${0.5 + t * 0.4})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowBlur = 0;
    // 하이라이트
    ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.25, 0, TWO_PI);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    // 꼭지
    ctx.strokeStyle = 'rgba(20,80,20,0.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.2, y - r * 1.35); ctx.stroke();
  }

  // ── 버섯: 갓 + 흰 점 + 기둥 ─────────────────────────────────
  _drawMushroom(ctx, x, y, r, t) {
    const stemH = r * 0.55, capR = r * 0.95;
    // 기둥
    ctx.fillStyle = `rgba(240,230,210,0.85)`;
    ctx.beginPath();
    ctx.rect(x - r * 0.22, y - stemH * 0.2, r * 0.44, stemH * 0.8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,160,120,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    // 갓
    ctx.shadowBlur = 12; ctx.shadowColor = `rgba(180,50,20,${t * 0.6})`;
    ctx.beginPath(); ctx.arc(x, y - stemH * 0.3, capR, Math.PI, 0);
    ctx.fillStyle = `rgba(${180 + (t * 40) | 0},${40 + (t * 20) | 0},20,0.92)`; ctx.fill();
    ctx.strokeStyle = `rgba(220,80,40,${0.4 + t * 0.4})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowBlur = 0;
    // 흰 점 (rng 기준 2~3개)
    const spots = this._rng > 0.5 ? 3 : 2;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < spots; i++) {
      const sx = x + Math.cos((i / spots) * Math.PI + 0.3) * capR * 0.45;
      const sy = y - stemH * 0.3 - capR * 0.28 + Math.sin((i / spots) * Math.PI * 0.5) * capR * 0.1;
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.12, 0, TWO_PI); ctx.fill();
    }
  }

  // ── 감로: 반투명 황금 물방울 ─────────────────────────────────
  _drawHoneydew(ctx, x, y, r, t) {
    ctx.shadowBlur = 18; ctx.shadowColor = `rgba(255,200,30,${t * 0.7})`;
    ctx.save(); ctx.translate(x, y); ctx.rotate(this._rng * TWO_PI);
    // 물방울 형태
    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 0.7, 0, TWO_PI);
    ctx.moveTo(-r * 0.35, -r * 0.1);
    ctx.bezierCurveTo(-r * 0.35, -r * 0.9, r * 0.35, -r * 0.9, r * 0.35, -r * 0.1);
    ctx.arc(0, r * 0.1, r * 0.7, Math.PI + 0.52, TWO_PI - 0.52);
    ctx.fillStyle = `rgba(255,${185 + (t * 40) | 0},20,0.75)`; ctx.fill();
    ctx.strokeStyle = `rgba(255,220,80,${0.5 + t * 0.4})`; ctx.lineWidth = 1.5; ctx.stroke();
    // 하이라이트
    ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.2, r * 0.2, 0, TWO_PI);
    ctx.fillStyle = 'rgba(255,255,200,0.3)'; ctx.fill();
    ctx.restore(); ctx.shadowBlur = 0;
  }
}

// ================================================================
//  CARCASS  — high-value food dropped when an ant dies
// ================================================================
class Carcass extends DraggableObject {
  constructor(x, y) {
    super(x, y, 8, CFG.DRAG_CARCASS_MASS);
    this.r = 10; // 시각 반경 (tryAttach 겉면 판정용)
  }
  draw(ctx) {
    if (!this.active) return;
    const { x, y } = this, t = this.pellets / this._maxPellets;
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(this._anim) * 0.15;
    ctx.beginPath(); ctx.arc(x, y, 4 + t * 6, 0, TWO_PI);
    ctx.fillStyle = '#4a4030'; ctx.fill();
    ctx.strokeStyle = '#9a8860'; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#c0b080';
    ctx.font = '9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💀', x, y);
    ctx.restore();

    // 부착 상태 표시
    const n = this.attachedAnts.length, req = this.requiredAnts();
    if (n > 0) {
      ctx.save();
      ctx.strokeStyle = n >= req ? '#ffaa00' : '#ff6644';
      ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x, y, 12, 0, TWO_PI); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe080'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${n}/${req}`, x, y + 22);
      ctx.restore();
    }
  }
}

// ================================================================
//  QUEEN (Player Home Base)
// ================================================================
class Queen {
  constructor(x, y) { this.x = x; this.y = y; this._anim = 0; }
  seedPheromone(grid) {
    const { x, y } = this, sr = CFG.HOME_SEED_R;
    for (let a = 0; a < TWO_PI; a += 0.14)
      for (let d = 0; d <= sr; d += CFG.CELL)
        grid.depositF('black', 'home', x + Math.cos(a) * d, y + Math.sin(a) * d, 210 * (1 - d / sr));
  }
  update(dt) { this._anim = (this._anim + dt * 1.6) % TWO_PI; }
  draw(ctx) {
    const { x, y } = this, r = CFG.QUEEN_R + Math.sin(this._anim) * 2.5;
    ctx.save();
    ctx.shadowBlur = 28; ctx.shadowColor = 'rgba(255,200,50,0.65)';
    ctx.beginPath(); ctx.arc(x, y, r + 9, 0, TWO_PI);
    ctx.strokeStyle = 'rgba(255,200,50,0.22)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fillStyle = '#a07800'; ctx.fill();
    ctx.strokeStyle = '#ffe050'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff5cc'; ctx.font = `${(r * 0.9) | 0}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♛', x, y);
    ctx.restore();
  }
}

// ================================================================
//  ANTLION PIT
// ================================================================
class AntlionPit {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.radius = CFG.PIT_R; this.capacity = CFG.PIT_CAP;
    this.eaten = 0; this.dead = false; this._anim = Math.random() * TWO_PI;
  }
  applyPhysics(ant, dt) {
    const dx = this.x - ant.x, dy = this.y - ant.y, d2 = dx * dx + dy * dy;
    if (d2 > this.radius * this.radius) return false;
    const dist = Math.sqrt(d2);
    if (dist < 5) return true;
    const force = CFG.PIT_SUCTION * (this.radius * this.radius) / (d2 + 1);
    ant.x += (dx / dist) * force * dt; ant.y += (dy / dist) * force * dt;
    return false;
  }
  consume(ant, grid, particles) {
    grid.paintF('black', 'danger', ant.x, ant.y, CFG.PIT_DANG_R, CFG.PIT_DANG_STR);
    grid.paintF('red', 'danger', ant.x, ant.y, CFG.PIT_DANG_R, CFG.PIT_DANG_STR);
    for (let i = 0; i < 10; i++) particles.push(new Particle(ant.x, ant.y));
    if (++this.eaten >= this.capacity) this.dead = true;
  }
  update(dt) { this._anim = (this._anim + dt * 1.6) % TWO_PI; }
  draw(ctx) {
    const { x, y, radius: r } = this;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(10,2,0,0.97)'); g.addColorStop(0.25, 'rgba(55,18,4,0.86)');
    g.addColorStop(0.62, 'rgba(105,58,12,0.52)'); g.addColorStop(1, 'rgba(148,92,28,0)');
    ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI); ctx.fillStyle = g; ctx.fill();
    for (let i = 0; i < 4; i++) {
      const ph = ((this._anim * 0.22 + i * 0.25) % 1), rr = r * (1 - ph) * 0.9;
      if (rr < 4) continue;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TWO_PI);
      ctx.strokeStyle = `rgba(110,45,8,${0.32 * (1 - ph)})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(255,30,0,0.7)';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, TWO_PI);
    ctx.fillStyle = 'rgba(220,25,0,0.9)'; ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ff7030'; ctx.font = '10px monospace';
    ctx.textAlign = 'center'; ctx.fillText(`💀 ${this.capacity - this.eaten}`, x, y - r - 5);
    ctx.restore();
  }
}

// ================================================================
//  ENEMY NEST  — Phase 8: full symmetric red colony base
// ================================================================
class EnemyNest {
  constructor(x, y) {
    this.x = x; this.y = y;
    this._anim = Math.random() * TWO_PI;
  }

  // Seed red_home pheromone around the enemy nest (mirrors Queen.seedPheromone)
  seedPheromone(grid) {
    const { x, y } = this, sr = CFG.HOME_SEED_R;
    for (let a = 0; a < TWO_PI; a += 0.14)
      for (let d = 0; d <= sr; d += CFG.CELL)
        grid.depositF('red', 'home', x + Math.cos(a) * d, y + Math.sin(a) * d, 210 * (1 - d / sr));
  }

  update(dt) { this._anim = (this._anim + dt * 1.4) % TWO_PI; }

  draw(ctx) {
    const { x, y } = this;
    const pulse = 1 + Math.sin(this._anim) * 0.14;
    ctx.save();
    ctx.shadowBlur = 24; ctx.shadowColor = 'rgba(220,20,20,0.75)';
    ctx.beginPath(); ctx.arc(x, y, 38 * pulse, 0, TWO_PI);
    ctx.strokeStyle = 'rgba(180,30,30,0.22)'; ctx.lineWidth = 8; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 26, 0, TWO_PI);
    ctx.fillStyle = '#2e0505'; ctx.fill();
    ctx.strokeStyle = '#cc1515'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff5555'; ctx.font = '18px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚔', x, y);
    ctx.fillStyle = '#aa2020'; ctx.font = 'bold 9px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('ENEMY NEST', x, y + 30);
    ctx.restore();
  }
}

// ================================================================
//  RED COLONY MANAGER  — Phase 8: AI-controlled enemy economy
// ================================================================
class RedColonyManager {
  constructor(nest) {
    this.nest = nest;
    this.food = 40;         // starting food
    this.maxFood = 300;
    this.eggs = 0;
    this._eggTimer = 0;
    this._hatchTimer = 0;
    this.totalDeaths = 0;
    this.isStarving = false;
    this.diseaseMult = 1;         // mirrors black colony disease mechanic
    this.pendingRecruits = 0;     // targeted recruitment
    this.recruitAngle = 0;
  }

  addFood(n) {
    this.food = Math.min(this.maxFood, this.food + n);
  }

  addCorpse() {
    // Red colony disease: not tracked separately; just feeds back
    this.food = Math.min(this.maxFood, this.food + 2);
  }

  // Returns {count, role} — mirrors ColonyManager.tick() interface
  tick(dt, redCount) {
    this.isStarving = this.food < 15;

    // Egg production (only if not starving)
    if (!this.isStarving) {
      this._eggTimer += dt;
      if (this._eggTimer >= CFG.RED_EGG_RATE && this.eggs < CFG.RED_MAX_EGGS) {
        this._eggTimer = 0;
        this.eggs++;
      }
    }

    // Hatch
    if (this.eggs > 0 && redCount < CFG.ENEMY_MAX_ANTS) {
      this._hatchTimer += dt;
      if (this._hatchTimer >= CFG.RED_HATCH_RATE) {
        this._hatchTimer = 0;

        let role = 'worker';
        // AI caste ratio: heavily script early game, then randomized
        if (redCount < 10) {
          role = Math.random() < 0.55 ? 'soldier' : 'worker';
        } else {
          const r = Math.random();
          if (r < 0.10) role = 'scout';
          else if (r < 0.35) role = 'soldier';
          else if (r < 0.50) role = 'acid';
        }

        const costs = { worker: CFG.COST_WORKER ?? 5, soldier: CFG.COST_SOLDIER ?? 25, acid: CFG.COST_ACID ?? 40, scout: CFG.COST_SCOUT ?? 15 };

        // Downgrade if we can't afford
        while (role !== 'worker' && this.food >= costs.worker && this.food < costs[role]) {
          role = role === 'acid' ? 'soldier' : 'worker';
        }

        if (this.food >= costs[role]) {
          this.food -= costs[role];
          this.eggs--;
          return { count: 1, role };
        } else {
          // Can't afford even worker — wait
          this._hatchTimer = CFG.RED_HATCH_RATE * 0.75;
        }
      }
    }
    return { count: 0, role: 'worker' };
  }
}

// ================================================================
//  ANT  — FSM agent with lifespan, caste roles, faction support
// ================================================================
const STATE = Object.freeze({ WANDER: 0, FOLLOW: 1, RETURN: 2, CLEAN_FOLLOW: 3, RALLY: 4, COMBAT: 5, DEFEND: 6, IDLE_NEST: 7, ATTACHED: 8 });

class Ant {
  constructor(x, y, role = 'worker') {
    this.x = x + (Math.random() - 0.5) * 12; this.y = y + (Math.random() - 0.5) * 12;
    this.role = role;
    this.faction = 'black'; // Phase 8 default
    this.angle = Math.random() * TWO_PI;
    // Workers and soldiers idle by default, scouts and red ants wander
    this.state = (role === 'worker' || role === 'soldier') ? STATE.IDLE_NEST : STATE.WANDER;
    this.hasFood = false;
    this.hasCarcass = false;
    this.speed = CFG.ANT_SPEED * (0.82 + Math.random() * 0.36);
    this._jitter = CFG.ANT_JITTER * (0.75 + Math.random() * 0.5);
    this._depT = 0;
    this.lifespan = CFG.LIFESPAN_BASE + Math.random() * CFG.LIFESPAN_VAR;
    this._distT = Math.random() * CFG.ANIM_STRIDE;
    this._animFrame = 0;
    this.faction = 'black';
    this.hp = CFG.HP_BLACK;
    this.dead = false;
    this.combatTarget = null;
    this._prevState = STATE.WANDER;
    this._combatTimer = 0;
    // Phase 7: Caste role
    switch (role) {
      case 'soldier':
        this.hp = CFG.HP_SOLDIER;
        this.speed *= CFG.SPEED_SOLDIER;
        break;
      case 'acid':
        this.hp = CFG.HP_ACID;
        this.speed *= CFG.SPEED_ACID;
        break;
      case 'scout':
        this.hp = CFG.HP_SCOUT;
        this.speed *= CFG.SPEED_SCOUT;
        break;
      case 'commander':
        this.hp = CFG.HP_COMMANDER;
        this.speed *= CFG.SPEED_COMMANDER;
        this.state = STATE.WANDER; // commanders wander actively, not idle
        this.moveTarget = null;    // click-to-move 목표 지점
        this.pheromoneMode = 'rally'; // QWER로 변경 가능한 페로몬 종류
        break;
      default:
        this.hp = CFG.HP_WORKER;
    }
    this._shootCooldown = 0;
    this._auraBoosted = false; // set each frame by Game._applyCommanderAura()
    this.dragTarget = null;    // Phase 10: 현재 연결된 DraggableObject 참조
  }

  // _sense: returns L/C/R readings for the relevant channel
  _sense(grid, colony = null) {
    const { angle: a, x, y, faction } = this, d = CFG.SENS_DIST, sa = CFG.SENS_ANG;
    let channel = 'food', w = 1;

    if (faction === 'red') {
      switch (this.state) {
        case STATE.RETURN: channel = 'home'; break;
        case STATE.CLEAN_FOLLOW: channel = 'clean'; break;
        default: channel = 'food'; break;
      }
    } else {
      const tun = colony?.tuning;
      switch (this.state) {
        case STATE.RETURN: channel = 'home'; break;
        case STATE.CLEAN_FOLLOW: channel = 'clean'; w = tun?.sanitWeight ?? 1; break;
        case STATE.RALLY: channel = 'rally'; w = tun?.defenseWeight ?? 1; break;
        default: channel = 'food'; w = tun?.forageWeight ?? 1; break;
      }
    }

    return {
      L: grid.readF(faction, channel, x + Math.cos(a - sa) * d, y + Math.sin(a - sa) * d) * w,
      C: grid.readF(faction, channel, x + Math.cos(a) * d, y + Math.sin(a) * d) * w,
      R: grid.readF(faction, channel, x + Math.cos(a + sa) * d, y + Math.sin(a + sa) * d) * w,
    };
  }

  _peek3(fn) { const { angle: a, x, y } = this, d = CFG.SENS_DIST, sa = CFG.SENS_ANG; return Math.max(fn(x + Math.cos(a - sa) * d, y + Math.sin(a - sa) * d), fn(x + Math.cos(a) * d, y + Math.sin(a) * d), fn(x + Math.cos(a + sa) * d, y + Math.sin(a + sa) * d)); }

  _senseDanger(grid) {
    const { angle: a, x, y, faction } = this, d = CFG.SENS_DIST, sa = CFG.SENS_ANG;
    const enemyFac = faction === 'red' ? 'black' : 'red';
    // Ants avoid danger and presence of the ENEMY faction
    const rd = (wx, wy) => grid.readF(faction, 'danger', wx, wy) + grid.readF(enemyFac, 'enemy', wx, wy);
    return {
      L: rd(x + Math.cos(a - sa) * d, y + Math.sin(a - sa) * d),
      C: rd(x + Math.cos(a) * d, y + Math.sin(a) * d),
      R: rd(x + Math.cos(a + sa) * d, y + Math.sin(a + sa) * d),
    };
  }

  // Reads only the incoming enemy pheromone presence + alarm bursts
  _senseEnemy(grid) {
    const { angle: a, x, y, faction } = this, d = CFG.SENS_DIST * 1.3, sa = CFG.SENS_ANG;
    const enemyFac = faction === 'red' ? 'black' : 'red';
    return {
      L: grid.readF(enemyFac, 'enemy', x + Math.cos(a - sa) * d, y + Math.sin(a - sa) * d),
      C: grid.readF(enemyFac, 'enemy', x + Math.cos(a) * d, y + Math.sin(a) * d),
      R: grid.readF(enemyFac, 'enemy', x + Math.cos(a + sa) * d, y + Math.sin(a + sa) * d),
    };
  }

  _steer(s, dt) {
    const ts = CFG.ANT_TURN * dt;
    // Add forward bias (momentum) proportional to the center trail
    // This prevents ants from turning backward into massive blobs (like the nest)
    const fw = s.C + 8 + (s.C * 0.05);
    if (s.L > s.R && s.L > fw) this.angle -= ts;
    else if (s.R > s.L && s.R > fw) this.angle += ts;
    else this.angle += (Math.random() - 0.5) * 0.35 * dt * 10;
  }

  _flee(ds, dt) {
    const ft = CFG.FLEE_TURN * dt;
    if (ds.L > ds.R && ds.L > ds.C) this.angle += ft;
    else if (ds.R > ds.L && ds.R > ds.C) this.angle -= ft;
    else this.angle += ft * 2.5;
  }

  _navigate(tx, ty, dt) {
    let diff = Math.atan2(ty - this.y, tx - this.x) - this.angle;
    while (diff > Math.PI) diff -= TWO_PI;
    while (diff < -Math.PI) diff += TWO_PI;
    this.angle += Math.sign(diff) * Math.min(Math.abs(diff), CFG.ANT_TURN * dt * 2);
  }

  // ── Phase 8 ACO: Ecological AI helpers ───────────────────────

  /**
   * Nest Gravity — normalized vector pointing from this ant toward (nx, ny).
   * A constant low-weight directional pull; prevents ants looping forever
   * if home-pheromone trails have fully evaporated.
   */
  _nestGravityVector(nx, ny) {
    const dx = nx - this.x, dy = ny - this.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / d, y: dy / d };
  }

  /**
   * Pheromone Gradient Vector — 8-direction sampling, returns a
   * normalized vector pointing toward peak pheromone concentration.
   * readFn(wx, wy) → pheromone value at world-coords.
   * Returns {x, y, strength}; strength≈0 means no detectable trail.
   */
  _pheromoneGradientVector(readFn) {
    const { x, y, angle: facing } = this;
    const r = CFG.SENS_DIST * CFG.ACO_SENS_MULT;
    let vx = 0, vy = 0;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI;
      // Forward bias: skip the rear 120° arc so the ant never chases its own
      // freshly-laid trail — this is what prevented circular feedback in the
      // old L/C/R ±45° system.
      let diff = a - facing;
      while (diff > Math.PI) diff -= TWO_PI;
      while (diff < -Math.PI) diff += TWO_PI;
      if (Math.abs(diff) > Math.PI * 0.67) continue; // ignore rear ~120°
      const ph = readFn(x + Math.cos(a) * r, y + Math.sin(a) * r);
      vx += Math.cos(a) * ph;
      vy += Math.sin(a) * ph;
    }
    const mag = Math.sqrt(vx * vx + vy * vy);
    return mag > 0.5
      ? { x: vx / mag, y: vy / mag, strength: mag }
      : { x: 0, y: 0, strength: 0 };
  }

  /**
   * Danger Repulsion Vector — 8-direction sampling, returns a
   * normalized vector pointing AWAY from danger/enemy pheromone sources.
   * Direction vectors are negated so the ant steers away.
   */
  _dangerRepelVector(grid) {
    const { x, y, faction } = this;
    const r = CFG.SENS_DIST * CFG.ACO_SENS_MULT;
    const enemyFac = faction === 'red' ? 'black' : 'red';
    let vx = 0, vy = 0;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      const dng = grid.readF(faction, 'danger', px, py) + grid.readF(enemyFac, 'enemy', px, py);
      vx -= Math.cos(a) * dng;   // negate → repulsion direction
      vy -= Math.sin(a) * dng;
    }
    const mag = Math.sqrt(vx * vx + vy * vy);
    return mag > 0.5
      ? { x: vx / mag, y: vy / mag, strength: mag }
      : { x: 0, y: 0, strength: 0 };
  }

  /**
   * ACO Steering — combined Return_Home navigator.
   *   FinalVector = (GravityVec × 0.2) + (PheromoneVec × 0.8) + (DangerVec × 3.0)
   * Danger is weighted highest so ants always reroute around threats.
   * Pheromone is primary navigation when trail exists.
   * Gravity is the low-weight safety net preventing infinite loops.
   * If all forces cancel (mag ≈ 0), pure gravity takes over.
   */
  _applyACO(grid, nx, ny, dt) {
    const gv = this._nestGravityVector(nx, ny);
    // Read the home channel of our own faction
    const readFn = (wx, wy) => grid.readF(this.faction, 'home', wx, wy);
    const pv = this._pheromoneGradientVector(readFn);
    const dv = this._dangerRepelVector(grid);

    // Weighted sum
    let fx = gv.x * CFG.ACO_GRAVITY
      + pv.x * CFG.ACO_PHEROMONE
      + dv.x * CFG.ACO_DANGER;
    let fy = gv.y * CFG.ACO_GRAVITY
      + pv.y * CFG.ACO_PHEROMONE
      + dv.y * CFG.ACO_DANGER;

    // Fallback: if result vector is near zero, pure gravity prevents loop
    if (fx * fx + fy * fy < 0.01) { fx = gv.x; fy = gv.y; }

    // Smooth steering toward the combined vector
    let diff = Math.atan2(fy, fx) - this.angle;
    while (diff > Math.PI) diff -= TWO_PI;
    while (diff < -Math.PI) diff += TWO_PI;
    this.angle += Math.sign(diff) * Math.min(Math.abs(diff), CFG.ANT_TURN * dt * 3.0);
  }

  // Main update dispatch
  // homeBase: Queen for black ants, EnemyNest for red ants
  update(dt, grid, foods, homeBase, cw, ch, colony = null) {
    this._depT += dt;

    const ds = this._senseDanger(grid);
    const maxD = ds.L > ds.R ? (ds.L > ds.C ? ds.L : ds.C) : (ds.R > ds.C ? ds.R : ds.C);

    // ── Danger / Alarm routing (role-specific) ───────────────────
    let runFSM = true;
    if (this.role === 'worker') {
      // We separate brush/pit danger from enemy-ant presence.
      // They flee from real environmental danger but SWARM toward enemies.
      const { angle: wa, x: wx2, y: wy2, faction } = this, sd = CFG.SENS_DIST, ssa = CFG.SENS_ANG;
      const maxPD = Math.max(
        grid.readF(faction, 'danger', wx2 + Math.cos(wa - ssa) * sd, wy2 + Math.sin(wa - ssa) * sd),
        grid.readF(faction, 'danger', wx2 + Math.cos(wa) * sd, wy2 + Math.sin(wa) * sd),
        grid.readF(faction, 'danger', wx2 + Math.cos(wa + ssa) * sd, wy2 + Math.sin(wa + ssa) * sd));
      if (maxPD > CFG.FLEE_THRESH) {
        this._flee(ds, dt); runFSM = false; // flee from brush / pits
      } else {
        // Alarm response: steer toward enemy pheromone (alarm signal from nestmates)
        const de = this._senseEnemy(grid);
        const maxE = de.L > de.R ? (de.L > de.C ? de.L : de.C) : (de.R > de.C ? de.R : de.C);
        if (maxE > CFG.ALARM_JOIN
          && this.state !== STATE.COMBAT
          && this.state !== STATE.DEFEND
          && this.state !== STATE.RETURN) {
          this._steer(de, dt); // nudge toward the fight; FSM still runs
        }
      }
    } else if (this.role === 'acid' && maxD > CFG.FLEE_THRESH) {
      this._flee(ds, dt); runFSM = false;
    } else if ((this.role === 'soldier' || this.role === 'commander') && maxD > CFG.FLEE_THRESH) {
      // Soldiers and commanders charge toward max danger direction
      this.angle -= (ds.L > ds.R && ds.L > ds.C ? CFG.FLEE_TURN : ds.R > ds.L && ds.R > ds.C ? -CFG.FLEE_TURN : -CFG.FLEE_TURN * 2) * dt;
      runFSM = false;
    }

    if (runFSM) {
      const s = this._sense(grid, colony);
      const maxS = s.L > s.R ? (s.L > s.C ? s.L : s.C) : (s.R > s.C ? s.R : s.C);
      const tun = colony?.tuning;

      // ── 우선순위 겉면 접촉 부착 (상태/흔적 조건과 무관하게 즉시) ──
      // 개미가 먹이 표면에 닿는 순간 FSM 분기보다 먼저 처리
      if (this.role !== 'scout' && this.role !== 'commander'
          && this.state !== STATE.ATTACHED && this.state !== STATE.COMBAT
          && this.state !== STATE.DEFEND  && this.state !== STATE.RETURN
          && this.state !== STATE.RALLY) {
        if (this._tryAttach(foods, colony, grid)) return;
      }

      switch (this.state) {
        case STATE.IDLE_NEST:
          // Smoothly wander near the nest
          this.angle += (Math.random() - 0.5) * this._jitter * dt * 3; // less jittery idle
          const distToNest = Math.sqrt(dist2(this.x, this.y, homeBase.x, homeBase.y));

          // Soft boundary reflection: steer back to nest if stepping outside HOME_RANGE
          if (distToNest > CFG.HOME_RANGE) {
            const angleToNest = Math.atan2(homeBase.y - this.y, homeBase.x - this.x);
            // Smoothly steer towards the nest over time instead of snapping instantly
            let diff = angleToNest - this.angle;
            while (diff > Math.PI) diff -= TWO_PI;
            while (diff < -Math.PI) diff += TWO_PI;
            this.angle += diff * 1.5 * dt;
          }
          this.speed = (CFG.ANT_SPEED * 0.35); // Slow, relaxed walk while idle

          let wakeTarget = null;
          // Brush RALLY check (all idlers respond to Rally)
          if (!this.hasFood && this._peek3((wx, wy) => grid.readF(this.faction, 'rally', wx, wy)) * (tun?.defenseWeight ?? 1) > CFG.RALLY_THRESH) {
            wakeTarget = STATE.RALLY;
          }
          // Brush CLEAN check (for workers only)
          else if (this.role === 'worker' && this._peek3((wx, wy) => grid.readF(this.faction, 'clean', wx, wy)) * (tun?.sanitWeight ?? 1) > CFG.WAKE_THRESH) {
            wakeTarget = STATE.CLEAN_FOLLOW;
          }
          // Scout Targeted Recruitment check
          else if (this.role === 'worker' && colony && colony.pendingRecruits > 0) {
            colony.pendingRecruits--;
            wakeTarget = STATE.FOLLOW;
            if (colony.recruitAngle !== undefined) {
              this.angle = colony.recruitAngle + (Math.random() - 0.5) * 0.4; // Point exactly down the trail with tiny variance
            }
          }
          // Native strong trail detection (Idle tracking lowest priority, strong scout pheromone highest)
          // Soldiers natively patrol these strong routes to protect foragers
          else if ((this.role === 'worker' || this.role === 'soldier') && maxS > 40) {
            wakeTarget = STATE.FOLLOW;
          }
          // Danger / Defense check (soldiers and workers should wake up if enemies are near)
          else if (this.role === 'soldier' || this.role === 'worker') {
            const de = this._senseEnemy(grid);
            const idleMaxE = de.L > de.R ? (de.L > de.C ? de.L : de.C) : (de.R > de.C ? de.R : de.C);
            if (idleMaxE > CFG.ALARM_JOIN) wakeTarget = STATE.WANDER;
          }

          if (wakeTarget !== null) {
            // 적 알람(WANDER)은 항상 즉각 반응. 페로몬 명령은 CMD_IGNORE_PROB 확률로 무시.
            if (wakeTarget !== STATE.WANDER && Math.random() < CFG.CMD_IGNORE_PROB) {
              wakeTarget = null; // 이번 틱 명령 무시 — 다음 틱에 다시 감지 가능
            }
          }
          if (wakeTarget !== null) {
            this.speed = (this.role === 'soldier') ? CFG.ANT_SPEED * CFG.SPEED_SOLDIER : CFG.ANT_SPEED;
            this.state = wakeTarget;
          }
          break;
        case STATE.WANDER:
          // 장군: click-to-move 목표 지점 있으면 우선 이동
          if (this.role === 'commander' && this.moveTarget) {
            const mdx = this.moveTarget.x - this.x, mdy = this.moveTarget.y - this.y;
            if (mdx * mdx + mdy * mdy < 625) { // 25px 이내 도착
              this.moveTarget = null;
            } else {
              this._navigate(this.moveTarget.x, this.moveTarget.y, dt);
              break;
            }
          }
          this.angle += (Math.random() - 0.5) * this._jitter * dt * 10;
          if (this.role === 'worker' && this._peek3((wx, wy) => grid.readF(this.faction, 'clean', wx, wy)) * (tun?.sanitWeight ?? 1) > CFG.CLEAN_THRESH) { this.state = STATE.CLEAN_FOLLOW; break; }
          // Ants look for trails; 장군은 이동 목표 있으면 FOLLOW로 빠지지 않음
          if (maxS > 4 && this.role !== 'scout' && !(this.role === 'commander' && this.moveTarget)) { this.state = STATE.FOLLOW; break; }
          // 장군은 자신이 Rally를 발산하므로 Rally 상태로 전환하지 않음
          if (!this.hasFood && this.role !== 'commander' && this._peek3((wx, wy) => grid.readF(this.faction, 'rally', wx, wy)) * (tun?.defenseWeight ?? 1) > CFG.RALLY_THRESH) { this.state = STATE.RALLY; break; }
          if (this._tryAttach(foods, colony, grid)) return;
          break;
        case STATE.FOLLOW:
          if (maxS < 1) {
            // Delay RETURN mode on trail loss: Allow massive radius for WANDER search before giving up.
            const df = dist2(this.x, this.y, homeBase.x, homeBase.y);
            if (df < CFG.HOME_RANGE * CFG.HOME_RANGE * 36) { // 6x the home range distance
              this.state = STATE.WANDER;
            } else {
              this.state = (this.role === 'scout' || this.role === 'acid' || !this.hasFood) ? STATE.WANDER : STATE.RETURN;
            }
            break;
          }
          // 먹이를 들고 있지 않은 경우: DISTRACT_PROB/초 확률로 흔적을 잃고 방황
          if (!this.hasFood && Math.random() < CFG.DISTRACT_PROB * dt) {
            this.state = STATE.WANDER; break;
          }
          this._steer(s, dt);
          if (this._tryAttach(foods, colony, grid)) return;
          break;
        case STATE.RETURN:
          // ACO: Gravity(0.2) + HomePheromoneGradient(0.8) + DangerRepulsion(3.0)
          this._applyACO(grid, homeBase.x, homeBase.y, dt);
          if (dist2(this.x, this.y, homeBase.x, homeBase.y) < CFG.HOME_RANGE * CFG.HOME_RANGE) {
            if (colony) {
              if (this.hasCarcass) colony.addCorpse(1);
              else if (this.hasFood) colony.addFood(1);

              // Scout Targeted Recruitment: Tell the colony exactly how many workers are needed
              if (this.role === 'scout' && this.recruitCount > 0) {
                colony.pendingRecruits = (colony.pendingRecruits || 0) + Math.min(this.recruitCount, 30);
                colony.recruitAngle = this.angle + Math.PI; // Opposite of return angle is the direction to food
                this.recruitCount = 0;
              }
            }
            this.hasFood = false; this.hasCarcass = false;
            // Go back to idle (scouts wander again)
            this.state = this.role === 'scout' ? STATE.WANDER : STATE.IDLE_NEST;
            this.angle += Math.PI + (Math.random() - 0.5) * 1.4;
          }
          break;
        case STATE.CLEAN_FOLLOW: {
          if (maxS < 1) { this.state = STATE.WANDER; break; }
          // DISTRACT_PROB/초 확률로 청소 임무 포기하고 방황
          if (Math.random() < CFG.DISTRACT_PROB * dt) { this.state = STATE.WANDER; break; }
          this._steer(s, dt);
          const crc = foods.filter(f => f instanceof Carcass);
          if (this._tryAttach(crc.length ? crc : foods, colony, grid)) return;
          break;
        }
        case STATE.RALLY: {
          if (maxS < 1) { this.state = STATE.WANDER; break; }
          // Rally 페로몬이 있는 한 절대 이탈하지 않음 — 페로몬이 사라지면 WANDER로
          this._steer(s, dt);
          break; // 하단 공통 이동 코드에서 일반 속도로 이동
        }
        case STATE.COMBAT: {
          if (!this.combatTarget || this.combatTarget.dead) {
            this.state = this._prevState; this.combatTarget = null; break;
          }
          this._navigate(this.combatTarget.x, this.combatTarget.y, dt);
          break;
        }
        case STATE.DEFEND: {
          if (!this.combatTarget || this.combatTarget.dead) {
            this.state = STATE.WANDER; this.combatTarget = null; break;
          }
          this._navigate(this.combatTarget.x, this.combatTarget.y, dt);
          break;
        }
        case STATE.ATTACHED: {
          const obj = this.dragTarget;
          // 대상 소실 또는 비활성화 → 이탈
          if (!obj || !obj.active) {
            this.dragTarget = null; this.state = STATE.WANDER; break;
          }

          const ddx = this.x - obj.x, ddy = this.y - obj.y;
          const dMag = Math.sqrt(ddx * ddx + ddy * ddy) || 1;

          // 목표: 오브젝트 표면 바로 외곽 (현재 방향 유지 → 자연스럽게 분산)
          const objR = (obj.r ?? 10) + 5;
          if (dMag > objR + CFG.ATTACHED_MAX_DIST) {
            obj.detach(this); this.dragTarget = null; this.state = STATE.WANDER; break;
          }

          // 표면 위 목표 지점으로 스프링 (중심이 아닌 표면)
          const targetX = obj.x + (ddx / dMag) * objR;
          const targetY = obj.y + (ddy / dMag) * objR;
          const toX = targetX - this.x, toY = targetY - this.y;
          const toMag = Math.sqrt(toX * toX + toY * toY) || 1;
          const springPull = Math.min(toMag, 0.7 * CFG.ANT_SPEED * CFG.ATTACHED_SPEED_MULT * dt);
          this.x += (toX / toMag) * springPull;
          this.y += (toY / toMag) * springPull;

          // 개미가 오브젝트→여왕 방향으로 서서히 회전 (이것이 합력을 생성)
          const homeAngle = Math.atan2(homeBase.y - obj.y, homeBase.x - obj.x);
          let angleDiff = homeAngle - this.angle;
          while (angleDiff >  Math.PI) angleDiff -= TWO_PI;
          while (angleDiff < -Math.PI) angleDiff += TWO_PI;
          this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), CFG.ANT_TURN * dt * 2);

          this.speed = CFG.ANT_SPEED * CFG.ATTACHED_SPEED_MULT;

          // 아직 인원 부족 시 동료 모집 페로몬 방출
          if (obj.attachedAnts.length < obj.requiredAnts()) {
            grid.paintF(this.faction, 'food', obj.x, obj.y, CFG.ATTACH_PHEROMONE_R, CFG.ATTACH_PHEROMONE_STR);
          }

          // 여왕 도달 판정 (오브젝트 기준)
          if (dist2(obj.x, obj.y, homeBase.x, homeBase.y) < CFG.HOME_RANGE * CFG.HOME_RANGE) {
            if (colony) {
              if (obj instanceof Carcass) colony.addCorpse(obj.pellets);
              else colony.addFood(obj.pellets);
            }
            obj.active = false;
            // 연결된 모든 개미 해방
            for (const a of obj.attachedAnts) {
              a.dragTarget = null;
              a.state = STATE.IDLE_NEST;
            }
            obj.attachedAnts.length = 0;
          }
          break;
        }
      }
    }

    // ATTACHED 상태에서는 별도 이동 없음 (스프링이 처리)
    if (this.state === STATE.ATTACHED) {
      if (this._depT >= 0.05) { this._depT = 0; this._deposit(grid); }
      return;
    }

    const spd = this._auraBoosted ? this.speed * (CFG.COMMANDER_AURA_MULT ?? 1.3) : this.speed;
    const mx = Math.cos(this.angle) * spd * dt;
    const my = Math.sin(this.angle) * spd * dt;
    this.x += mx; this.y += my;
    this._distT += Math.sqrt(mx * mx + my * my);
    if (this._distT >= CFG.ANIM_STRIDE) { this._distT -= CFG.ANIM_STRIDE; this._animFrame ^= 1; }
    this._bounce(cw, ch);
    if (this._depT >= 0.05) { this._depT = 0; this._deposit(grid); }
  }

  _tryAttach(items, colony = null, grid = null) {
    // 정찰병: 먹이 발견 시 둥지로 귀환해 일꾼 모집 (직접 운반 안 함)
    if (this.role === 'scout') {
      for (const item of items) {
        if (!item.active) continue;
        const dx = this.x - item.x, dy = this.y - item.y;
        if (dx * dx + dy * dy < CFG.ATTACH_R * CFG.ATTACH_R * 4) {
          this.hasFood = true;
          this.recruitCount = item.pellets;
          this.state = STATE.RETURN;
          return true;
        }
      }
      return false;
    }
    for (const item of items) {
      if (!item.active) continue;
      // 이미 충분한 개미가 붙어 있으면 추가 부착 스킵
      if (item.attachedAnts.length >= item.requiredAnts() * 3) continue;
      if (item.tryAttach(this)) {
        this.dragTarget = item;
        this.state = STATE.ATTACHED;
        return true;
      }
    }
    return false;
  }

  _deposit(grid) {
    if (this.state === STATE.RETURN) {
      // RETURN: drop To-Food (Green) only — reinforces the path back to food.
      // Scouts drop a massively wider, thicker trail using paintFood so it is impossible to miss and lasts longer.
      if (this.role === 'scout') {
        grid.paintF(this.faction, 'food', this.x, this.y, 18, CFG.DEP_FOOD_RET * 5);
      } else {
        grid.depositF(this.faction, 'food', this.x, this.y, CFG.DEP_FOOD_RET);
      }
    } else if (this.state === STATE.CLEAN_FOLLOW) {
      grid.depositF(this.faction, 'clean', this.x, this.y, CFG.DEP_HOME_WALK * 2);
    } else {
      // WANDER (and FOLLOW/RALLY): drop To-Home (Blue) — breadcrumb trail
      // from current position back toward the nest for returning ants to follow.
      // Idle ants do not deposit home pheromones.
      if (this.state !== STATE.IDLE_NEST) {
        // Scouts lay a stronger home trail so they can always find their way back
        const str = this.role === 'scout' ? CFG.DEP_HOME_WALK * 3 : CFG.DEP_HOME_WALK;
        grid.depositF(this.faction, 'home', this.x, this.y, str);
      }
      // 장군은 pheromoneMode에 따라 지속적으로 페로몬 방출
      if (this.role === 'commander' && this.state !== STATE.IDLE_NEST) {
        grid.paintF(this.faction, this.pheromoneMode, this.x, this.y, 40, 30);
      }
    }
  }

  _bounce(cw, ch) {
    const m = 5;
    if (this.x < m) { this.x = m; this.angle = Math.PI - this.angle; }
    if (this.x > cw - m) { this.x = cw - m; this.angle = Math.PI - this.angle; }
    if (this.y < m) { this.y = m; this.angle = -this.angle; }
    if (this.y > ch - m) { this.y = ch - m; this.angle = -this.angle; }
  }

  draw(ctx, sprites) {
    const { x, y, angle, hasFood, hasCarcass, state, lifespan, _animFrame, role, faction } = this;
    const alpha = lifespan < 30 ? 0.25 + (lifespan / 30) * 0.75 : 1;
    let overlay = null;
    if (state === STATE.RETURN && hasCarcass) overlay = '#9090c8';
    else if (state === STATE.RETURN) overlay = '#50ff70';
    else if (state === STATE.FOLLOW) overlay = '#80d4ff';
    else if (state === STATE.CLEAN_FOLLOW) overlay = '#cc44ff';
    else if (state === STATE.RALLY) overlay = '#ff8820';
    else if (state === STATE.COMBAT) overlay = '#ffee20';
    else if (state === STATE.DEFEND) overlay = '#ff7030';
    else if (state === STATE.ATTACHED) overlay = '#ffd700';

    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (sprites) {
      sprites.draw(ctx, role, faction, _animFrame, x, y, angle, overlay);
    } else {
      const s = CFG.ANT_SIZE;
      ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(s * 1.7, 0); ctx.lineTo(-s, s * 0.75); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s, -s * 0.75);
      ctx.closePath();
      ctx.fillStyle = '#d4902a'; ctx.fill();
    }
    ctx.restore();
  }
}

// ================================================================
//  GAME  — orchestrates world sim + camera + nest panel
// ================================================================
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this._keys = {};
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.cam = { x: 0 };
    this.selectedCommander = null; // RTS 선택된 장군
    this.sprites = new SpriteCache();
    this.mouse = { x: 0, y: 0, wx: 0, wy: 0, left: false, right: false, leftClick: false, rightClick: false };
    this._initInput();

    const { worldW, worldH } = this;
    this.grid = new PheromoneGrid(worldW, worldH);

    // Player nest: LEFT side
    this.queen = new Queen(worldW * 0.10, worldH * 0.5);

    // Enemy nest: RIGHT side (must exist before _spawnFoods)
    this.redAnts = [];
    this.enemyNest = null;
    this.redColony = null;
    this._spawnEnemyNest();

    // Colony manager (depends on queen)
    this.colony = new ColonyManager(this);

    this.foods = this._spawnFoods();
    this.ants = this._spawnAnts();
    this.carcasses = [];
    this.pits = this._spawnPits();
    this.obstacles = this._spawnObstacles(); // Phase 9
    this.particles = [];

    // Phase 7: ranged combat
    this.projectiles = [];
    this.acidPools = [];

    // Seed initial pheromones
    this.queen.seedPheromone(this.grid);
    if (this.enemyNest) this.enemyNest.seedPheromone(this.grid);

    this._initPanel();
    this._frame = 0; this._lastTs = 0;
    this._fps = 60; this._fpsAcc = 0; this._fpsN = 0;
    requestAnimationFrame(ts => this._loop(ts));
  }

  // ── World sizing ───────────────────────────────────────────────
  _resize() {
    const wrap = document.getElementById('surface-wrap');
    const vw = (wrap && wrap.clientWidth > 0) ? wrap.clientWidth : window.innerWidth;
    const vh = (wrap && wrap.clientHeight > 0) ? wrap.clientHeight : window.innerHeight;
    this.canvas.width = vw;
    this.canvas.height = vh;
    this.worldW = vw * CFG.WORLD_MULT;
    this.worldH = vh;
    if (this.grid) this.grid.resize(this.worldW, this.worldH);
    // Clamp camera after resize
    if (this.cam) {
      const maxX = this.worldW - vw;
      this.cam.x = Math.max(0, Math.min(this.cam.x, maxX));
    }
  }

  // ── World setup ────────────────────────────────────────────────
  _spawnFoods() {
    const { worldW, worldH } = this;
    const { x: qx, y: qy } = this.queen;
    const { x: ex, y: ey } = this.enemyNest || { x: worldW * 0.88, y: worldH * 0.5 };
    const mg = 100, foods = [];
    let t = 0;
    while (foods.length < CFG.FOOD_COUNT && t++ < 6000) {
      const x = mg + Math.random() * (worldW - mg * 2);
      const y = mg + Math.random() * (worldH - mg * 2);
      if (dist2(x, y, qx, qy) < 240 * 240) continue;
      if (dist2(x, y, ex, ey) < 240 * 240) continue;
      if (foods.some(f => dist2(x, y, f.x, f.y) < 200 * 200)) continue;
      foods.push(new Food(x, y)); // random scale baked into Food constructor
    }
    return foods;
  }

  // Spawn 1-2 replacement food items at valid random positions
  _respawnSomeFoods() {
    const { worldW, worldH } = this;
    const { x: qx, y: qy } = this.queen;
    const { x: ex, y: ey } = this.enemyNest || { x: worldW * 0.88, y: worldH * 0.5 };
    const mg = 100;
    const count = 1 + Math.floor(Math.random() * 2); // 1 or 2
    let spawned = 0, t = 0;
    while (spawned < count && t++ < 2000) {
      const x = mg + Math.random() * (worldW - mg * 2);
      const y = mg + Math.random() * (worldH - mg * 2);
      if (dist2(x, y, qx, qy) < 240 * 240) continue;
      if (dist2(x, y, ex, ey) < 240 * 240) continue;
      if (this.foods.some(f => f.active && dist2(x, y, f.x, f.y) < 180 * 180)) continue;
      this.foods.push(new Food(x, y));
      spawned++;
    }
  }

  _spawnAnts() {
    const ants = [];
    const scoutCount = 10;
    const soldierCount = 10;

    for (let i = 0; i < scoutCount; i++) ants.push(new Ant(this.queen.x, this.queen.y, 'scout'));
    for (let i = 0; i < soldierCount; i++) ants.push(new Ant(this.queen.x, this.queen.y, 'soldier'));
    for (let i = scoutCount + soldierCount; i < CFG.ANT_COUNT; i++) {
      ants.push(new Ant(this.queen.x, this.queen.y, 'worker'));
    }
    return ants;
  }

  _spawnPits() {
    const { worldW, worldH } = this;
    const { x: qx, y: qy } = this.queen;
    const { x: ex, y: ey } = this.enemyNest || { x: worldW * 0.88, y: worldH * 0.5 };
    const md = CFG.PIT_MIN_DIST, pits = [];
    let t = 0;
    while (pits.length < CFG.PIT_COUNT && t++ < 3000) {
      const x = 150 + Math.random() * (worldW - 300);
      const y = 150 + Math.random() * (worldH - 300);
      if (dist2(x, y, qx, qy) < md * md) continue;
      if (dist2(x, y, ex, ey) < md * md) continue;
      if (this.foods.some(f => dist2(x, y, f.x, f.y) < md * md)) continue;
      if (pits.some(p => dist2(x, y, p.x, p.y) < 250 * 250)) continue;
      pits.push(new AntlionPit(x, y));
    }
    return pits;
  }

  // Phase 9: spawn Rock and Branch obstacles, avoiding nests / foods / pits
  _spawnObstacles() {
    const { worldW, worldH } = this;
    const { x: qx, y: qy } = this.queen;
    const { x: ex, y: ey } = this.enemyNest || { x: worldW * 0.88, y: worldH * 0.5 };
    const safe = 220; // min distance from any nest
    const obstacles = [];

    // ── Rocks ─────────────────────────────────────────────────────
    let tries = 0;
    while (obstacles.filter(o => o instanceof Rock).length < CFG.ROCK_COUNT && tries++ < 4000) {
      const x = 120 + Math.random() * (worldW - 240);
      const y = 80 + Math.random() * (worldH - 160);
      if (dist2(x, y, qx, qy) < safe * safe) continue;
      if (dist2(x, y, ex, ey) < safe * safe) continue;
      if (this.foods.some(f => dist2(x, y, f.x, f.y) < 160 * 160)) continue;
      if (this.pits.some(p => dist2(x, y, p.x, p.y) < 200 * 200)) continue;
      if (obstacles.some(o => dist2(x, y, o.x, o.y) < 130 * 130)) continue;
      const r = CFG.ROCK_R_MIN + Math.random() * (CFG.ROCK_R_MAX - CFG.ROCK_R_MIN);
      obstacles.push(new Rock(x, y, r));
    }

    // ── Branches ──────────────────────────────────────────────────
    tries = 0;
    while (obstacles.filter(o => o instanceof Branch).length < CFG.BRANCH_COUNT && tries++ < 4000) {
      const x = 120 + Math.random() * (worldW - 240);
      const y = 80 + Math.random() * (worldH - 160);
      if (dist2(x, y, qx, qy) < safe * safe) continue;
      if (dist2(x, y, ex, ey) < safe * safe) continue;
      if (this.foods.some(f => dist2(x, y, f.x, f.y) < 160 * 160)) continue;
      if (this.pits.some(p => dist2(x, y, p.x, p.y) < 180 * 180)) continue;
      if (obstacles.some(o => dist2(x, y, o.x || (o.x1 + o.x2) / 2, o.y || (o.y1 + o.y2) / 2) < 120 * 120)) continue;
      const len = CFG.BRANCH_LEN_MIN + Math.random() * (CFG.BRANCH_LEN_MAX - CFG.BRANCH_LEN_MIN);
      const angle = Math.random() * Math.PI; // 0..180° (no need for full circle symmetry)
      const dx = Math.cos(angle) * len * 0.5, dy = Math.sin(angle) * len * 0.5;
      obstacles.push(new Branch(x - dx, y - dy, x + dx, y + dy, CFG.BRANCH_W));
    }

    return obstacles;
  }

  // Phase 9: push ant outside every obstacle
  _applyObstaclePhysics(ant) {
    for (const ob of this.obstacles) ob.resolveAnt(ant);
  }

  // Phase 8: fixed right-side enemy nest, seed red pheromone, spawn initial red ants
  _spawnEnemyNest() {
    const { worldW, worldH } = this;
    const ex = worldW * 0.88, ey = worldH * 0.5;
    this.enemyNest = new EnemyNest(ex, ey);
    this.redColony = new RedColonyManager(this.enemyNest);

    // Seed red_home (grid must exist)
    this.enemyNest.seedPheromone(this.grid);

    // Initial red ant wave: workers / soldiers / scouts
    const initRoles = [
      ...Array(CFG.RED_INIT_WORKER  ?? 50).fill('worker'),
      ...Array(CFG.RED_INIT_SOLDIER ?? 20).fill('soldier'),
      ...Array(CFG.RED_INIT_SCOUT   ?? 10).fill('scout'),
    ];
    for (const role of initRoles) {
      const ra = new Ant(ex, ey, role);
      ra.faction = 'red';
      ra.hp = role === 'soldier' ? CFG.HP_SOLDIER : role === 'scout' ? CFG.HP_SCOUT : CFG.HP_WORKER;
      ra.lifespan = CFG.RED_LIFESPAN_BASE + Math.random() * CFG.RED_LIFESPAN_VAR;
      ra.angle = Math.random() * TWO_PI;
      this.redAnts.push(ra);
    }
  }

  // ── Phase 7: Combat support ────────────────────────────────────
  _resolveCombat(dt) {
    const CR = CFG.COMBAT_RANGE;
    const CR2 = CR * CR;

    // 1. Hash live, unpaired red ants for black-ant queries
    const rhash = new SpatialHash(CR * 2);
    for (const ra of this.redAnts) {
      if (!ra.dead && ra.state !== STATE.COMBAT) rhash.insert(ra);
    }

    // 2a. Black ants initiate combat with red ants
    for (const a of this.ants) {
      if (a.dead || a.state === STATE.COMBAT || a.role === 'acid') continue;
      const near = rhash.nearby(a.x, a.y, CR);
      for (const ra of near) {
        if (ra.dead || ra.state === STATE.COMBAT) continue;
        if (dist2(a.x, a.y, ra.x, ra.y) < CR2) {
          a._prevState = a.state;
          if (a.state === STATE.ATTACHED && a.dragTarget) { a.dragTarget.detach(a); a.dragTarget = null; }
          a.combatTarget = ra; a.state = STATE.COMBAT; a._combatTimer = 0;
          ra._prevState = ra.state;
          if (ra.state === STATE.ATTACHED && ra.dragTarget) { ra.dragTarget.detach(ra); ra.dragTarget = null; }
          ra.combatTarget = a; ra.state = STATE.COMBAT; ra._combatTimer = 0;
          break;
        }
      }
    }

    // 2b. Red soldiers initiate combat with black ants
    const bhash = new SpatialHash(CR * 2);
    for (const a of this.ants) {
      if (!a.dead && a.state !== STATE.COMBAT && a.role !== 'acid') bhash.insert(a);
    }
    for (const ra of this.redAnts) {
      if (ra.dead || ra.role !== 'soldier' || ra.state === STATE.COMBAT) continue;
      const near = bhash.nearby(ra.x, ra.y, CR);
      for (const a of near) {
        if (a.dead || a.state === STATE.COMBAT) continue;
        if (dist2(ra.x, ra.y, a.x, a.y) < CR2) {
          ra._prevState = ra.state;
          if (ra.state === STATE.ATTACHED && ra.dragTarget) { ra.dragTarget.detach(ra); ra.dragTarget = null; }
          ra.combatTarget = a; ra.state = STATE.COMBAT; ra._combatTimer = 0;
          a._prevState = a.state;
          if (a.state === STATE.ATTACHED && a.dragTarget) { a.dragTarget.detach(a); a.dragTarget = null; }
          a.combatTarget = ra; a.state = STATE.COMBAT; a._combatTimer = 0;
          break;
        }
      }
    }

    // 3. Damage tick — role-aware for both factions
    const tickDamage = (arr) => {
      for (const a of arr) {
        if (a.dead || a.hp <= 0 || a.state !== STATE.COMBAT) continue;
        const t = a.combatTarget;
        if (!t || t.dead || t.hp <= 0) { a.state = a._prevState; a.combatTarget = null; continue; }
        if (dist2(a.x, a.y, t.x, t.y) > CR2 * 9) { a.state = a._prevState; a.combatTarget = null; continue; }
        a._combatTimer += dt;
        if (a._combatTimer >= CFG.COMBAT_TICK) {
          a._combatTimer -= CFG.COMBAT_TICK;
          const dmg = a.role === 'commander' ? CFG.DMG_COMMANDER
            : a.role === 'soldier' ? CFG.DMG_SOLDIER
              : a.faction === 'red' ? CFG.DMG_RED
                : CFG.DMG_BLACK;
          // Aura bonus: +1 damage for black ants near a commander
          const auraBonus = (a.faction === 'black' && a.role !== 'commander' && a._auraBoosted) ? CFG.COMMANDER_AURA_DMG : 0;
          t.hp -= (dmg + auraBonus);
        }
      }
    };
    tickDamage(this.ants);
    tickDamage(this.redAnts);

    // 4. Kill ants at 0 hp
    const killAnt = (a) => {
      a.dead = true;
      this.carcasses.push(new Carcass(a.x, a.y));
      for (let i = 0; i < 7; i++) this.particles.push(new Particle(a.x, a.y));
      const partner = a.combatTarget;
      if (partner && !partner.dead) {
        partner.state = partner._prevState;
        partner.combatTarget = null;
      }
      if (a.faction === 'black') {
        this.colony.totalDeaths++;
      } else {
        // Enemy killed in combat: paint faction clean channel so workers retrieve body
        this.grid.paintF('black', 'clean', a.x, a.y, 30, 100);
        this.grid.paintF('red', 'clean', a.x, a.y, 30, 100);
        if (this.redColony) this.redColony.totalDeaths++;
      }
    };

    for (const a of this.ants) { if (!a.dead && a.hp <= 0) killAnt(a); }
    for (const ra of this.redAnts) { if (!ra.dead && ra.hp <= 0) killAnt(ra); }

    // 5. Purge dead
    if (this.ants.some(a => a.dead)) this.ants = this.ants.filter(a => !a.dead);
    if (this.redAnts.some(ra => ra.dead)) this.redAnts = this.redAnts.filter(ra => !ra.dead);
  }

  // Universal Faction Combat Scanning & Alarm Triggering
  // myAnts: defending faction array, enemyAnts: attacking faction array
  _resolveFactionCombat(myAnts, enemyAnts, myFaction, dt) {
    if (enemyAnts.length === 0) return;
    const maxR = Math.max(CFG.COMMANDER_SCAN, CFG.SOLDIER_SCAN, CFG.WORKER_SCAN);
    const eHash = new SpatialHash(maxR);
    for (const e of enemyAnts) if (!e.dead) eHash.insert(e);

    for (const a of myAnts) {
      if (a.dead || a.state === STATE.COMBAT || a.state === STATE.DEFEND) continue;
      if (a.role === 'acid') continue;
      // Workers don't interrupt RETURN (carrying food) or CLEAN_FOLLOW
      if (a.role === 'worker' && (a.state === STATE.RETURN || a.state === STATE.CLEAN_FOLLOW)) continue;

      const scanR = a.role === 'commander' ? CFG.COMMANDER_SCAN : a.role === 'soldier' ? CFG.SOLDIER_SCAN : CFG.WORKER_SCAN;
      const scanR2 = scanR * scanR;
      const near = eHash.nearby(a.x, a.y, scanR);
      let closest = null, closestD2 = Infinity;

      for (const e of near) {
        if (e.dead) continue;
        const d2 = dist2(a.x, a.y, e.x, e.y);
        if (d2 < scanR2 && d2 < closestD2) { closestD2 = d2; closest = e; }
      }

      if (closest) {
        a._prevState = a.state;
        a.combatTarget = closest;
        a.state = STATE.DEFEND;

        // Worker alarm burst: strong danger/enemy pheromone pulse draws nearby nestmates
        if (a.role === 'worker') {
          // Paint danger channel so allies run/panic, but soldiers wake up natively
          this.grid.paintF(myFaction, 'danger', a.x, a.y, CFG.ALARM_BURST_R, CFG.ALARM_BURST_STR);

          // Long-range Soldier Alarm: Instantly wake up and launch any soldier within 500px, identical for both factions
          for (const sa of myAnts) {
            if (sa.dead || sa.role !== 'soldier' || sa === a) continue;
            if (sa.state === STATE.COMBAT || sa.state === STATE.DEFEND) continue;
            if (dist2(a.x, a.y, sa.x, sa.y) < 500 * 500) {
              sa._prevState = sa.state;
              sa.combatTarget = closest;
              sa.state = STATE.DEFEND;
            }
          }
        }
      }
    }
  }

  // Phase 7: Acid-Shooter kiting + shooting (Universal)
  _updateAcidShooters(myAnts, enemyHash, dt) {
    const AR = CFG.ACID_RANGE, AR2 = AR * AR;
    const KR2 = CFG.ACID_KITE_R * CFG.ACID_KITE_R;
    for (const a of myAnts) {
      if (a.dead || a.role !== 'acid') continue;
      a._shootCooldown = Math.max(0, a._shootCooldown - dt);
      const near = enemyHash.nearby(a.x, a.y, AR);
      let closest = null, closestD2 = Infinity;
      for (const e of near) {
        if (e.dead) continue;
        const d2 = dist2(a.x, a.y, e.x, e.y);
        if (d2 < AR2 && d2 < closestD2) { closestD2 = d2; closest = e; }
      }
      if (!closest) continue;
      if (closestD2 < KR2) {
        const awayAngle = Math.atan2(a.y - closest.y, a.x - closest.x);
        let diff = awayAngle - a.angle;
        while (diff > Math.PI) diff -= TWO_PI;
        while (diff < -Math.PI) diff += TWO_PI;
        a.angle += Math.sign(diff) * Math.min(Math.abs(diff), CFG.ANT_TURN * dt * 3);
      }
      if (a._shootCooldown <= 0) {
        a._shootCooldown = CFG.ACID_COOLDOWN;
        this.projectiles.push(new Projectile(a.x, a.y, closest.x, closest.y));
      }
    }
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (p.done) {
        this.acidPools.push(new AcidPool(p.x, p.y));
        this.projectiles.splice(i, 1);
      }
    }
  }

  _updateAcidPools(dt, factionAHash, factionBHash) {
    for (let i = this.acidPools.length - 1; i >= 0; i--) {
      const pool = this.acidPools[i];
      pool.update(dt, factionAHash);
      pool.update(dt, factionBHash); // pool hits everyone
      if (pool.dead) this.acidPools.splice(i, 1);
    }
  }

  // Mark all black ants within COMMANDER_AURA_R of any commander as _auraBoosted.
  // Must be called BEFORE ant updates each frame so the flag is fresh.
  _applyCommanderAura() {
    const AR = CFG.COMMANDER_AURA_R, AR2 = AR * AR;
    // Reset all
    for (const a of this.ants) a._auraBoosted = false;
    // For each commander, mark nearby allies
    for (const cmd of this.ants) {
      if (cmd.dead || cmd.role !== 'commander') continue;
      for (const a of this.ants) {
        if (a === cmd || a.dead) continue;
        if (dist2(cmd.x, cmd.y, a.x, a.y) < AR2) a._auraBoosted = true;
      }
    }
  }

  // ── Panel toggle & input isolation ────────────────────────────
  _initPanel() {
    const panel = document.getElementById('nest-panel');
    const toggle = document.getElementById('panel-toggle');
    if (toggle && panel) {
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        const hidden = panel.classList.toggle('hidden');
        toggle.textContent = hidden ? '›' : '‹';
      });
      ['mousedown', 'mouseup', 'mousemove', 'click', 'contextmenu'].forEach(evt => {
        panel.addEventListener(evt, e => {
          e.stopPropagation();
          if (evt === 'contextmenu') e.preventDefault();
        });
      });
    }
    // QWER: 선택된 장군의 페로몬 모드 변경 / Arrow keys: 카메라 이동
    document.addEventListener('keydown', e => {
      this._keys[e.key] = true;
      if (e.target.tagName === 'INPUT') return;
      const sel = this.selectedCommander;
      if (sel && !sel.dead) {
        const k = e.key.toUpperCase();
        if      (k === 'Q') sel.pheromoneMode = 'food';
        else if (k === 'W') sel.pheromoneMode = 'danger';
        else if (k === 'E') sel.pheromoneMode = 'clean';
        else if (k === 'R') sel.pheromoneMode = 'rally';
      }
    });
    document.addEventListener('keyup', e => { this._keys[e.key] = false; });
  }

  _initInput() {
    const xy = e => {
      const r = this.canvas.getBoundingClientRect(), s = e.touches ? e.touches[0] : e;
      return { x: s.clientX - r.left, y: s.clientY - r.top };
    };
    const c = this.canvas;
    c.addEventListener('mousedown', e => { const p = xy(e); this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.wx = p.x + this.cam.x; this.mouse.wy = p.y; if (e.button === 0) { this.mouse.left = true; this.mouse.leftClick = true; } if (e.button === 2) { this.mouse.right = true; this.mouse.rightClick = true; } });
    c.addEventListener('mouseup', e => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    c.addEventListener('mousemove', e => { const p = xy(e); this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.wx = p.x + this.cam.x; this.mouse.wy = p.y; });
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('touchstart', e => { e.preventDefault(); this.mouse.left = true; const p = xy(e); this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.wx = p.x + this.cam.x; this.mouse.wy = p.y; }, { passive: false });
    c.addEventListener('touchend', e => { e.preventDefault(); this.mouse.left = false; }, { passive: false });
    c.addEventListener('touchmove', e => { e.preventDefault(); const p = xy(e); this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.wx = p.x + this.cam.x; this.mouse.wy = p.y; }, { passive: false });
  }

  _loop(ts) {
    const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
    this._lastTs = ts; this._frame++;
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc >= 0.5) {
      this._fps = Math.round(this._fpsN / this._fpsAcc);
      this._fpsAcc = 0; this._fpsN = 0;
    }
    this._update(dt);
    this._render();
    requestAnimationFrame(ts => this._loop(ts));
  }

  _update(dt) {
    const { canvas, grid, queen, colony, mouse } = this;
    const vw = canvas.width, vh = canvas.height;

    // ── Camera movement (arrow keys) ──────────────────────────────
    const camMaxX = this.worldW - vw;
    if (this._keys['ArrowLeft'] || this._keys['a']) this.cam.x = Math.max(0, this.cam.x - CFG.CAM_SPEED * dt);
    if (this._keys['ArrowRight'] || this._keys['d']) this.cam.x = Math.min(camMaxX, this.cam.x + CFG.CAM_SPEED * dt);

    // Update world-space mouse coordinates continuously
    mouse.wx = mouse.x + this.cam.x;
    mouse.wy = mouse.y;

    // ── 장군 RTS 선택 & 이동 명령 ─────────────────────────────────
    // 좌클릭: 장군 위에서 → 선택/해제, 빈 공간 → 선택 해제
    if (mouse.leftClick) {
      mouse.leftClick = false;
      const SEL_R2 = 576; // 24px 선택 반경
      const cmds = this.ants.filter(a => a.role === 'commander' && !a.dead);
      let hit = null;
      for (const c of cmds) {
        if ((c.x - mouse.wx) ** 2 + (c.y - mouse.wy) ** 2 < SEL_R2) { hit = c; break; }
      }
      // 같은 장군 재클릭 → 해제 / 다른 장군 클릭 → 교체 / 빈 곳 → 해제
      this.selectedCommander = (hit && hit !== this.selectedCommander) ? hit : null;
    }
    // 우클릭: 선택된 장군에게 이동 명령
    if (mouse.rightClick) {
      mouse.rightClick = false;
      if (this.selectedCommander && !this.selectedCommander.dead) {
        this.selectedCommander.moveTarget = { x: mouse.wx, y: mouse.wy };
      }
    }
    // 선택된 장군이 죽으면 자동 해제
    if (this.selectedCommander?.dead) this.selectedCommander = null;

    grid.update(this._frame);
    if (this._frame % CFG.HOME_RESEED === 0) {
      queen.seedPheromone(grid);
      if (this.enemyNest) this.enemyNest.seedPheromone(grid);
    }

    queen.update(dt);
    if (this.enemyNest) this.enemyNest.update(dt);
    for (const f of this.foods) f.update(dt, this.worldW, this.worldH);
    for (const c of this.carcasses) c.update(dt, this.worldW, this.worldH);
    for (const p of this.pits) p.update(dt);

    const allFood = this.foods.concat(this.carcasses.filter(c => c.active));

    // ── Commander aura: mark nearby black ants before FSM update ──
    this._applyCommanderAura();

    // ── Black ant update: pit → lifespan → FSM ───────────────────
    const starveMult = colony.isStarving ? 3 : 1;
    for (let i = this.ants.length - 1; i >= 0; i--) {
      const ant = this.ants[i];
      let consumed = false;
      for (const pit of this.pits) {
        if (!pit.dead && pit.applyPhysics(ant, dt)) {
          pit.consume(ant, grid, this.particles);
          colony.totalDeaths++;
          this.ants.splice(i, 1);
          consumed = true; break;
        }
      }
      if (consumed) continue;
      ant.lifespan -= dt * starveMult * colony.diseaseMult;
      if (ant.lifespan <= 0) {
        this.carcasses.push(new Carcass(ant.x, ant.y));
        colony.totalDeaths++;
        this.ants.splice(i, 1);
        continue;
      }
      ant.update(dt, grid, allFood, queen, this.worldW, this.worldH, colony);
      this._applyObstaclePhysics(ant);
    }

    // ── Black colony tick (egg/hatch) ─────────────────────────────
    const liveCarcasses = this.carcasses.filter(c => c.active).length;
    const spawnInfo = colony.tick(dt, this.ants.length, liveCarcasses);
    for (let i = 0; i < spawnInfo.count; i++) this.ants.push(new Ant(queen.x, queen.y, spawnInfo.role));

    // ── Red colony tick ───────────────────────────────────────────
    if (this.redColony) {
      const redSpawnInfo = this.redColony.tick(dt, this.redAnts.length);
      for (let i = 0; i < redSpawnInfo.count; i++) {
        const ra = new Ant(this.enemyNest.x, this.enemyNest.y, redSpawnInfo.role);
        ra.faction = 'red';
        ra.hp = ra.role === 'soldier' ? CFG.HP_SOLDIER : CFG.HP_WORKER;
        ra.lifespan = CFG.RED_LIFESPAN_BASE + Math.random() * CFG.RED_LIFESPAN_VAR;
        ra.angle = Math.random() * TWO_PI;
        this.redAnts.push(ra);
      }
    }

    // ── Red ant update: lifespan → FSM ───────────────────────────
    const redStarveMult = this.redColony?.isStarving ? 3 : 1;
    for (let i = this.redAnts.length - 1; i >= 0; i--) {
      const ra = this.redAnts[i];
      if (ra.dead) continue;
      ra.lifespan -= dt * redStarveMult;
      if (ra.lifespan <= 0) {
        this.carcasses.push(new Carcass(ra.x, ra.y));
        this.grid.paintF('red', 'clean', ra.x, ra.y, 30, 100);
        this.grid.paintF('black', 'clean', ra.x, ra.y, 30, 100);
        if (this.redColony) this.redColony.totalDeaths++;
        ra.dead = true;
        continue;
      }
      ra.update(dt, grid, allFood, this.enemyNest, this.worldW, this.worldH, this.redColony);
      this._applyObstaclePhysics(ra);
    }

    // ── Housekeeping ──────────────────────────────────────────────
    this.pits = this.pits.filter(p => !p.dead);
    this.particles = this.particles.filter(p => p.update(dt));
    if (this._frame % 300 === 0) this.carcasses = this.carcasses.filter(c => c.active);

    // Phase 10: 비활성 오브젝트에 붙어 있는 개미 해방 (안전망)
    for (const ant of this.ants) {
      if (ant.state === STATE.ATTACHED && (!ant.dragTarget || !ant.dragTarget.active)) {
        if (ant.dragTarget) ant.dragTarget.detach(ant);
        ant.dragTarget = null; ant.state = STATE.WANDER;
      }
    }
    for (const ra of this.redAnts) {
      if (ra.state === STATE.ATTACHED && (!ra.dragTarget || !ra.dragTarget.active)) {
        if (ra.dragTarget) ra.dragTarget.detach(ra);
        ra.dragTarget = null; ra.state = STATE.WANDER;
      }
    }
    // Purge depleted food entries; when count drops, spawn 1-2 replacements
    const prevFoodCount = this.foods.length; // 전체 수 (비활성 포함)
    this.foods = this.foods.filter(f => f.active);
    if (this.foods.length < prevFoodCount && this.foods.length < CFG.FOOD_COUNT) {
      this._respawnSomeFoods(); // adds 1 or 2 new foods with random scale
    }
    if (this.pits.length === 0) this.pits = this._spawnPits();

    // ── Combat ───────────────────────────────────────────────────
    this._resolveCombat(dt);
    this._resolveFactionCombat(this.ants, this.redAnts, 'black', dt);
    this._resolveFactionCombat(this.redAnts, this.ants, 'red', dt);

    // ── Phase 7: Acid shooters ────────────────────────────────────
    const redHashShared = new SpatialHash(CFG.ACID_RANGE * 2);
    for (const ra of this.redAnts) if (!ra.dead) redHashShared.insert(ra);

    const blackHashShared = new SpatialHash(CFG.ACID_RANGE * 2);
    for (const a of this.ants) if (!a.dead) blackHashShared.insert(a);

    // Invisible enemy-proximity pheromone for opposing ant flee
    if (this._frame % 8 === 0) {
      for (const a of this.ants) {
        if (!a.dead) grid.paintF('black', 'enemy', a.x, a.y, 38, 28);
      }
      for (const ra of this.redAnts) {
        if (!ra.dead) grid.paintF('red', 'enemy', ra.x, ra.y, 38, 28);
      }
    }

    this._updateAcidShooters(this.ants, redHashShared, dt);
    this._updateAcidShooters(this.redAnts, blackHashShared, dt);
    this._updateProjectiles(dt);
    this._updateAcidPools(dt, redHashShared, blackHashShared);
  }

  _render() {
    const { ctx, canvas: { width: vw, height: vh } } = this;
    const { cam, worldW, worldH } = this;

    // ── World space ───────────────────────────────────────────────
    ctx.save();
    ctx.translate(-cam.x, 0);

    // Warm ochre soil background — makes ants visible
    ctx.fillStyle = '#9c7449';
    ctx.fillRect(0, 0, worldW, worldH);

    // Subtle soil texture stripes
    ctx.strokeStyle = 'rgba(160,100,40,0.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x < worldW; x += 38) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, worldH); ctx.stroke();
    }
    for (let y = 0; y < worldH; y += 38) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(worldW, y); ctx.stroke();
    }

    this.grid.render(ctx, worldW, worldH);

    for (const p of this.pits) p.draw(ctx);
    for (const ob of this.obstacles) ob.draw(ctx);
    for (const f of this.foods) f.draw(ctx);
    for (const c of this.carcasses) c.draw(ctx);
    for (const ap of this.acidPools) ap.draw(ctx);
    for (const a of this.ants) a.draw(ctx, this.sprites);
    // Commander aura glow + RTS 선택 링 + 이동 목표 마커
    ctx.save();
    for (const a of this.ants) {
      if (a.role !== 'commander') continue;
      // 오라 글로우
      const grad = ctx.createRadialGradient(a.x, a.y, 4, a.x, a.y, CFG.COMMANDER_AURA_R);
      grad.addColorStop(0, 'rgba(255,210,30,0.18)');
      grad.addColorStop(1, 'rgba(255,180,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(a.x, a.y, CFG.COMMANDER_AURA_R, 0, TWO_PI); ctx.fill();
      // 선택 링 (페로몬 모드 색상)
      if (a === this.selectedCommander) {
        const phColor = PH_MODE[a.pheromoneMode]?.color ?? '#00e8ff';
        ctx.beginPath(); ctx.arc(a.x, a.y, 14, 0, TWO_PI);
        ctx.strokeStyle = phColor; ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
        // 이동 목표 마커
        if (a.moveTarget) {
          const { x: tx, y: ty } = a.moveTarget;
          const r = 8;
          ctx.strokeStyle = phColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.arc(tx, ty, r, 0, TWO_PI); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tx - r - 4, ty); ctx.lineTo(tx + r + 4, ty); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tx, ty - r - 4); ctx.lineTo(tx, ty + r + 4); ctx.stroke();
          // 장군 → 목표 점선
          ctx.setLineDash([4, 4]); ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
    for (const ra of this.redAnts) ra.draw(ctx, this.sprites);
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const p of this.particles) p.draw(ctx);
    this.queen.draw(ctx);
    if (this.enemyNest) this.enemyNest.draw(ctx);

    // 크로스헤어 렌더링
    this._renderBrush(ctx);

    ctx.restore();
    // ── Screen / HUD space ────────────────────────────────────────
    this._renderHUD(ctx, vw, vh);
  }

  _renderBrush(ctx) {
    const { x: sx, y: sy } = this.mouse;
    // ── Custom crosshair — screen space ───────────────────────────
    ctx.save();
    ctx.resetTransform();
    ctx.setLineDash([]);
    const arm = 11, gap = 4;
    const seg = (x1, y1, x2, y2, col, lw) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
    };
    const segs = [
      [sx - arm, sy, sx - gap, sy],
      [sx + gap, sy, sx + arm, sy],
      [sx, sy - arm, sx, sy - gap],
      [sx, sy + gap, sx, sy + arm],
    ];
    segs.forEach(([x1, y1, x2, y2]) => seg(x1, y1, x2, y2, 'rgba(0,0,0,0.85)', 3.5));
    segs.forEach(([x1, y1, x2, y2]) => seg(x1, y1, x2, y2, 'rgba(255,255,255,0.98)', 1.5));
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, TWO_PI);
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, TWO_PI);
    ctx.fillStyle = 'rgba(255,255,255,0.98)'; ctx.fill();
    ctx.restore();
  }

  _renderHUD(ctx, vw, vh) {
    const { ants, pits, colony, redAnts, redColony } = this;
    const following = ants.filter(a => a.state === STATE.FOLLOW).length;
    const returning = ants.filter(a => a.state === STATE.RETURN).length;
    const cleaning = ants.filter(a => a.state === STATE.CLEAN_FOLLOW).length;
    const rallying = ants.filter(a => a.state === STATE.RALLY).length;
    const defending = ants.filter(a => a.state === STATE.DEFEND).length;
    const fighting = ants.filter(a => a.state === STATE.COMBAT).length;
    const carrying = ants.filter(a => a.state === STATE.ATTACHED).length;
    const workers = ants.filter(a => a.role === 'worker').length;
    const soldiers = ants.filter(a => a.role === 'soldier').length;
    const acidAnts = ants.filter(a => a.role === 'acid').length;
    const commanders = ants.filter(a => a.role === 'commander').length;

    // Red ant stats
    const rWorkers = redAnts.filter(a => a.role === 'worker').length;
    const rSoldiers = redAnts.filter(a => a.role === 'soldier').length;
    const rFighting = redAnts.filter(a => a.state === STATE.COMBAT).length;
    const rDefend = redAnts.filter(a => a.state === STATE.DEFEND).length;

    ctx.save();
    const panel = (x, y, w, h) => {
      ctx.fillStyle = 'rgba(8,10,16,0.80)'; ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h); ctx.fill();
    };

    // ── Black colony stats ────────────────────────────────────────
    panel(10, 10, 242, 274);
    ctx.font = '12px monospace';
    [
      [`FPS: ${this._fps}`, '#555'],
      [`🐜 Ants: ${ants.length}`, '#d4902a'],
      [`   ⚒W:${workers}  🗡S:${soldiers}  ☣A:${acidAnts}  ♛C:${commanders}`, '#b09060'],
      [`   Wandering: ${ants.length - following - returning - cleaning - rallying - defending - fighting - carrying}`, '#c87830'],
      [`   Foraging:  ${following}`, '#80d4ff'],
      [`   Returning: ${returning}`, '#50ff70'],
      [`   Carrying:  ${carrying}`, '#ffd700'],
      [`   Cleaning:  ${cleaning}`, '#cc44ff'],
      [`   Rallying:  ${rallying}`, '#ff8820'],
      [`   Defending: ${defending}`, '#ff7030'],
      [`   Fighting:  ${fighting}`, '#ffee20'],
      [`💀 Pits: ${pits.length}  ☠ Surf: ${this.carcasses.filter(c => c.active).length}`, '#9a8860'],
      [`🧪 Pools: ${this.acidPools.length}  🥚 Eggs: ${colony.eggs}`, '#70cc30'],
    ].forEach(([t, c], i) => { ctx.fillStyle = c; ctx.fillText(t, 22, 36 + i * 16); });

    // ── Red colony stats ──────────────────────────────────────────
    panel(10, 294, 242, 100);
    ctx.font = '12px monospace';
    [
      [`⚔ RED FACTION: ${redAnts.length}`, '#cc3030'],
      [`   ⚒W:${rWorkers}  🗡S:${rSoldiers}`, '#c07070'],
      [`   Fighting:${rFighting}  Defend:${rDefend}`, '#ff7070'],
      [`   🌿 Food: ${redColony ? Math.floor(redColony.food) : '?'}  🥚 Eggs: ${redColony?.eggs ?? 0}`, '#c86060'],
      [`   💀 Deaths: ${redColony?.totalDeaths ?? 0}`, '#884040'],
    ].forEach(([t, c], i) => { ctx.fillStyle = c; ctx.fillText(t, 22, 314 + i * 16); });

    // ── 장군 조작 안내 ─────────────────────────────────────────────
    const cmdrCount = this.ants.filter(a => a.role === 'commander' && !a.dead).length;
    if (cmdrCount > 0) {
      const sel = this.selectedCommander;
      if (sel) {
        const ph = PH_MODE[sel.pheromoneMode] ?? PH_MODE.rally;
        panel(10, 388, 235, 72);
        ctx.font = '11px monospace'; ctx.textAlign = 'left';
        // 선택됨 + 이동 안내
        ctx.fillStyle = ph.color;
        ctx.fillText(`♛ [선택됨]  우클릭: 이동 명령`, 16, 404);
        // 페로몬 모드 표시
        ctx.fillStyle = '#aaaaaa'; ctx.fillText('페로몬 모드 (QWER):', 16, 420);
        ctx.fillStyle = ph.color;
        ctx.fillText(`  ${ph.key} ▶ ${ph.label}`, 16, 436);
        // QWER 키 힌트
        ctx.font = '10px monospace';
        let kx = 16;
        for (const [ch, m] of Object.entries(PH_MODE)) {
          const active = sel.pheromoneMode === ch;
          ctx.fillStyle = active ? m.color : '#444455';
          ctx.fillText(`[${m.key}]`, kx, 454); kx += 52;
        }
      } else {
        panel(10, 388, 235, 24);
        ctx.font = '11px monospace'; ctx.textAlign = 'left';
        ctx.fillStyle = '#ffe040';
        ctx.fillText(`♛ 좌클릭으로 장군 선택 (${cmdrCount}명)`, 16, 404);
      }
    }

    // ── Mini-map scroll indicator ─────────────────────────────────
    const mmW = 220, mmH = 18, mmX = 10, mmY = vh - 55;
    panel(mmX - 2, mmY - 2, mmW + 4, mmH + 22);
    ctx.fillStyle = 'rgba(30,20,10,0.8)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    // Viewport indicator
    const vpFrac = vw / this.worldW;
    const camFrac = this.cam.x / Math.max(1, this.worldW - vw);
    ctx.fillStyle = 'rgba(200,140,50,0.7)';
    ctx.fillRect(mmX + (mmW - mmW * vpFrac) * camFrac, mmY + 2, mmW * vpFrac, mmH - 4);
    ctx.strokeStyle = '#8a6030'; ctx.lineWidth = 1; ctx.strokeRect(mmX, mmY, mmW, mmH);
    ctx.fillStyle = '#888'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('◀ ▶  Arrow Keys or A/D to Scroll Map', mmX + mmW / 2, mmY + mmH + 12);

    // ── Instruction bar ───────────────────────────────────────────
    panel(vw / 2 - 230, vh - 34, 460, 24);
    ctx.fillStyle = '#88ccff'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('좌클릭: 장군 선택  |  우클릭: 이동 명령  |  QWER: 페로몬 모드  |  ◀▶: 맵 스크롤', vw / 2, vh - 16);

    ctx.restore();
  }
}

// ================================================================
//  ENTRY POINT
// ================================================================
window.addEventListener('load', () => { new Game(); });
