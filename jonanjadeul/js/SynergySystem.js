/**
 * SynergySystem.js — Phase 4: 속성 시너지 시스템 (v2 — 무기 속성 기반)
 *
 * 무기 모듈을 장착하면 해당 무기의 속성이 자동으로 등록된다.
 * 장착된 무기의 속성 조합에 따라 데미지 배율이 자동으로 변화한다.
 *
 * 속성 할당:
 *   KINETIC  — 물리 탄환 계열 (개틀링, 플랙, 산탄, 기뢰, 레일건, 태풍포)
 *   FIRE     — 폭발/에너지  계열 (유도탄, 노바, 플라즈마, 오메가포)
 *   LASER    — 정밀 광선   계열 (레이저포, 저격포)
 *   ELECTRIC — 전기/충격   계열 (궤도포, 연쇄탄, 소멸자)
 *
 * 사용:
 *   SynergySystem.addWeaponAttr('KINETIC')    → 무기 장착 시 속성 등록
 *   SynergySystem.removeWeaponAttr('KINETIC') → 무기 해제 시 속성 제거
 *   SynergySystem.getDamageMult()             → 현재 데미지 배율 반환
 *   SynergySystem.getActiveEffects()          → HUD용 활성 시너지 목록
 *   SynergySystem.getAttrCounts()             → 현재 속성별 개수 반환
 *   SynergySystem.reset()                     → 게임 재시작 시 초기화
 */

'use strict';

const ATTRIBUTES = ['FIRE', 'LASER', 'ELECTRIC', 'KINETIC', 'NUKE'];

// 속성 아이콘 (HUD 표시용)
const ATTR_ICONS = { FIRE: '🔥', LASER: '💜', ELECTRIC: '⚡', KINETIC: '🔩', NUKE: '☢' };

// 시너지/상쇄 테이블: 정렬된 'A+B' 키 → { mult, name, color }
// A+A 동일 속성 2개 이상, A+B 다른 속성 조합
const SYNERGY_TABLE = {
  // 동일 속성 쌍 (2개 이상 장착)
  'FIRE+FIRE':             { mult: 1.5,  name: '화염 증폭',     color: '#ef4444' },
  'LASER+LASER':           { mult: 1.4,  name: '레이저 집중',   color: '#a78bfa' },
  'ELECTRIC+ELECTRIC':     { mult: 1.35, name: '전기 과부하',   color: '#facc15' },
  'KINETIC+KINETIC':       { mult: 1.3,  name: '동역학 강화',   color: '#94a3b8' },
  // 혼합 시너지 (서로 다른 속성 각각 1개 이상)
  'ELECTRIC+FIRE':         { mult: 1.6,  name: '플라즈마 방전', color: '#f97316' },
  'ELECTRIC+LASER':        { mult: 1.7,  name: '이온 방전',     color: '#c084fc' },
  'FIRE+LASER':            { mult: 1.45, name: '열선 융합',     color: '#fb923c' },
  'FIRE+KINETIC':          { mult: 1.55, name: '폭발탄 강화',   color: '#ea580c' },
  'ELECTRIC+KINETIC':      { mult: 1.4,  name: '자기 가속',     color: '#818cf8' },
  'KINETIC+LASER':         { mult: 1.35, name: '레일 추진',     color: '#d8b4fe' },
  // NUKE 혼합 시너지
  'NUKE+NUKE':             { mult: 1.8,  name: '핵 연쇄 반응', color: '#4ade80' },
  'FIRE+NUKE':             { mult: 2.0,  name: '열핵 폭발',    color: '#f97316' },
  'ELECTRIC+NUKE':         { mult: 1.9,  name: '핵 EMP',       color: '#86efac' },
  'KINETIC+NUKE':          { mult: 1.6,  name: '핵 관통탄',    color: '#a3e635' },
  'LASER+NUKE':            { mult: 1.7,  name: '감마선 포격',  color: '#bef264' },
};

// ──────────────────────────────────────────────────────────────
// Shape Synergy (Phase B Proposal 1 — v1.4.0)
//
// 기존 "속성" 시너지 위에 "속성 × 모양" 축을 추가.
// 3속성(FIRE/ELECTRIC/LASER) × 3모양(LINE/L/BLOCK) = 9 조합.
// 각 조합은 해당 (attr, shape) 를 가진 무기 모듈이 1개 이상 장착 시 활성.
//
// 비수치 훅 분화:
//   B-3a (v1.5.0): WeaponSystem 에서 바로 가능한 4종 훅 (탄 단위)
//     FIRE:L → splashR ×1.3 · ELECTRIC:LINE → chainCount +1
//     ELECTRIC:L → 25% 크리 ×2.0 · LASER:LINE → pierceLeft +2
//   B-3b-1 (v1.6.0): ELECTRIC:BLOCK → EMP 펄스 (피격 적 0.8s 기절, 보스 면역)
//   B-3b-2 (v1.7.0): FIRE:BLOCK → 반사 DoT 2.0s·3dps · LASER:L → 받은 피해 50% 반사
//                    (TetrisGrid.hitShip 에 attacker 인자 추가, invincibleTime 가드 공유)
// ──────────────────────────────────────────────────────────────
const SHAPE_SYNERGY_TABLE = {
  'FIRE:LINE':     { mult: 1.15, name: '화염 사선',   color: '#ef4444', desc: '데미지 +15%' },
  'FIRE:L':        { mult: 1.20, name: '화염 포위',   color: '#f97316', desc: '데미지 +20% · 폭발 반경 ×1.3' },
  'FIRE:BLOCK':    { mult: 1.18, name: '화염 방벽',   color: '#fb923c', desc: '데미지 +18% · 피격 시 공격자에 2.0s·3dps 화염 DoT' },
  'ELECTRIC:LINE': { mult: 1.15, name: '전기 송전선', color: '#facc15', desc: '데미지 +15% · 연쇄 +1' },
  'ELECTRIC:L':    { mult: 1.20, name: '전기 절곡',   color: '#eab308', desc: '데미지 +20% · 크리 25% ×2.0' },
  'ELECTRIC:BLOCK':{ mult: 1.22, name: '전기 축전지', color: '#fde047', desc: '데미지 +22% · 피격 적 0.8s EMP 기절' },
  'LASER:LINE':    { mult: 1.18, name: '레이저 편광', color: '#a78bfa', desc: '데미지 +18% · 관통 +2' },
  'LASER:L':       { mult: 1.15, name: '레이저 굴절', color: '#c084fc', desc: '데미지 +15% · 피격 시 받은 피해 50% 공격자에게 즉시 반사' },
  'LASER:BLOCK':   { mult: 1.30, name: '레이저 집광', color: '#d8b4fe', desc: '데미지 +30% (단일 타겟 집중)' },
};

// 속성별 장착 수 (무기 모듈 장착/해제 시 갱신)
let _counts = { FIRE: 0, LASER: 0, ELECTRIC: 0, KINETIC: 0, NUKE: 0 };

// (attr, shape) 쌍 장착 수 — key: 'FIRE:LINE' 형식
let _shapeCounts = Object.create(null);

/**
 * 무기 장착 시 속성 추가
 * @param {string} attr
 */
function addWeaponAttr(attr) {
  if (_counts[attr] !== undefined) _counts[attr]++;
}

/**
 * 무기 해제 시 속성 제거
 * @param {string} attr
 */
function removeWeaponAttr(attr) {
  if (_counts[attr] !== undefined && _counts[attr] > 0) _counts[attr]--;
}

/**
 * 무기 모듈 장착 시 (attr, shape) 쌍 등록.
 * SHAPE_SYNERGY_TABLE 에 정의된 키(FIRE/ELECTRIC/LASER × LINE/L/BLOCK) 만
 * 실제로 집계한다. 그 외 (KINETIC, NUKE, DOT, OTHER) 는 무시 — Phase B-1~2
 * 프로토타입 범위는 9 조합으로 한정.
 *
 * @param {string} attr  — 'FIRE' | 'ELECTRIC' | 'LASER' | (그 외는 무시)
 * @param {string} shape — 'LINE' | 'L' | 'BLOCK' | (그 외는 무시)
 */
function addShapeAttr(attr, shape) {
  if (!attr || !shape) return;
  const key = attr + ':' + shape;
  if (!SHAPE_SYNERGY_TABLE[key]) return;
  _shapeCounts[key] = (_shapeCounts[key] || 0) + 1;
}

/**
 * 무기 모듈 해제 시 (attr, shape) 쌍 제거.
 * @param {string} attr
 * @param {string} shape
 */
function removeShapeAttr(attr, shape) {
  if (!attr || !shape) return;
  const key = attr + ':' + shape;
  if (!_shapeCounts[key]) return;
  _shapeCounts[key]--;
  if (_shapeCounts[key] <= 0) delete _shapeCounts[key];
}

/**
 * 현재 장착 속성 조합의 데미지 배율 반환.
 * 여러 시너지가 활성화되면 곱한다.
 * @returns {number}
 */
function getDamageMult() {
  let mult = 1.0;

  // 동일 속성 쌍 (각 속성당 최초 1회)
  for (const attr of ATTRIBUTES) {
    if (_counts[attr] >= 2) {
      const key = attr + '+' + attr;
      if (SYNERGY_TABLE[key]) mult *= SYNERGY_TABLE[key].mult;
    }
  }

  // 다른 속성 조합 (중복 제거, 알파벳 정렬)
  const activeAttrs = ATTRIBUTES.filter(a => _counts[a] >= 1);
  const seen = new Set();
  for (let i = 0; i < activeAttrs.length; i++) {
    for (let j = i + 1; j < activeAttrs.length; j++) {
      const [a, b] = [activeAttrs[i], activeAttrs[j]].sort();
      const key = a + '+' + b;
      if (!seen.has(key) && SYNERGY_TABLE[key]) {
        mult *= SYNERGY_TABLE[key].mult;
        seen.add(key);
      }
    }
  }

  // Phase B: shape 시너지 — (attr, shape) 쌍이 1개 이상 장착 시 1회 곱함
  for (const key in _shapeCounts) {
    if (_shapeCounts[key] >= 1 && SHAPE_SYNERGY_TABLE[key]) {
      mult *= SHAPE_SYNERGY_TABLE[key].mult;
    }
  }

  return mult;
}

/**
 * HUD 표시용 활성 시너지/상쇄 목록 반환
 * @returns {{ key:string, mult:number, name:string, color:string }[]}
 */
function getActiveEffects() {
  const effects = [];

  for (const attr of ATTRIBUTES) {
    if (_counts[attr] >= 2) {
      const key = attr + '+' + attr;
      if (SYNERGY_TABLE[key]) effects.push({ key, ...SYNERGY_TABLE[key] });
    }
  }

  const activeAttrs = ATTRIBUTES.filter(a => _counts[a] >= 1);
  const seen = new Set();
  for (let i = 0; i < activeAttrs.length; i++) {
    for (let j = i + 1; j < activeAttrs.length; j++) {
      const [a, b] = [activeAttrs[i], activeAttrs[j]].sort();
      const key = a + '+' + b;
      if (!seen.has(key) && SYNERGY_TABLE[key]) {
        effects.push({ key, ...SYNERGY_TABLE[key] });
        seen.add(key);
      }
    }
  }

  // Phase B: 활성 shape 시너지도 HUD 에 포함
  for (const key in _shapeCounts) {
    if (_shapeCounts[key] >= 1 && SHAPE_SYNERGY_TABLE[key]) {
      effects.push({ key, ...SHAPE_SYNERGY_TABLE[key] });
    }
  }

  return effects;
}

/**
 * HUD에 표시할 현재 속성별 장착 수 반환
 * @returns {{ [attr]: number }}
 */
function getAttrCounts() {
  return { ..._counts };
}

/** 게임 재시작 시 초기화 */
function reset() {
  for (const attr of ATTRIBUTES) _counts[attr] = 0;
  _shapeCounts = Object.create(null);
}

/** 디버그·HUD 용: 현재 활성 (attr:shape) 쌍 카운트 사본 반환 */
function getShapeCounts() {
  return { ..._shapeCounts };
}

// 전역 노출
window.SynergySystem = {
  addWeaponAttr,
  removeWeaponAttr,
  addShapeAttr,        // Phase B
  removeShapeAttr,     // Phase B
  getDamageMult,
  getActiveEffects,
  getAttrCounts,
  getShapeCounts,      // Phase B
  reset,
  ATTRIBUTES,
  ATTR_ICONS,
  SHAPE_SYNERGY_TABLE, // Phase B (HUD/테스트 노출)
};
