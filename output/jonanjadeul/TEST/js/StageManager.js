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

  // ── 현재 스테이지 상태
  let _stageIndex   = 0;   // 0-based (0 = Stage 1)
  let _cleared      = false;
  let _meteors      = [];
  let _meteorTimer  = 0;
  let _worldW       = 0;
  let _worldH       = 0;

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
   */
  function update(dt, player, screenCenter) {
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

    // ── METEORS: 유성 스폰 & 이동
    if (hazard === 'METEORS') {
      _meteorTimer -= dt;
      if (_meteorTimer <= 0) {
        _spawnMeteor(screenCenter);
        _meteorTimer = _randMeteorInterval();
      }
      _updateMeteors(dt, player);
    }
  }

  function _spawnMeteor(screenCenter) {
    const W = window.Renderer ? Renderer.getWidth()  : 1920;
    const H = window.Renderer ? Renderer.getHeight() : 1080;
    // 화면 왼쪽 바깥에서 오른쪽으로 이동하는 유성
    const cx = screenCenter ? screenCenter.cx : W / 2;
    const cy = screenCenter ? screenCenter.cy : H / 2;
    const side = Math.floor(Math.random() * 2); // 0=위, 1=왼쪽
    let sx, sy, vx, vy;
    const speed = 240 + Math.random() * 160;
    const angle = (Math.PI / 6) + Math.random() * (Math.PI / 6);
    if (side === 0) {
      sx = Math.random() * W;  sy = -40;
      vx = Math.cos(angle) * speed; vy = Math.sin(angle) * speed;
    } else {
      sx = -40; sy = Math.random() * H;
      vx = Math.cos(angle) * speed * 0.7; vy = Math.sin(angle * 0.5) * speed;
    }
    _meteors.push({
      sx, sy, vx, vy,
      radius: 14 + Math.floor(Math.random() * 18),
      damage: _cfg('METEOR_DAMAGE', 5),
      active: true,
      age: 0,
      // 추적: 화면 좌표 사용
    });
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
      // 화면 밖으로 나가면 제거
      if (m.sx < -100 || m.sx > W + 100 || m.sy < -100 || m.sy > H + 100 || m.age > 12) {
        _meteors.splice(i, 1); continue;
      }
      // 플레이어 충돌 (화면 중앙 = 플레이어)
      if (player) {
        const cx = window.Renderer ? Renderer.getWidth() / 2  : 960;
        const cy = window.Renderer ? Renderer.getHeight() / 2 : 540;
        const dx = m.sx - cx, dy = m.sy - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < m.radius + player.hitboxRadius * 0.6) {
          player.takeDamage(m.damage);
          m.active = false;
        }
      }
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
    STAGE_DEFS,
  };

})();

window.StageManager = StageManager;
