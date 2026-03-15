/**
 * EnemyManager.js — 적 오브젝트 풀 & 웨이브 스폰 관리
 *
 * v0.7.0: 20종 적 타입 (티어 1~10, minWave 기반 순차 등장)
 *         방향별 순차 그룹 스폰 (상→하→좌→우 순서, 그룹당 4마리)
 *         배경 잔해물(DEBRIS) 풀 — 정적·비충돌, 시야 공백 채움
 */

const EnemyManager = (() => {

  // ── 기본 상수
  const MAX_ENEMIES     = 500;
  const ENEMY_RADIUS    = 14;
  const ENEMY_SPEED_BASE = 58;
  const ENEMY_HP_BASE   = 3;
  const ENEMY_DAMAGE    = 10;
  const CONTACT_COOLDOWN = 1.2;

  const MODULE_DROP_CHANCE         = 0.15;
  const MAX_MODULE_DROPS           = 50;
  const MODULE_DROP_COLLECT_RADIUS = 40;
  const MODULE_DROP_LIFETIME       = 30;

  const SPAWN_MARGIN     = 60;
  const SPAWN_GROUP_SIZE = 4;   // 한 방향당 스폰 수
  const SPAWN_INTERVAL   = 0.4; // 그룹 내 스폰 간격 (s)
  const SPAWN_GROUP_GAP  = 2.0; // 방향 전환 대기 (s)

  const REST_DURATION  = 6;
  const KILL_BASE      = 12;   // Wave 1 킬 목표
  const KILL_PER_WAVE  = 6;    // 웨이브당 킬 목표 증가

  const MAX_GEMS    = 500;
  const DEBRIS_COUNT = 1500;  // 배경 잔해물 수 (16배 맵 채우기)

  // ── 20종 적 타입 정의
  // minWave: 첫 등장 웨이브 / behavior: 'chase'|'zigzag'|'dash'|'splitter'
  const ENEMY_TYPES = {

    // ── Tier 1 (Wave 1+) — 튜토리얼 적
    DRONE:      { radiusMult:0.55, hpMult:0.40, speedMult:0.75, damageMult:0.5, xpMult:0.4,  weight:8, behavior:'chase',    minWave:1  },
    RUSHER:     { radiusMult:0.50, hpMult:0.35, speedMult:2.20, damageMult:0.6, xpMult:0.5,  weight:7, behavior:'chase',    minWave:1  },

    // ── Tier 2 (Wave 4+)
    SWARM:      { radiusMult:0.42, hpMult:0.30, speedMult:2.40, damageMult:0.4, xpMult:0.3,  weight:9, behavior:'chase',    minWave:4  },
    ZIGZAGGER:  { radiusMult:0.90, hpMult:1.00, speedMult:1.30, damageMult:0.9, xpMult:1.2,  weight:5, behavior:'zigzag',   minWave:4  },

    // ── Tier 3 (Wave 7+)
    GRUNT:      { radiusMult:1.00, hpMult:1.00, speedMult:1.00, damageMult:1.0, xpMult:1.0,  weight:6, behavior:'chase',    minWave:7  },
    DASHER:     { radiusMult:0.85, hpMult:1.20, speedMult:0.70, damageMult:1.5, xpMult:1.5,  weight:4, behavior:'dash',     minWave:7  },

    // ── Tier 4 (Wave 10+)
    LANCER:     { radiusMult:0.80, hpMult:0.90, speedMult:1.70, damageMult:1.3, xpMult:1.5,  weight:5, behavior:'chase',    minWave:10 },
    SHADE:      { radiusMult:1.00, hpMult:1.50, speedMult:1.00, damageMult:1.2, xpMult:2.0,  weight:3, behavior:'chase',    minWave:10 },

    // ── Tier 5 (Wave 13+)
    BRUTE:      { radiusMult:1.80, hpMult:5.00, speedMult:0.60, damageMult:2.0, xpMult:3.0,  weight:3, behavior:'chase',    minWave:13 },
    BOMBER:     { radiusMult:1.40, hpMult:2.00, speedMult:0.70, damageMult:3.5, xpMult:2.5,  weight:3, behavior:'chase',    minWave:13 },

    // ── Tier 6 (Wave 16+)
    SPLITTER:   { radiusMult:1.60, hpMult:3.00, speedMult:0.60, damageMult:1.3, xpMult:3.0,  weight:2, behavior:'splitter', minWave:16 },
    SENTINEL:   { radiusMult:2.00, hpMult:7.00, speedMult:0.45, damageMult:2.0, xpMult:4.0,  weight:2, behavior:'chase',    minWave:16 },

    // ── Tier 7 (Wave 19+)
    PHANTOM:    { radiusMult:1.00, hpMult:2.00, speedMult:1.70, damageMult:1.8, xpMult:3.5,  weight:2, behavior:'zigzag',   minWave:19 },
    RAVAGER:    { radiusMult:1.20, hpMult:2.50, speedMult:1.90, damageMult:2.5, xpMult:4.0,  weight:2, behavior:'dash',     minWave:19 },

    // ── Tier 8 (Wave 22+)
    JUGGERNAUT: { radiusMult:2.50, hpMult:12.0, speedMult:0.35, damageMult:3.0, xpMult:7.0,  weight:1, behavior:'chase',    minWave:22 },
    WRAITH:     { radiusMult:0.90, hpMult:3.00, speedMult:2.10, damageMult:2.0, xpMult:4.5,  weight:2, behavior:'dash',     minWave:22 },

    // ── Tier 9 (Wave 26+)
    ANCHOR:     { radiusMult:3.00, hpMult:20.0, speedMult:0.18, damageMult:6.0, xpMult:10.0, weight:1, behavior:'chase',    minWave:26 },
    ELITE:      { radiusMult:1.20, hpMult:4.00, speedMult:1.50, damageMult:2.2, xpMult:5.0,  weight:2, behavior:'chase',    minWave:26 },

    // ── Tier 10 (Wave 30+)
    TITAN:      { radiusMult:3.50, hpMult:35.0, speedMult:0.28, damageMult:5.0, xpMult:15.0, weight:1, behavior:'chase',    minWave:30 },
    APEX:       { radiusMult:2.00, hpMult:15.0, speedMult:1.20, damageMult:4.0, xpMult:12.0, weight:1, behavior:'dash',     minWave:30 },
  };

  const TYPE_KEYS = Object.keys(ENEMY_TYPES);

  /** 현재 웨이브에서 등장 가능한 타입 중 가중치 기반 랜덤 선택 */
  function _randomType() {
    const eligible    = TYPE_KEYS.filter(k => ENEMY_TYPES[k].minWave <= waveNumber);
    const totalWeight = eligible.reduce((s, k) => s + ENEMY_TYPES[k].weight, 0);
    let r = Math.random() * totalWeight;
    for (const k of eligible) {
      r -= ENEMY_TYPES[k].weight;
      if (r <= 0) return k;
    }
    return eligible[eligible.length - 1];
  }

  // ── 풀 배열
  const enemies     = [];
  const gems        = [];
  const moduleDrops = [];
  const debris      = []; // 배경 잔해물 (정적·비충돌)

  // ── 게임 상태
  let worldW, worldH;
  let _zoom          = 1.0;
  let waveNumber     = 1;
  let totalKills     = 0;
  let waveKills      = 0;
  let waveKillTarget = KILL_BASE;
  let isResting      = false;
  let restTimer      = 0;
  let spawnPending   = 0;
  let spawnTimer     = 0;

  // ── 순차 방향별 스폰 상태
  // 스폰 방향: 0=위 1=아래 2=왼쪽 3=오른쪽 (순서대로 순환)
  let spawnSide       = 0;
  let spawnGroupCount = 0; // 현재 방향에서 스폰된 수
  let spawnGroupTimer = 0; // 방향 전환 대기 타이머

  let _player = null;

  // ── 오브젝트 팩토리
  function createEnemy() {
    return {
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      angle: 0, hp: 0, maxHp: 0, speed: 0, radius: 0,
      contactCooldown: 0, xpValue: 0, type: 'DRONE', isSplit: false,
      zigzagPhase: 0, dashTimer: 0, dashCooldown: 0, shadeAlpha: 1.0,
    };
  }
  function createGem() {
    return { active: false, x: 0, y: 0, value: 0, collectRadius: 200, speed: 320 };
  }
  function createModuleDrop() {
    return { active: false, x: 0, y: 0, moduleType: '', lifetime: 0 };
  }

  /** 배경 잔해물 생성 — 맵 전체에 랜덤 산포 */
  function _initDebris() {
    debris.length = 0;
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      debris.push({
        x:     Math.random() * worldW,
        y:     Math.random() * worldH,
        angle: Math.random() * Math.PI * 2,
        size:  6 + Math.random() * 28,
        alpha: 0.05 + Math.random() * 0.13,
        shape: Math.floor(Math.random() * 4), // 0=원 1=사각 2=삼각 3=마름모
      });
    }
  }

  /** 초기화 */
  function init(ww, wh) {
    worldW = ww; worldH = wh;
    for (let i = 0; i < MAX_ENEMIES;      i++) enemies.push(createEnemy());
    for (let i = 0; i < MAX_GEMS;         i++) gems.push(createGem());
    for (let i = 0; i < MAX_MODULE_DROPS; i++) moduleDrops.push(createModuleDrop());
    _initDebris();
    waveKills       = 0;
    waveKillTarget  = KILL_BASE;
    isResting       = false;
    restTimer       = 0;
    spawnPending    = waveKillTarget;
    spawnTimer      = 0;
    spawnSide       = 0;
    spawnGroupCount = 0;
    spawnGroupTimer = 0;
  }

  function acquireEnemy()      { for (const e of enemies)     { if (!e.active) return e; } return null; }
  function acquireGem()        { for (const g of gems)        { if (!g.active) return g; } return null; }
  function acquireModuleDrop() { for (const d of moduleDrops) { if (!d.active) return d; } return null; }

  /** 줌 설정 (Game.js 루프에서 매 프레임 호출) */
  function setZoom(z) { _zoom = z; }

  /**
   * 지정 방향(side) 화면 가장자리 바깥 월드 좌표 반환
   * side: 0=위 1=아래 2=왼쪽 3=오른쪽
   */
  function getSpawnPos(player, side) {
    const W = Renderer.getWidth();
    const H = Renderer.getHeight();
    let sx, sy;
    if      (side === 0) { sx = Math.random() * W; sy = -SPAWN_MARGIN; }
    else if (side === 1) { sx = Math.random() * W; sy = H + SPAWN_MARGIN; }
    else if (side === 2) { sx = -SPAWN_MARGIN;     sy = Math.random() * H; }
    else                  { sx = W + SPAWN_MARGIN;  sy = Math.random() * H; }

    // 줌 역산 — 줌 아웃 시에도 실제 시야 바깥에 스폰
    let wx = player.x + (sx - player.screenX) / _zoom;
    let wy = player.y + (sy - player.screenY) / _zoom;
    wx = ((wx % worldW) + worldW) % worldW;
    wy = ((wy % worldH) + worldH) % worldH;
    return { wx, wy };
  }

  function waveScale() { return 1 + (waveNumber - 1) * 0.18; }

  /** 공통 적 초기화 (스폰·분열 공용) */
  function _initEnemy(e, wx, wy, typeKey, scale, isSplit) {
    const def  = ENEMY_TYPES[typeKey];
    e.active   = true;
    e.x        = ((wx % worldW) + worldW) % worldW;
    e.y        = ((wy % worldH) + worldH) % worldH;
    e.vx       = 0; e.vy = 0;
    e.type     = typeKey;
    e.isSplit  = !!isSplit;
    e.hp       = Math.ceil(ENEMY_HP_BASE * def.hpMult * scale);
    e.maxHp    = e.hp;
    e.speed    = ENEMY_SPEED_BASE * def.speedMult * (0.9 + Math.random() * 0.2) * Math.sqrt(scale);
    e.radius   = Math.ceil(ENEMY_RADIUS * def.radiusMult);
    e.contactCooldown = 0;
    e.xpValue  = Math.floor(20 * def.xpMult * scale);
    e.zigzagPhase  = 0;
    e.dashTimer    = 0;
    e.dashCooldown = 1.0 + Math.random() * 0.8;
    e.shadeAlpha   = 1.0;
  }

  /** 지정 방향에서 적 1마리 스폰 */
  function spawnOneFromSide(player, side) {
    const e = acquireEnemy();
    if (!e) return;
    const pos = getSpawnPos(player, side);
    _initEnemy(e, pos.wx, pos.wy, _randomType(), waveScale(), false);
  }

  /** 특정 월드 좌표에 적 스폰 (분열용) */
  function _spawnAt(wx, wy, typeKey) {
    const e = acquireEnemy();
    if (!e) return;
    _initEnemy(
      e,
      wx + (Math.random() - 0.5) * 50,
      wy + (Math.random() - 0.5) * 50,
      typeKey, waveScale(), true
    );
  }

  /** 활성 적 간 포개짐 방지 — O(n²) 원 밀어내기 */
  function _separateEnemies() {
    const active = [];
    for (const e of enemies) { if (e.active) active.push(e); }
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        const { dx, dy } = Collision.wrappedDelta(a.x, a.y, b.x, b.y, worldW, worldH);
        const dist    = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist > 0 && dist < minDist) {
          const push = (minDist - dist) * 0.5;
          const nx = dx / dist, ny = dy / dist;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          a.x = ((a.x % worldW) + worldW) % worldW;
          a.y = ((a.y % worldH) + worldH) % worldH;
          b.x = ((b.x % worldW) + worldW) % worldW;
          b.y = ((b.y % worldH) + worldH) % worldH;
        }
      }
    }
  }

  /** 매 프레임 업데이트 */
  function update(dt, player) {
    _player = player;
    let didLevelUp = false;

    // ── 웨이브 킬 목표 시스템
    if (isResting) {
      restTimer -= dt;
      if (restTimer <= 0) {
        isResting       = false;
        waveNumber++;
        waveKills       = 0;
        waveKillTarget  = KILL_BASE + (waveNumber - 1) * KILL_PER_WAVE;
        spawnPending    = waveKillTarget;
        spawnSide       = 0;
        spawnGroupCount = 0;
        spawnGroupTimer = 0;
      }
    } else {
      if (waveKills >= waveKillTarget) {
        isResting = true;
        restTimer = REST_DURATION;
        for (const e of enemies) e.active = false;
      } else {
        // 안전망: 활성 적이 남은 킬 목표보다 부족하면 보충
        if (spawnPending === 0) {
          let activeCount = 0;
          for (const e of enemies) { if (e.active) activeCount++; }
          const remaining = waveKillTarget - waveKills;
          if (activeCount < remaining) {
            spawnPending    = remaining - activeCount;
            spawnGroupCount = 0;
            spawnGroupTimer = 0;
          }
        }
      }
    }

    // ── 방향별 순차 그룹 스폰
    if (spawnPending > 0) {
      if (spawnGroupTimer > 0) {
        // 방향 전환 대기 중
        spawnGroupTimer -= dt;
        if (spawnGroupTimer <= 0) {
          spawnGroupTimer = 0;
          spawnSide       = (spawnSide + 1) % 4;
          spawnGroupCount = 0;
        }
      } else {
        // 현재 방향에서 스폰
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnTimer = SPAWN_INTERVAL;
          spawnOneFromSide(player, spawnSide);
          spawnPending--;
          spawnGroupCount++;
          // 그룹 소진 → 다음 방향 대기
          if (spawnGroupCount >= SPAWN_GROUP_SIZE && spawnPending > 0) {
            spawnGroupTimer = SPAWN_GROUP_GAP;
          }
        }
      }
    }

    // ── 적 AI 이동 · 플레이어 접촉 데미지
    const now = Date.now();
    for (const e of enemies) {
      if (!e.active) continue;

      const { dx, dy } = Collision.wrappedDelta(e.x, e.y, player.x, player.y, worldW, worldH);
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        e.angle = Math.atan2(dy, dx);
        const behavior = ENEMY_TYPES[e.type]?.behavior ?? 'chase';

        if (behavior === 'zigzag') {
          e.zigzagPhase += dt * 3.5;
          const perpX = -dy / dist, perpY = dx / dist;
          const sideOff = Math.sin(e.zigzagPhase) * 60;
          e.vx = (dx / dist) * e.speed + perpX * sideOff;
          e.vy = (dy / dist) * e.speed + perpY * sideOff;

        } else if (behavior === 'dash') {
          if (e.dashTimer > 0) {
            e.dashTimer -= dt;
            e.vx = (dx / dist) * e.speed * 3.5;
            e.vy = (dy / dist) * e.speed * 3.5;
          } else {
            e.dashCooldown -= dt;
            if (e.dashCooldown <= 0) {
              e.dashTimer    = 0.25;
              e.dashCooldown = 1.6 + Math.random() * 0.6;
            }
            e.vx = (dx / dist) * e.speed * 0.2;
            e.vy = (dy / dist) * e.speed * 0.2;
          }

        } else {
          // 기본 직선 추적
          e.vx = (dx / dist) * e.speed;
          e.vy = (dy / dist) * e.speed;
        }

        // 알파 펄스: SHADE, PHANTOM, WRAITH
        if (e.type === 'SHADE' || e.type === 'PHANTOM' || e.type === 'WRAITH') {
          e.shadeAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(now * 0.002 + e.x * 0.01));
        }
      }

      e.x += e.vx * dt; e.y += e.vy * dt;
      e.x = ((e.x % worldW) + worldW) % worldW;
      e.y = ((e.y % worldH) + worldH) % worldH;

      if (e.contactCooldown > 0) e.contactCooldown -= dt;

      if (e.contactCooldown <= 0) {
        const hitPolys = player.getHitPolygons();
        let hit = false;
        for (const poly of hitPolys) {
          if (Collision.polyCircleWrapped(poly, e.x, e.y, e.radius, worldW, worldH)) { hit = true; break; }
        }
        if (hit) {
          const dmg = Math.floor(ENEMY_DAMAGE * (ENEMY_TYPES[e.type]?.damageMult ?? 1));
          player.takeDamage(dmg);
          e.contactCooldown = CONTACT_COOLDOWN;
          // 플레이어에서 멀리 밀어내기
          const { dx: pdx, dy: pdy } = Collision.wrappedDelta(player.x, player.y, e.x, e.y, worldW, worldH);
          const pd = Math.hypot(pdx, pdy);
          if (pd > 0) {
            const pushTo = player.radius + e.radius + 4;
            e.x = ((( player.x + (pdx / pd) * pushTo) % worldW) + worldW) % worldW;
            e.y = ((( player.y + (pdy / pd) * pushTo) % worldH) + worldH) % worldH;
          }
        }
      }
    }

    _separateEnemies();

    // ── XP Gem 흡수
    for (const g of gems) {
      if (!g.active) continue;
      const { dx, dy } = Collision.wrappedDelta(g.x, g.y, player.x, player.y, worldW, worldH);
      const dist = Math.hypot(dx, dy);
      if (dist < g.collectRadius) {
        if (dist > 6) {
          g.x += (dx / dist) * g.speed * dt;
          g.y += (dy / dist) * g.speed * dt;
          g.x = ((g.x % worldW) + worldW) % worldW;
          g.y = ((g.y % worldH) + worldH) % worldH;
        } else {
          g.active = false;
          if (player.gainXp(g.value)) didLevelUp = true;
        }
      }
    }

    // ── ModuleDrop 수집
    for (const d of moduleDrops) {
      if (!d.active) continue;
      d.lifetime -= dt;
      if (d.lifetime <= 0) { d.active = false; continue; }
      const { dx: ddx, dy: ddy } = Collision.wrappedDelta(d.x, d.y, player.x, player.y, worldW, worldH);
      const collectR = Math.max(MODULE_DROP_COLLECT_RADIUS, player.hitboxRadius + 10);
      if (Math.hypot(ddx, ddy) < collectR) {
        d.active = false;
        TetrisGrid.queueModule(d.moduleType);
      }
    }

    return { levelUp: didLevelUp };
  }

  /** 적 HP 감소 (WeaponSystem에서 호출) */
  function damageEnemy(enemy, dmg) {
    enemy.hp -= dmg;
    if (enemy.hp <= 0) {
      enemy.active = false;
      totalKills++;
      waveKills++;

      // XP Gem 드랍
      const gem = acquireGem();
      if (gem) {
        gem.active = true; gem.x = enemy.x; gem.y = enemy.y; gem.value = enemy.xpValue;
      }

      // 모듈 드랍 (15% 확률)
      if (Math.random() < MODULE_DROP_CHANCE) {
        const drop = acquireModuleDrop();
        if (drop) {
          drop.active = true; drop.x = enemy.x; drop.y = enemy.y;
          drop.moduleType = TetrisGrid.randomModuleKey();
          drop.lifetime   = MODULE_DROP_LIFETIME;
        }
      }

      // 분열 처리
      if (enemy.type === 'SPLITTER' && !enemy.isSplit) {
        for (let i = 0; i < 3; i++) _spawnAt(enemy.x, enemy.y, 'SWARM');
      }
      if (enemy.type === 'SENTINEL' && !enemy.isSplit) {
        for (let i = 0; i < 2; i++) _spawnAt(enemy.x, enemy.y, 'GRUNT');
      }
      if (enemy.type === 'TITAN' && !enemy.isSplit) {
        for (let i = 0; i < 2; i++) _spawnAt(enemy.x, enemy.y, 'BRUTE');
      }

      return true;
    }
    return false;
  }

  /** 전체 렌더링 */
  function draw(player) {
    const W = Renderer.getWidth(), H = Renderer.getHeight();
    // 줌 아웃 시 더 넓은 시야를 컬링 범위에 반영
    const cullX = Math.ceil(W / _zoom / 2);
    const cullY = Math.ceil(H / _zoom / 2);
    const ctx   = Renderer.getCtx();

    // ── 배경 잔해물 (적·아이템보다 먼저 렌더, 낮은 알파)
    for (const d of debris) {
      const { sx, sy } = player.worldToScreen(d.x, d.y, worldW, worldH);
      if (sx < -cullX || sx > W + cullX || sy < -cullY || sy > H + cullY) continue;
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle   = '#7090a8';
      ctx.translate(sx, sy);
      ctx.rotate(d.angle);
      const s = d.size;
      ctx.beginPath();
      if (d.shape === 0) {
        ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      } else if (d.shape === 1) {
        ctx.rect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
      } else if (d.shape === 2) {
        ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.52, s * 0.42); ctx.lineTo(-s * 0.52, s * 0.42);
      } else {
        ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.5, 0); ctx.lineTo(0, s * 0.6); ctx.lineTo(-s * 0.5, 0);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ── 적
    for (const e of enemies) {
      if (!e.active) continue;
      const { sx, sy } = player.worldToScreen(e.x, e.y, worldW, worldH);
      if (sx < -cullX || sx > W + cullX || sy < -cullY || sy > H + cullY) continue;
      Renderer.drawEnemy(sx, sy, e.angle, e.radius, e.hp / e.maxHp, e.type, e.shadeAlpha);
    }

    // ── XP 젬
    for (const g of gems) {
      if (!g.active) continue;
      const { sx, sy } = player.worldToScreen(g.x, g.y, worldW, worldH);
      if (sx < -cullX || sx > W + cullX || sy < -cullY || sy > H + cullY) continue;
      Renderer.drawXpGem(sx, sy);
    }

    // ── 모듈 드랍
    for (const d of moduleDrops) {
      if (!d.active) continue;
      const { sx, sy } = player.worldToScreen(d.x, d.y, worldW, worldH);
      if (sx < -cullX || sx > W + cullX || sy < -cullY || sy > H + cullY) continue;
      Renderer.drawModuleDrop(sx, sy, d.moduleType);
    }
  }

  function getActiveEnemies() { return enemies.filter(e => e.active); }

  function getStats() {
    return { waveNumber, totalKills, waveKills, waveKillTarget, restTimer, isResting };
  }

  function reset(ww, wh) {
    worldW = ww; worldH = wh;
    for (const e of enemies)     e.active = false;
    for (const g of gems)        g.active = false;
    for (const d of moduleDrops) d.active = false;
    _initDebris();
    waveNumber      = 1;
    totalKills      = 0;
    waveKills       = 0;
    waveKillTarget  = KILL_BASE;
    isResting       = false;
    restTimer       = 0;
    spawnPending    = KILL_BASE;
    spawnTimer      = 0;
    spawnSide       = 0;
    spawnGroupCount = 0;
    spawnGroupTimer = 0;
  }

  return { init, update, draw, damageEnemy, getActiveEnemies, getStats, reset, setZoom };
})();

window.EnemyManager = EnemyManager;
