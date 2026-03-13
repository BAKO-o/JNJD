/**
 * WeaponSystem.js — 무기 자동 발사 & 투사체 풀 관리
 *
 * Phase 2: 사거리 내 최근접 적을 자동 타겟팅하여 투사체를 발사.
 * Object Pooling으로 최대 MAX_PROJECTILES 개 관리.
 * Phase 4 확장: 속성(FIRE/LASER/ELECTRIC 등) 추가 예정.
 */

const WeaponSystem = (() => {

  // ── 상수 (자동 무기)
  const MAX_PROJECTILES = 500;
  const PROJ_RADIUS     = 5;
  const PROJ_SPEED      = 420;   // 투사체 속도 (px/s)
  const PROJ_LIFETIME   = 2.2;   // 투사체 최대 생존 시간 (s)
  const PROJ_DAMAGE     = 1;     // 기본 데미지

  // ── 상수 (수동 포탄)
  const CANNON_RADIUS   = 14;    // 포탄 반지름 (px)
  const CANNON_SPEED    = 260;   // 포탄 속도 (px/s)
  const CANNON_DAMAGE   = 5;     // 포탄 직격 데미지
  const CANNON_SPLASH_R = 65;    // 범위폭발 반지름 (px)
  const CANNON_LIFETIME = 2.8;   // 포탄 최대 생존 시간 (s)
  const CANNON_COOLDOWN = 1.5;   // 포탄 재사용 대기 (s)

  // 기본 무기 스탯
  const DEFAULT_WEAPON = {
    cooldown: 0.72,    // 발사 쿨다운 (s)
    range:    350,     // 사거리 (px)
    damage:   PROJ_DAMAGE,
    projColor: '#fde68a',
  };

  // ── 풀 배열
  const projectiles = [];

  // ── 상태
  let worldW, worldH;
  let fireTimer   = 0; // 자동무기 다음 발사까지 남은 시간
  let cannonTimer = 0; // 포탄 재사용 대기 시간

  // ── 플레이어 무기 슬롯 (Phase 4 확장용)
  // 현재는 단일 기본 무기만 사용
  const weapon = { ...DEFAULT_WEAPON };

  /** Projectile 오브젝트 팩토리 */
  function createProjectile() {
    return {
      active:   false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      radius:   PROJ_RADIUS,
      damage:   0,
      lifetime: 0,
      color:    '#fde68a',
      type:     'auto',   // 'auto' | 'cannon'
      splashR:  0,        // 포탄 스플래시 반지름 (auto는 0)
    };
  }

  /** 초기화 */
  function init(ww, wh) {
    worldW = ww;
    worldH = wh;
    for (let i = 0; i < MAX_PROJECTILES; i++) projectiles.push(createProjectile());
    fireTimer = 0;
  }

  /** 풀에서 비활성 투사체 꺼내기 */
  function acquireProjectile() {
    for (const p of projectiles) {
      if (!p.active) return p;
    }
    return null; // 풀 소진
  }

  /**
   * 사거리 내 최근접 활성 적 탐색
   * @param {object} player
   * @param {Array} activeEnemies
   * @returns {object|null}
   */
  function findNearestEnemy(player, activeEnemies) {
    let nearest  = null;
    let minDistSq = weapon.range * weapon.range;

    for (const e of activeEnemies) {
      const distSq = Collision.wrappedDistSq(player.x, player.y, e.x, e.y, worldW, worldH);
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest   = e;
      }
    }
    return nearest;
  }

  /**
   * 포탄 발사 (마우스 클릭 시 — 함선 방향으로 범위공격)
   * @param {object} player
   */
  function fireCannon(player) {
    const p = acquireProjectile();
    if (!p) return;

    p.active   = true;
    p.x        = player.x;
    p.y        = player.y;
    p.vx       = Math.cos(player.angle) * CANNON_SPEED;
    p.vy       = Math.sin(player.angle) * CANNON_SPEED;
    p.radius   = CANNON_RADIUS;
    p.damage   = CANNON_DAMAGE * player.damageMult;
    p.lifetime = CANNON_LIFETIME;
    p.color    = '#fb923c';
    p.type     = 'cannon';
    p.splashR  = CANNON_SPLASH_R;
  }

  /**
   * 자동무기 투사체 발사
   * @param {object} player
   * @param {object} target - 타겟 적
   */
  function fire(player, target) {
    const p = acquireProjectile();
    if (!p) return;

    const { dx, dy } = Collision.wrappedDelta(player.x, player.y, target.x, target.y, worldW, worldH);
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    p.active   = true;
    p.x        = player.x;
    p.y        = player.y;
    p.vx       = (dx / dist) * PROJ_SPEED;
    p.vy       = (dy / dist) * PROJ_SPEED;
    p.radius   = PROJ_RADIUS;
    p.damage   = weapon.damage * player.damageMult;
    p.lifetime = PROJ_LIFETIME;
    p.color    = weapon.projColor;
    p.type     = 'auto';
    p.splashR  = 0;
  }

  /**
   * 매 프레임 업데이트
   * @param {number} dt
   * @param {object} player
   * @param {Array}  activeEnemies - EnemyManager.getActiveEnemies()
   * @param {boolean} clicked - 이번 프레임 마우스 클릭 여부 (포탄 발사 트리거)
   */
  function update(dt, player, activeEnemies, clicked) {
    // ── 수동 포탄 발사 (마우스 클릭)
    if (cannonTimer > 0) cannonTimer -= dt;
    if (clicked && cannonTimer <= 0) {
      fireCannon(player);
      cannonTimer = CANNON_COOLDOWN;
    }

    // ── 자동 발사
    fireTimer -= dt;
    if (fireTimer <= 0) {
      const target = findNearestEnemy(player, activeEnemies);
      if (target) {
        fire(player, target);
        fireTimer = weapon.cooldown;
      } else {
        fireTimer = 0.05; // 타겟 없을 때 빠른 재탐색
      }
    }

    // ── 투사체 이동 & 충돌
    for (const p of projectiles) {
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.x = ((p.x % worldW) + worldW) % worldW;
      p.y = ((p.y % worldH) + worldH) % worldH;
      p.lifetime -= dt;

      if (p.lifetime <= 0) {
        p.active = false;
        continue;
      }

      if (p.type === 'cannon') {
        // 포탄: 범위 내 모든 적에게 스플래시 데미지 후 소멸
        let hit = false;
        for (const e of activeEnemies) {
          if (!e.active) continue;
          if (Collision.circleCircleWrapped(
            p.x, p.y, p.splashR,
            e.x, e.y, e.radius,
            worldW, worldH
          )) {
            EnemyManager.damageEnemy(e, p.damage);
            hit = true;
          }
        }
        if (hit) { p.active = false; }
      } else {
        // 자동무기: 첫 번째 충돌 적 피격 후 소멸
        for (const e of activeEnemies) {
          if (!e.active) continue;
          const hit = Collision.circleCircleWrapped(
            p.x, p.y, p.radius,
            e.x, e.y, e.radius,
            worldW, worldH
          );
          if (hit) {
            p.active = false;
            EnemyManager.damageEnemy(e, p.damage);
            break;
          }
        }
      }
    }
  }

  /** 전체 렌더링 */
  function draw(player) {
    for (const p of projectiles) {
      if (!p.active) continue;
      const { sx, sy } = player.worldToScreen(p.x, p.y, worldW, worldH);
      const W = Renderer.getWidth(), H = Renderer.getHeight();
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
      if (p.type === 'cannon') {
        Renderer.drawCannonball(sx, sy, p.radius);
      } else {
        Renderer.drawProjectile(sx, sy, p.radius, p.color);
      }
    }
  }

  /** 무기 업그레이드 (Phase 4 에서 확장) */
  function upgradeWeapon(key, value) {
    if (key in weapon) weapon[key] = value;
  }

  /** 리셋 */
  function reset(ww, wh) {
    worldW = ww; worldH = wh;
    for (const p of projectiles) p.active = false;
    fireTimer   = 0;
    cannonTimer = 0;
    Object.assign(weapon, DEFAULT_WEAPON);
  }

  /** 현재 무기 스탯 읽기 (Game.js 업그레이드 계산용) */
  function getWeaponStat(key) { return weapon[key]; }

  return { init, update, draw, upgradeWeapon, getWeaponStat, reset };
})();

window.WeaponSystem = WeaponSystem;
