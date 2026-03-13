/**
 * EnemyManager.js — 적 오브젝트 풀 & 웨이브 스폰 관리
 *
 * Phase 2: Object Pooling으로 최대 MAX_ENEMIES 개의 적을 관리.
 * 적 AI: 플레이어 방향으로 이동 (Wraparound 최단 경로).
 * XP Gem: 적 파괴 시 드랍.
 */

const EnemyManager = (() => {

  // ── 상수
  const MAX_ENEMIES  = 300;  // 풀 크기
  const ENEMY_RADIUS = 14;   // 적 충돌 반지름
  const ENEMY_SPEED_BASE  = 80;  // 기본 이동속도 (px/s)
  const ENEMY_HP_BASE     = 3;   // 기본 HP
  const ENEMY_DAMAGE      = 10;  // 플레이어 접촉 데미지
  const CONTACT_COOLDOWN  = 1.2; // 같은 적에게 재피격 쿨다운 (s)

  const WAVE_INTERVAL    = 15;  // 웨이브 간격 (s)
  const SPAWN_PER_WAVE   = 12;  // 웨이브당 기본 스폰 수
  const SPAWN_MARGIN     = 60;  // 화면 밖 스폰 여유 (px)

  // ── XP Gem 풀
  const MAX_GEMS = 500;

  // ── 풀 배열
  const enemies = [];
  const gems    = [];

  // ── 게임 상태 참조
  let worldW, worldH;
  let waveTimer    = 0;
  let waveNumber   = 1;
  let totalKills   = 0;
  let spawnPending = 0; // 남은 스폰 대기 수
  let spawnTimer   = 0; // 개별 스폰 간격 타이머

  /** Enemy 오브젝트 팩토리 (풀 초기화용) */
  function createEnemy() {
    return {
      active: false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      angle: 0,
      hp: ENEMY_HP_BASE,
      maxHp: ENEMY_HP_BASE,
      speed: ENEMY_SPEED_BASE,
      radius: ENEMY_RADIUS,
      contactCooldown: 0,
      xpValue: 20,
    };
  }

  /** XP Gem 오브젝트 팩토리 */
  function createGem() {
    return {
      active: false,
      x: 0, y: 0,
      value: 0,
      collectRadius: 120, // 이 거리 안에 들어오면 자동 흡수
      speed: 200,         // 흡수 이동속도 (px/s)
    };
  }

  /** 초기화 */
  function init(ww, wh) {
    worldW = ww;
    worldH = wh;
    for (let i = 0; i < MAX_ENEMIES; i++) enemies.push(createEnemy());
    for (let i = 0; i < MAX_GEMS; i++)    gems.push(createGem());
    waveTimer = WAVE_INTERVAL * 0.5; // 첫 웨이브를 약간 빨리
  }

  /** 풀에서 비활성 enemy 하나 꺼내기 */
  function acquireEnemy() {
    for (const e of enemies) {
      if (!e.active) return e;
    }
    return null; // 풀 소진 시 null
  }

  /** 풀에서 비활성 gem 하나 꺼내기 */
  function acquireGem() {
    for (const g of gems) {
      if (!g.active) return g;
    }
    return null;
  }

  /**
   * 화면 가장자리 + SPAWN_MARGIN 바깥 랜덤 위치 반환
   * (플레이어 기준 화면 크기 참고)
   */
  function getSpawnPos(player) {
    const W = Renderer.getWidth();
    const H = Renderer.getHeight();
    const side = Math.floor(Math.random() * 4); // 0=상, 1=하, 2=좌, 3=우
    let sx, sy;
    if (side === 0) { sx = Math.random() * W; sy = -SPAWN_MARGIN; }
    else if (side === 1) { sx = Math.random() * W; sy = H + SPAWN_MARGIN; }
    else if (side === 2) { sx = -SPAWN_MARGIN; sy = Math.random() * H; }
    else                  { sx = W + SPAWN_MARGIN; sy = Math.random() * H; }

    // 화면 좌표 → 월드 좌표 (플레이어 중심)
    let wx = player.x + (sx - player.screenX);
    let wy = player.y + (sy - player.screenY);
    wx = ((wx % worldW) + worldW) % worldW;
    wy = ((wy % worldH) + worldH) % worldH;
    return { wx, wy };
  }

  /** 웨이브에 따른 적 스탯 스케일링 */
  function waveScale() {
    return 1 + (waveNumber - 1) * 0.18; // 웨이브마다 18% 강화
  }

  /** 적 한 마리 스폰 */
  function spawnOne(player) {
    const e = acquireEnemy();
    if (!e) return;
    const pos = getSpawnPos(player);
    const scale = waveScale();
    e.active   = true;
    e.x        = pos.wx;
    e.y        = pos.wy;
    e.vx       = 0;
    e.vy       = 0;
    e.hp       = Math.ceil(ENEMY_HP_BASE * scale);
    e.maxHp    = e.hp;
    e.speed    = ENEMY_SPEED_BASE * (0.9 + Math.random() * 0.3) * Math.sqrt(scale);
    e.radius   = ENEMY_RADIUS;
    e.contactCooldown = 0;
    e.xpValue  = Math.floor(20 * scale);
  }

  /**
   * 매 프레임 업데이트
   * @param {number} dt - 델타타임
   * @param {Player} player - 플레이어 참조
   * @returns {{levelUp: boolean}} 레벨업 발생 여부
   */
  function update(dt, player) {
    let didLevelUp = false;

    // ── 웨이브 타이머
    waveTimer -= dt;
    if (waveTimer <= 0) {
      waveTimer = WAVE_INTERVAL;
      waveNumber++;
      spawnPending += SPAWN_PER_WAVE + (waveNumber - 1) * 4;
    }

    // ── 스폰 간격 (0.15s 마다 1마리)
    if (spawnPending > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = 0.15;
        spawnOne(player);
        spawnPending--;
      }
    }

    // ── 적 이동·충돌
    for (const e of enemies) {
      if (!e.active) continue;

      // 플레이어 방향으로 이동 (Wraparound 최단 경로)
      const { dx, dy } = Collision.wrappedDelta(e.x, e.y, player.x, player.y, worldW, worldH);
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
        e.angle = Math.atan2(dy, dx);
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // 랩어라운드
      e.x = ((e.x % worldW) + worldW) % worldW;
      e.y = ((e.y % worldH) + worldH) % worldH;

      // 접촉 쿨다운
      if (e.contactCooldown > 0) e.contactCooldown -= dt;

      // 플레이어 접촉 데미지
      if (e.contactCooldown <= 0) {
        const hit = Collision.circleCircleWrapped(
          e.x, e.y, e.radius,
          player.x, player.y, player.hitboxRadius,
          worldW, worldH
        );
        if (hit) {
          player.takeDamage(ENEMY_DAMAGE);
          e.contactCooldown = CONTACT_COOLDOWN;
        }
      }
    }

    // ── XP Gem 흡수
    for (const g of gems) {
      if (!g.active) continue;
      const { dx, dy } = Collision.wrappedDelta(g.x, g.y, player.x, player.y, worldW, worldH);
      const dist = Math.hypot(dx, dy);
      if (dist < g.collectRadius) {
        // 플레이어 방향으로 이동 (흡수 연출)
        if (dist > 6) {
          g.x += (dx / dist) * g.speed * dt;
          g.y += (dy / dist) * g.speed * dt;
          g.x = ((g.x % worldW) + worldW) % worldW;
          g.y = ((g.y % worldH) + worldH) % worldH;
        } else {
          // 흡수 완료
          g.active = false;
          if (player.gainXp(g.value)) {
            didLevelUp = true;
          }
        }
      }
    }

    return { levelUp: didLevelUp };
  }

  /**
   * 적 HP 감소 (WeaponSystem에서 호출)
   * @param {object} enemy - 적 엔티티
   * @param {number} dmg - 데미지
   * @returns {boolean} 적이 파괴됐는지 여부
   */
  function damageEnemy(enemy, dmg) {
    enemy.hp -= dmg;
    if (enemy.hp <= 0) {
      enemy.active = false;
      totalKills++;
      // XP Gem 드랍
      const gem = acquireGem();
      if (gem) {
        gem.active = true;
        gem.x      = enemy.x;
        gem.y      = enemy.y;
        gem.value  = enemy.xpValue;
      }
      return true;
    }
    return false;
  }

  /** 전체 렌더링 */
  function draw(player) {
    // 적
    for (const e of enemies) {
      if (!e.active) continue;
      const { sx, sy } = player.worldToScreen(e.x, e.y, worldW, worldH);
      // 화면 바깥이면 그리지 않음 (frustum culling)
      const W = Renderer.getWidth(), H = Renderer.getHeight();
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
      Renderer.drawEnemy(sx, sy, e.angle, e.radius, e.hp / e.maxHp);
    }
    // XP 젬
    for (const g of gems) {
      if (!g.active) continue;
      const { sx, sy } = player.worldToScreen(g.x, g.y, worldW, worldH);
      const W = Renderer.getWidth(), H = Renderer.getHeight();
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      Renderer.drawXpGem(sx, sy);
    }
  }

  /** 활성 적 배열 반환 (WeaponSystem 타겟팅용) */
  function getActiveEnemies() { return enemies.filter(e => e.active); }

  /** 통계 */
  function getStats() { return { waveNumber, totalKills }; }

  /** 리셋 */
  function reset(ww, wh) {
    worldW = ww; worldH = wh;
    for (const e of enemies) e.active = false;
    for (const g of gems)    g.active = false;
    waveTimer    = WAVE_INTERVAL * 0.5;
    waveNumber   = 1;
    totalKills   = 0;
    spawnPending = 0;
    spawnTimer   = 0;
  }

  return { init, update, draw, damageEnemy, getActiveEnemies, getStats, reset };
})();

window.EnemyManager = EnemyManager;
