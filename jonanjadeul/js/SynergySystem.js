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

const ATTRIBUTES = ['FIRE', 'LASER', 'ELECTRIC', 'KINETIC'];

// 속성 아이콘 (HUD 표시용)
const ATTR_ICONS = { FIRE: '🔥', LASER: '💜', ELECTRIC: '⚡', KINETIC: '🔩' };

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
};

// 속성별 장착 수 (무기 모듈 장착/해제 시 갱신)
let _counts = { FIRE: 0, LASER: 0, ELECTRIC: 0, KINETIC: 0 };

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
}

// 전역 노출
window.SynergySystem = {
  addWeaponAttr,
  removeWeaponAttr,
  getDamageMult,
  getActiveEffects,
  getAttrCounts,
  reset,
  ATTRIBUTES,
  ATTR_ICONS,
};
