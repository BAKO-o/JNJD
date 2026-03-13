/**
 * WeaponSystem.js — 무기 자동 발사 & 투사체 풀 관리
 *
 * Phase 2: 사거리 내 최근접 적을 자동 타겟팅하여 투사체를 발사.
 * Object Pooling으로 최대 MAX_PROJECTILES 개 관리.
 * Phase 4 확장: 속성(FIRE/LASER/ELECTRIC 등) 추가 예정.
 */

const WeaponSystem = (() => {

  // ── 상수
  const MAX_PROJECTILES = 500;
  const PROJ_RADIUS     = 5;
  const PROJ_SPEED      = 420;   // 투사체 속도 (px/s)
  const PROJ_LIFETIME   = 2.2;   // 투사체 최대 생존 시간 (s)
  const PROJ_DAMAGE     = 1;     // 기본 데미지

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
  let fireTimer = 0; // 다음 발사까지 남은 시간

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
   * 투사체 발사
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
  }

  /**
   * 매 프레임 업데이트
   * @param {number} dt
   * @param {object} player
   * @param {Array}  activeEnemies - EnemyManager.getActiveEnemies()
   */
  function update(dt, player, activeEnemies) {
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

      // 적 충돌 체크
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

  /** 전체 렌더링 */
  function draw(player) {
    for (const p of projectiles) {
      if (!p.active) continue;
      const { sx, sy } = player.worldToScreen(p.x, p.y, worldW, worldH);
      const W = Renderer.getWidth(), H = Renderer.getHeight();
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      Renderer.drawProjectile(sx, sy, p.radius, p.color);
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
    fireTimer = 0;
    Object.assign(weapon, DEFAULT_WEAPON);
  }

  /** 현재 무기 스탯 읽기 (Game.js 업그레이드 계산용) */
  function getWeaponStat(key) { return weapon[key]; }

  return { init, update, draw, upgradeWeapon, getWeaponStat, reset };
})();

window.WeaponSystem = WeaponSystem;
