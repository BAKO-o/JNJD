/**
 * EnemyManager.js — 적 오브젝트 풀 & 웨이브 스폰 관리
 *
 * Phase 2: Object Pooling으로 최대 MAX_ENEMIES 개의 적을 관리.
 * v0.5.0: 10종 적 타입 추가, 타입별 AI 행동, 볼록 다각형 히트박스 적용.
 */

const EnemyManager = (() => {

  // ── 기본 상수
  const MAX_ENEMIES      = 300;
  const ENEMY_RADIUS     = 14;
  const ENEMY_SPEED_BASE = 58;
  const ENEMY_HP_BASE    = 3;
  const ENEMY_DAMAGE     = 10;   // 기본 접촉 데미지
  const CONTACT_COOLDOWN = 1.2;

  const MODULE_DROP_CHANCE          = 0.15;
  const MAX_MODULE_DROPS            = 50;
  const MODULE_DROP_COLLECT_RADIUS  = 40;  // 수집 반지름(px)
  const MODULE_DROP_LIFETIME        = 30;  // 아이템 유효 시간(s)

  const SPAWN_PER_WAVE = 6;   // 웨이브당 기본 스폰 수
  const SPAWN_MARGIN   = 60;

  const REST_DURATION  = 6;   // 웨이브 사이 휴식 시간(s)
  const KILL_BASE      = 8;   // Wave 1 킬 목표
  const KILL_PER_WAVE  = 4;   // 웨이브당 킬 목표 증가량

  // ── XP Gem 풀
  const MAX_GEMS = 500;

  // ── 10종 적 타입 정의
  // behavior: 'chase' | 'zigzag' | 'dash' | 'splitter'
  const ENEMY_TYPES = {
    RAIDER:     { radiusMult: 1.0,  hpMult:  1,   speedMult: 1.0,  damageMult: 1.0, xpMult: 1.0, weight: 6, behavior: 'chase'    },
    JUGGERNAUT: { radiusMult: 2.2,  hpMult: 10,   speedMult: 0.35, damageMult: 2.5, xpMult: 5.0, weight: 2, behavior: 'chase'    },
    SWARM:      { radiusMult: 0.55, hpMult:  0.4, speedMult: 1.9,  damageMult: 0.5, xpMult: 0.5, weight: 8, behavior: 'chase'    },
    LANCER:     { radiusMult: 0.75, hpMult:  0.8, speedMult: 1.6,  damageMult: 1.3, xpMult: 1.5, weight: 5, behavior: 'chase'    },
    ANCHOR:     { radiusMult: 2.8,  hpMult: 18,   speedMult: 0.18, damageMult: 5.0, xpMult: 8.0, weight: 1, behavior: 'chase'    },
    ZIGZAGGER:  { radiusMult: 1.0,  hpMult:  1.2, speedMult: 1.2,  damageMult: 1.0, xpMult: 1.5, weight: 4, behavior: 'zigzag'   },
    DASHER:     { radiusMult: 0.9,  hpMult:  1.5, speedMult: 0.6,  damageMult: 1.8, xpMult: 2.0, weight: 3, behavior: 'dash'     },
    SHADE:      { radiusMult: 1.0,  hpMult:  1.8, speedMult: 0.85, damageMult: 1.5, xpMult: 2.0, weight: 3, behavior: 'chase'    },
    BOMBER:     { radiusMult: 1.6,  hpMult:  2.0, speedMult: 0.65, damageMult: 4.0, xpMult: 3.0, weight: 2, behavior: 'chase'    },
    SPLITTER:   { radiusMult: 1.8,  hpMult:  3.5, speedMult: 0.55, damageMult: 1.5, xpMult: 3.0, weight: 2, behavior: 'splitter' },
  };

  // 가중치 기반 랜덤 타입 선택 사전계산
  const TYPE_KEYS    = Object.keys(ENEMY_TYPES);
  const TOTAL_WEIGHT = TYPE_KEYS.reduce((s, k) => s + ENEMY_TYPES[k].weight, 0);

  function _randomType() {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const k of TYPE_KEYS) {
      r -= ENEMY_TYPES[k].weight;
      if (r <= 0) return k;
    }
    return TYPE_KEYS[0];
  }

  // ── 풀 배열
  const enemies     = [];
  const gems        = [];
  const moduleDrops = [];

  // ── 게임 상태
  let worldW, worldH;
  let _zoom          = 1.0;  // Game.js에서 setZoom()으로 갱신
  let waveNumber     = 1;
  let totalKills     = 0;
  let waveKills      = 0;
  let waveKillTarget = KILL_BASE;
  let isResting      = false;
  let restTimer      = 0;
  let spawnPending   = 0;
  let spawnTimer     = 0;

  // ── 플레이어 참조 (SPLITTER 스폰용, update에서 갱신)
  let _player = null;

  /** Enemy 오브젝트 팩토리 */
  function createEnemy() {
    return {
      active: false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      angle: 0,
      hp: 0, maxHp: 0,
      speed: 0,
      radius: 0,
      contactCooldown: 0,
      xpValue: 0,
      type: 'RAIDER',
      isSplit: false,        // SPLITTER 분열체 여부 (무한 분열 방지)
      // ZIGZAGGER용
      zigzagPhase: 0,
      // DASHER용
      dashTimer: 0,
      dashCooldown: 0,
      // SHADE용 (시각 효과)
      shadeAlpha: 1.0,
    };
  }

  /** ModuleDrop 오브젝트 팩토리 */
  function createModuleDrop() {
    return { active: false, x: 0, y: 0, moduleType: '', lifetime: 0 };
  }

  /** XP Gem 오브젝트 팩토리 */
  function createGem() {
    return {
      active: false,
      x: 0, y: 0,
      value: 0,
      collectRadius: 200,
      speed: 320,
    };
  }

  /** 초기화 */
  function init(ww, wh) {
    worldW = ww;
    worldH = wh;
    for (let i = 0; i < MAX_ENEMIES; i++)      enemies.push(createEnemy());
    for (let i = 0; i < MAX_GEMS; i++)          gems.push(createGem());
    for (let i = 0; i < MAX_MODULE_DROPS; i++)  moduleDrops.push(createModuleDrop());
    waveKills      = 0;
    waveKillTarget = KILL_BASE;
    isResting      = false;
    restTimer      = 0;
    spawnPending   = waveKillTarget;  // Wave 1: 킬 목표(8)만큼 스폰
  }

  /** 풀에서 비활성 enemy 꺼내기 */
  function acquireEnemy() {
    for (const e of enemies) { if (!e.active) return e; }
    return null;
  }

  /** 풀에서 비활성 gem 꺼내기 */
  function acquireGem() {
    for (const g of gems) { if (!g.active) return g; }
    return null;
  }

  /** 풀에서 비활성 moduleDrop 꺼내기 */
  function acquireModuleDrop() {
    for (const d of moduleDrops) { if (!d.active) return d; }
    return null;
  }

  /** 현재 줌 설정 (Game.js 루프에서 매 프레임 호출) */
  function setZoom(z) { _zoom = z; }

  /** 화면 가장자리 + SPAWN_MARGIN 바깥 랜덤 위치 반환 */
  function getSpawnPos(player) {
    const W = Renderer.getWidth();
    const H = Renderer.getHeight();
    const side = Math.floor(Math.random() * 4);
    let sx, sy;
    if (side === 0) { sx = Math.random() * W; sy = -SPAWN_MARGIN; }
    else if (side === 1) { sx = Math.random() * W; sy = H + SPAWN_MARGIN; }
    else if (side === 2) { sx = -SPAWN_MARGIN; sy = Math.random() * H; }
    else                  { sx = W + SPAWN_MARGIN; sy = Math.random() * H; }

    // 줌을 역산해 월드 오프셋 계산 — 줌 아웃 시에도 시야 바깥에 스폰
    let wx = player.x + (sx - player.screenX) / _zoom;
    let wy = player.y + (sy - player.screenY) / _zoom;
    wx = ((wx % worldW) + worldW) % worldW;
    wy = ((wy % worldH) + worldH) % worldH;
    return { wx, wy };
  }

  /** 웨이브 배율 */
  function waveScale() {
    return 1 + (waveNumber - 1) * 0.18;
  }

  /** 공통 적 초기화 (스폰·분열 공용) */
  function _initEnemy(e, wx, wy, typeKey, scale, isSplit) {
    const def = ENEMY_TYPES[typeKey];
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
    e.zigzagPhase = 0;
    e.dashTimer   = 0;
    e.dashCooldown = 1.0 + Math.random() * 0.8;
    e.shadeAlpha  = 1.0;
  }

  /** 웨이브 스폰 */
  function spawnOne(player) {
    const e = acquireEnemy();
    if (!e) return;
    const pos = getSpawnPos(player);
    _initEnemy(e, pos.wx, pos.wy, _randomType(), waveScale(), false);
  }

  /** 특정 위치에 적 스폰 (SPLITTER 분열 시 사용) */
  function _spawnAt(wx, wy, typeKey) {
    const e = acquireEnemy();
    if (!e) return;
    _initEnemy(e, wx + (Math.random() - 0.5) * 50, wy + (Math.random() - 0.5) * 50,
               typeKey, waveScale(), true);
  }

  /**
   * 적 간 분리 패스 — 활성 적 O(n²) 원 충돌 처리
   * 겹친 두 적을 서로 반대 방향으로 밀어내 포개짐을 방지한다.
   */
  function _separateEnemies() {
    // 활성 적 목록 수집 (풀 전체 순회 대신 활성만)
    const active = [];
    for (const e of enemies) { if (e.active) active.push(e); }

    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        const { dx, dy } = Collision.wrappedDelta(a.x, a.y, b.x, b.y, worldW, worldH);
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist > 0 && dist < minDist) {
          // 겹침량의 절반씩 반대 방향으로 이동
          const push = (minDist - dist) * 0.5;
          const nx = dx / dist, ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          a.x = ((a.x % worldW) + worldW) % worldW;
          a.y = ((a.y % worldH) + worldH) % worldH;
          b.x = ((b.x % worldW) + worldW) % worldW;
          b.y = ((b.y % worldH) + worldH) % worldH;
        }
      }
    }
  }

  /**
   * 매 프레임 업데이트
   * @returns {{ levelUp: boolean }}
   */
  function update(dt, player) {
    _player = player;
    let didLevelUp = false;

    // ── 웨이브 킬 목표 시스템
    if (isResting) {
      restTimer -= dt;
      if (restTimer <= 0) {
        isResting = false;
        waveNumber++;
        waveKills      = 0;
        waveKillTarget = KILL_BASE + (waveNumber - 1) * KILL_PER_WAVE;
        spawnPending   = waveKillTarget;  // 다음 웨이브 킬 목표만큼 스폰
      }
    } else {
      if (waveKills >= waveKillTarget) {
        isResting = true;
        restTimer = REST_DURATION;
        // 현재 활성 적 모두 제거
        for (const e of enemies) e.active = false;
      } else {
        // 안전망: 대기 스폰이 없는데 활성 적이 남은 킬보다 적으면 보충
        if (spawnPending === 0) {
          let activeCount = 0;
          for (const e of enemies) { if (e.active) activeCount++; }
          const remaining = waveKillTarget - waveKills;
          if (activeCount < remaining) {
            spawnPending = remaining - activeCount;
          }
        }
      }
    }

    // ── 스폰 (0.15s 간격)
    if (spawnPending > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = 0.15;
        spawnOne(player);
        spawnPending--;
      }
    }

    // ── 적 이동·충돌
    const now = Date.now();
    for (const e of enemies) {
      if (!e.active) continue;

      const { dx, dy } = Collision.wrappedDelta(e.x, e.y, player.x, player.y, worldW, worldH);
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        e.angle = Math.atan2(dy, dx);
        const behavior = ENEMY_TYPES[e.type]?.behavior ?? 'chase';

        if (behavior === 'zigzag') {
          // 사인 파형 횡방향 이동
          e.zigzagPhase += dt * 3.5;
          const perpX = -dy / dist, perpY = dx / dist;
          const sideOff = Math.sin(e.zigzagPhase) * 60;
          e.vx = (dx / dist) * e.speed + perpX * sideOff;
          e.vy = (dy / dist) * e.speed + perpY * sideOff;

        } else if (behavior === 'dash') {
          // 주기적 돌진
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
          // 기본: 플레이어 방향으로 직선 추적
          e.vx = (dx / dist) * e.speed;
          e.vy = (dy / dist) * e.speed;
        }

        // SHADE: 알파 펄스 (시각 효과용)
        if (e.type === 'SHADE') {
          e.shadeAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(now * 0.002 + e.x * 0.01));
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.x = ((e.x % worldW) + worldW) % worldW;
      e.y = ((e.y % worldH) + worldH) % worldH;

      if (e.contactCooldown > 0) e.contactCooldown -= dt;

      // ── 플레이어 접촉 데미지 (선체 다각형 히트박스 사용)
      if (e.contactCooldown <= 0) {
        const hitPolys = player.getHitPolygons();
        let hit = false;
        for (const poly of hitPolys) {
          if (Collision.polyCircleWrapped(poly, e.x, e.y, e.radius, worldW, worldH)) {
            hit = true;
            break;
          }
        }
        if (hit) {
          const dmg = Math.floor(ENEMY_DAMAGE * (ENEMY_TYPES[e.type]?.damageMult ?? 1));
          player.takeDamage(dmg);
          e.contactCooldown = CONTACT_COOLDOWN;
          // 플레이어 중심에서 적 방향으로 밀어내기 (포개짐 방지)
          const { dx: pdx, dy: pdy } = Collision.wrappedDelta(player.x, player.y, e.x, e.y, worldW, worldH);
          const pd = Math.hypot(pdx, pdy);
          if (pd > 0) {
            const pushTo = player.radius + e.radius + 4;
            e.x = player.x + (pdx / pd) * pushTo;
            e.y = player.y + (pdy / pd) * pushTo;
            e.x = ((e.x % worldW) + worldW) % worldW;
            e.y = ((e.y % worldH) + worldH) % worldH;
          }
        }
      }
    }

    // ── 적 간 분리 (포개짐 방지) — 활성 적끼리 원 충돌 후 밀어내기
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
          if (player.gainXp(g.value)) {
            didLevelUp = true;
          }
        }
      }
    }

    // ── ModuleDrop 수집
    for (const d of moduleDrops) {
      if (!d.active) continue;
      d.lifetime -= dt;
      if (d.lifetime <= 0) { d.active = false; continue; }
      const { dx: ddx, dy: ddy } = Collision.wrappedDelta(d.x, d.y, player.x, player.y, worldW, worldH);
      // 수집 반지름 = 기체 hitboxRadius + 여유 10px (기체 크기에 맞게 자동 확장)
      const collectR = Math.max(MODULE_DROP_COLLECT_RADIUS, player.hitboxRadius + 10);
      if (Math.hypot(ddx, ddy) < collectR) {
        d.active = false;
        TetrisGrid.queueModule(d.moduleType);
      }
    }

    return { levelUp: didLevelUp };
  }

  /**
   * 적 HP 감소 (WeaponSystem에서 호출)
   * @returns {boolean} 적이 파괴됐는지
   */
  function damageEnemy(enemy, dmg) {
    enemy.hp -= dmg;
    if (enemy.hp <= 0) {
      enemy.active = false;
      totalKills++;
      waveKills++;

      // XP Gem 드랍
      const gem = acquireGem();
      if (gem) {
        gem.active = true;
        gem.x      = enemy.x;
        gem.y      = enemy.y;
        gem.value  = enemy.xpValue;
      }

      // 모듈 드랍 (15% 확률) — 맵에 물리적으로 드랍
      if (Math.random() < MODULE_DROP_CHANCE) {
        const drop = acquireModuleDrop();
        if (drop) {
          drop.active     = true;
          drop.x          = enemy.x;
          drop.y          = enemy.y;
          drop.moduleType = TetrisGrid.randomModuleKey();
          drop.lifetime   = MODULE_DROP_LIFETIME;
        }
      }

      // SPLITTER: 분열체이면 SWARM 3마리 스폰
      if (enemy.type === 'SPLITTER' && !enemy.isSplit) {
        for (let i = 0; i < 3; i++) _spawnAt(enemy.x, enemy.y, 'SWARM');
      }

      return true;
    }
    return false;
  }

  /** 전체 렌더링 */
  function draw(player) {
    const W = Renderer.getWidth(), H = Renderer.getHeight();

    // 적
    for (const e of enemies) {
      if (!e.active) continue;
      const { sx, sy } = player.worldToScreen(e.x, e.y, worldW, worldH);
      if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;
      Renderer.drawEnemy(sx, sy, e.angle, e.radius, e.hp / e.maxHp, e.type, e.shadeAlpha);
    }

    // XP 젬
    for (const g of gems) {
      if (!g.active) continue;
      const { sx, sy } = player.worldToScreen(g.x, g.y, worldW, worldH);
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      Renderer.drawXpGem(sx, sy);
    }

    // 모듈 드랍 아이템
    for (const d of moduleDrops) {
      if (!d.active) continue;
      const { sx, sy } = player.worldToScreen(d.x, d.y, worldW, worldH);
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      Renderer.drawModuleDrop(sx, sy, d.moduleType);
    }
  }

  /** 활성 적 배열 반환 (WeaponSystem 타겟팅용) */
  function getActiveEnemies() { return enemies.filter(e => e.active); }

  /** 통계 */
  function getStats() {
    return { waveNumber, totalKills, waveKills, waveKillTarget, restTimer, isResting };
  }

  /** 리셋 */
  function reset(ww, wh) {
    worldW = ww; worldH = wh;
    for (const e of enemies)     e.active = false;
    for (const g of gems)        g.active = false;
    for (const d of moduleDrops) d.active = false;
    waveNumber     = 1;
    totalKills     = 0;
    waveKills      = 0;
    waveKillTarget = KILL_BASE;
    isResting      = false;
    restTimer      = 0;
    spawnPending   = SPAWN_PER_WAVE;
    spawnTimer     = 0;
  }

  return { init, update, draw, damageEnemy, getActiveEnemies, getStats, reset, setZoom };
})();

window.EnemyManager = EnemyManager;
