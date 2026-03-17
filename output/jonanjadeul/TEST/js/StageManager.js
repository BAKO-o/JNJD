/**
 * StageManager.js — 스테이지 시스템
 *
 * 5개 스테이지, 각각 고유한 환경/위험 요소를 가짐.
 * 보스 처치 = 스테이지 클리어.
 * 스테이지 클리어 시 스크랩 80 + 모듈 2개 드랍.
 * 플레이어는 모듈/무기/업그레이드를 그대로 유지한 채 다음 스테이지로 진행.
 *
 * 스테이지 목록:
 *   1: 잔해 지대     — 위험 없음 (NONE)
 *   2: 소행성대      — METEORS: 유성이 화면을 가로지름 (접촉 시 5 데미지)
 *   3: 극저온 성운   — CRYO: 쿨다운 ×1.3
 *   4: 항성 코로나   — HEAT: 0.5 HP/s 지속 데미지
 *   5: 방사성 구름   — RADIATION: 장갑 효율 ×0.7
 */

'use strict';

const StageManager = (() => {

  // ── 스테이지 정의
  const STAGE_DEFS = [
    { id: 1, name: '잔해 지대',   nameFull: 'Stage 1 — 잔해 지대',   hazard: 'NONE',      bgTint: null,       desc: '위험 환경 없음. 함선을 정비하고 전투를 준비하라.' },
    { id: 2, name: '소행성대',    nameFull: 'Stage 2 — 소행성대',    hazard: 'METEORS',   bgTint: '#2a1a00',  desc: '유성이 끊임없이 날아온다. 접촉 시 데미지를 입는다.' },
    { id: 3, name: '극저온 성운', nameFull: 'Stage 3 — 극저온 성운', hazard: 'CRYO',      bgTint: '#001a2a',  desc: '극한의 냉기가 무기 쿨다운을 늦춘다. (쿨다운 ×1.3)' },
    { id: 4, name: '항성 코로나', nameFull: 'Stage 4 — 항성 코로나', hazard: 'HEAT',      bgTint: '#2a0500',  desc: '태양풍이 지속적으로 함선을 손상시킨다. (0.5 HP/s)' },
    { id: 5, name: '방사성 구름', nameFull: 'Stage 5 — 방사성 구름', hazard: 'RADIATION', bgTint: '#0a1a00',  desc: '방사선이 장갑 효율을 약화시킨다. (장갑 ×0.7)' },
  ];

  // ── 소행성 크기 정의
  const METEOR_SIZES = {
    SMALL:  { radiusMin: 7,  radiusMax: 11, hp: 1, damage: 3  },
    MEDIUM: { radiusMin: 13, radiusMax: 18, hp: 1, damage: 6  },
    LARGE:  { radiusMin: 22, radiusMax: 30, hp: 1, damage: 10 },
  };

  // ── 현재 스테이지 상태
  let _stageIndex       = 0;   // 0-based (0 = Stage 1)
  let _cleared          = false;
  let _meteors          = [];
  let _meteorTimer      = 0;
  let _meteorHitEvents  = [];  // 소행성 피격 이벤트 (Game.js에서 폭발 이펙트 생성)
  let _worldW           = 0;
  let _worldH           = 0;

  // GameConfig에서 설정값 읽기 (없으면 기본값)
  function _cfg(key, def) {
    return (window.GameConfig && window.GameConfig[key] != null) ? window.GameConfig[key] : def;
  }

  /** 초기화 — 게임 시작 시 호출 */
  function init(worldW, worldH) {
    _worldW      = worldW;
    _worldH      = worldH;
    _stageIndex  = 0;
    _cleared     = false;
    _meteors     = [];
    _meteorTimer = _randMeteorInterval();
    // 쿨다운·장갑 초기화
    if (window.WeaponSystem) WeaponSystem.setCooldownMult(1.0);
  }

  function _randMeteorInterval() {
    const mn = _cfg('METEOR_SPAWN_MIN', 4.0);
    const mx = _cfg('METEOR_SPAWN_MAX', 8.0);
    return mn + Math.random() * (mx - mn);
  }

  /** 현재 스테이지 정보 */
  function getStage()        { return STAGE_DEFS[_stageIndex]; }
  function getStageNumber()  { return _stageIndex + 1; }
  function getHazard()       { return STAGE_DEFS[_stageIndex].hazard; }
  function isLastStage()     { return _stageIndex >= STAGE_DEFS.length - 1; }
  function getMeteors()      { return _meteors; }
  function getStageDefs()    { return STAGE_DEFS; }
  function consumeMeteorHitEvents() { const ev = _meteorHitEvents.slice(); _meteorHitEvents.length = 0; return ev; }

  /**
   * 스테이지 클리어 처리 (보스 처치 시 Game.js에서 호출)
   * 다음 스테이지로 이동하고 환경 효과를 적용한다.
   * @returns {boolean} true=다음 스테이지로 진행, false=마지막 스테이지 클리어
   */
  function advanceStage() {
    // 현재 단계 환경 효과 해제
    _removeHazardEffects(_stageIndex);

    if (_stageIndex < STAGE_DEFS.length - 1) {
      _stageIndex++;
      _applyHazardEffects(_stageIndex);
      _meteors = [];
      _meteorTimer = _randMeteorInterval();
      _cleared = false;
      return true;
    }
    return false; // 마지막 스테이지
  }

  /** 스테이지 환경 효과 적용 */
  function _applyHazardEffects(idx) {
    const h = STAGE_DEFS[idx].hazard;
    if (h === 'CRYO') {
      if (window.WeaponSystem) WeaponSystem.setCooldownMult(_cfg('CRYO_CD_MULT', 1.3));
    }
  }

  /** 스테이지 환경 효과 해제 */
  function _removeHazardEffects(idx) {
    const h = STAGE_DEFS[idx].hazard;
    if (h === 'CRYO') {
      if (window.WeaponSystem) WeaponSystem.setCooldownMult(1.0);
    }
  }

  /**
   * 업데이트 — Game.js update()에서 매 프레임 호출
   * @param {number} dt
   * @param {object} player
   * @param {object} screenCenter {cx, cy}
   * @param {Array}  projectiles  - WeaponSystem.getActiveProjectiles() (소행성 피격 판정용)
   */
  function update(dt, player, screenCenter, projectiles) {
    const hazard = getHazard();

    // ── HEAT: 지속 데미지 (무적 무시)
    if (hazard === 'HEAT' && player && !player.isDead) {
      const dps = _cfg('HEAT_DPS', 0.5);
      player.takeDamageEnv(dps * dt);
    }

    // ── RADIATION: 장갑 효율 감소 (매 프레임 설정, Player.js에서 읽음)
    if (player) {
      player.armorHazardMult = (hazard === 'RADIATION')
        ? _cfg('RADIATION_ARMOR_MULT', 0.7)
        : 1.0;
    }

    // ── METEORS: 유성 스폰 & 이동 & 투사체 충돌
    if (hazard === 'METEORS') {
      _meteorTimer -= dt;
      if (_meteorTimer <= 0) {
        // 한 번에 2개 스폰 (밀도 증가)
        _spawnMeteor(screenCenter);
        _spawnMeteor(screenCenter);
        _meteorTimer = _randMeteorInterval();
      }
      _updateMeteors(dt, player);
      if (projectiles && player && screenCenter) {
        _checkProjectileHits(player, screenCenter, projectiles);
      }
    }
  }

  function _spawnMeteor(screenCenter) {
    const W = window.Renderer ? Renderer.getWidth()  : 1920;
    const H = window.Renderer ? Renderer.getHeight() : 1080;

    // 일정한 이동 방향: 좌상단 → 우하단 (~32도), 약간의 무작위 편차
    const speed = 170 + Math.random() * 130;
    const baseAngle = Math.PI * 0.18; // ~32도 (오른쪽 = 0)
    const angle = baseAngle + (Math.random() - 0.5) * (Math.PI * 0.12);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // 크기 결정: 60% SMALL, 30% MEDIUM, 10% LARGE
    const rnd = Math.random();
    const size = rnd < 0.10 ? 'LARGE' : rnd < 0.40 ? 'MEDIUM' : 'SMALL';
    const sdef = METEOR_SIZES[size];
    const radius = sdef.radiusMin + Math.random() * (sdef.radiusMax - sdef.radiusMin);

    // 스폰 위치: 위쪽 또는 왼쪽 화면 가장자리 바깥
    let sx, sy;
    const side = Math.random() < 0.55 ? 0 : 1; // 55% 위, 45% 왼쪽
    if (side === 0) {
      sx = -radius + Math.random() * (W + radius * 2);
      sy = -radius - 10;
    } else {
      sx = -radius - 10;
      sy = -radius + Math.random() * (H + radius * 2);
    }

    _meteors.push({ sx, sy, vx, vy, radius, damage: sdef.damage, active: true, age: 0, size, hp: sdef.hp });
  }

  function _updateMeteors(dt, player) {
    const W = window.Renderer ? Renderer.getWidth()  : 1920;
    const H = window.Renderer ? Renderer.getHeight() : 1080;
    for (let i = _meteors.length - 1; i >= 0; i--) {
      const m = _meteors[i];
      if (!m.active) { _meteors.splice(i, 1); continue; }
      m.sx += m.vx * dt;
      m.sy += m.vy * dt;
      m.age += dt;
      // 화면 밖으로 나가면 제거 (오른쪽·아래쪽으로 나감)
      if (m.sx > W + 120 || m.sy > H + 120 || m.sx < -200 || m.sy < -200 || m.age > 14) {
        _meteors.splice(i, 1); continue;
      }
      // 플레이어 충돌 (화면 중앙 = 플레이어 위치)
      if (player) {
        const pcx = window.Renderer ? Renderer.getWidth()  / 2 : 960;
        const pcy = window.Renderer ? Renderer.getHeight() / 2 : 540;
        const dx = m.sx - pcx, dy = m.sy - pcy;
        if (Math.hypot(dx, dy) < m.radius + player.hitboxRadius * 0.6) {
          player.takeDamage(m.damage);
          _meteorHitEvents.push({ wx: player.x, wy: player.y, radius: m.radius, size: m.size });
          m.active = false;
        }
      }
    }
  }

  /**
   * 투사체 vs 소행성 충돌 판정
   * 투사체는 월드 좌표, 소행성은 화면 좌표 — screenCenter로 변환
   */
  function _checkProjectileHits(player, screenCenter, projectiles) {
    for (const proj of projectiles) {
      if (!proj.active) continue;
      // 월드 → 화면 좌표 (wraparound 처리)
      let dx = proj.x - player.x;
      let dy = proj.y - player.y;
      if (_worldW > 0) {
        if (dx >  _worldW * 0.5) dx -= _worldW;
        if (dx < -_worldW * 0.5) dx += _worldW;
        if (dy >  _worldH * 0.5) dy -= _worldH;
        if (dy < -_worldH * 0.5) dy += _worldH;
      }
      const psx = screenCenter.cx + dx;
      const psy = screenCenter.cy + dy;

      for (let i = _meteors.length - 1; i >= 0; i--) {
        const m = _meteors[i];
        if (!m.active) continue;
        const mdx = psx - m.sx, mdy = psy - m.sy;
        if (Math.hypot(mdx, mdy) < proj.radius + m.radius) {
          m.hp--;
          if (m.hp <= 0) {
            m.active = false;
            // 피격 이벤트 (월드 좌표 변환)
            const wx = player.x + (m.sx - screenCenter.cx);
            const wy = player.y + (m.sy - screenCenter.cy);
            _meteorHitEvents.push({ wx, wy, radius: m.radius, size: m.size });
            _splitMeteor(m);
          }
          proj.active = false; // 투사체 소멸
          break;
        }
      }
    }
  }

  /**
   * 소행성 분열: LARGE → 2×MEDIUM, MEDIUM → 2×SMALL
   */
  function _splitMeteor(m) {
    if (m.size === 'SMALL') return;
    const childSize = m.size === 'LARGE' ? 'MEDIUM' : 'SMALL';
    const sdef = METEOR_SIZES[childSize];
    const baseVx = m.vx, baseVy = m.vy;
    // 수직 방향으로 ±편차
    const perpX = -baseVy / Math.hypot(baseVx, baseVy) * 40;
    const perpY =  baseVx / Math.hypot(baseVx, baseVy) * 40;
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      const r = sdef.radiusMin + Math.random() * (sdef.radiusMax - sdef.radiusMin);
      _meteors.push({
        sx: m.sx + perpX * sign * 0.5,
        sy: m.sy + perpY * sign * 0.5,
        vx: baseVx + perpX * sign * 0.35 + (Math.random() - 0.5) * 30,
        vy: baseVy + perpY * sign * 0.35 + (Math.random() - 0.5) * 30,
        radius: r,
        damage: sdef.damage,
        active: true,
        age: m.age,
        size: childSize,
        hp: sdef.hp,
      });
    }
  }

  return {
    init,
    update,
    advanceStage,
    getStage,
    getStageNumber,
    getHazard,
    isLastStage,
    getMeteors,
    getStageDefs,
    consumeMeteorHitEvents,
    STAGE_DEFS,
  };

})();

window.StageManager = StageManager;
