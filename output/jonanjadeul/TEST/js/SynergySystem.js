/**
 * SynergySystem.js — Phase 4: 속성 시너지 시스템
 *
 * 5개 속성 슬롯(FIRE/LASER/ELECTRIC/KINETIC/WATER)에
 * 레벨업 시 속성 코어를 추가하면 슬롯 조합에 따라 데미지 배율이 변화한다.
 *
 * 사용:
 *   SynergySystem.addSlot('FIRE')      → 슬롯에 속성 추가
 *   SynergySystem.getDamageMult()      → 현재 데미지 배율 반환 (WeaponSystem에서 호출)
 *   SynergySystem.getActiveEffects()   → HUD용 활성 시너지 목록 반환
 *   SynergySystem.getSlots()           → 현재 슬롯 배열 복사본
 *   SynergySystem.reset()              → 게임 재시작 시 초기화
 */

'use strict';

const MAX_SLOTS = 5;
const ATTRIBUTES = ['FIRE', 'LASER', 'ELECTRIC', 'KINETIC', 'WATER'];

// 시너지/상쇄 테이블: 정렬된 'A+B' 키 → { mult, name, color }
// 동일 속성 쌍(A+A) 및 혼합 페어(A+B, 알파벳 순 정렬)
const SYNERGY_TABLE = {
  'FIRE+FIRE':             { mult: 1.5,  name: '화염 증폭',     color: '#ef4444' },
  'LASER+LASER':           { mult: 1.4,  name: '레이저 집중',   color: '#a78bfa' },
  'ELECTRIC+ELECTRIC':     { mult: 1.35, name: '전기 과부하',   color: '#facc15' },
  'KINETIC+KINETIC':       { mult: 1.3,  name: '동역학 강화',   color: '#94a3b8' },
  'WATER+WATER':           { mult: 1.25, name: '유체 압축',     color: '#38bdf8' },
  'ELECTRIC+WATER':        { mult: 2.0,  name: '감전 시너지',   color: '#818cf8' },
  'FIRE+KINETIC':          { mult: 1.6,  name: '폭발탄 강화',   color: '#f97316' },
  'ELECTRIC+LASER':        { mult: 1.7,  name: '이온 방전',     color: '#c084fc' },
  'FIRE+LASER':            { mult: 1.45, name: '열선 융합',     color: '#fb923c' },
  'FIRE+WATER':            { mult: 0.8,  name: '열 상쇄 ↓',    color: '#64748b' }, // 상쇄
  'KINETIC+WATER':         { mult: 1.2,  name: '수력 충격',     color: '#7dd3fc' },
  'KINETIC+LASER':         { mult: 1.35, name: '레일 추진',     color: '#d8b4fe' },
};

let _slots = [];

/**
 * 슬롯에 속성 추가. 슬롯이 꽉 찼으면 false 반환.
 * @param {string} attr — ATTRIBUTES 중 하나
 */
function addSlot(attr) {
  if (_slots.length >= MAX_SLOTS) return false;
  _slots.push(attr);
  return true;
}

/**
 * 현재 슬롯 조합의 데미지 배율을 계산해 반환.
 * 여러 시너지가 활성화되면 모두 곱한다.
 * @returns {number}
 */
function getDamageMult() {
  if (_slots.length < 2) return 1.0;

  let mult = 1.0;

  // 동일 속성 쌍 계산 (각 속성당 최초 한 번만)
  const counted = {};
  for (const a of _slots) counted[a] = (counted[a] || 0) + 1;
  for (const [attr, cnt] of Object.entries(counted)) {
    if (cnt >= 2) {
      const key = attr + '+' + attr;
      if (SYNERGY_TABLE[key]) mult *= SYNERGY_TABLE[key].mult;
    }
  }

  // 다른 속성 쌍 (중복 제거)
  const seen = new Set();
  for (let i = 0; i < _slots.length; i++) {
    for (let j = i + 1; j < _slots.length; j++) {
      const [a, b] = [_slots[i], _slots[j]].sort();
      if (a === b) continue;
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
 * HUD 표시용 활성 시너지 목록 반환.
 * @returns {{ key:string, mult:number, name:string, color:string }[]}
 */
function getActiveEffects() {
  if (_slots.length < 2) return [];

  const effects = [];

  const counted = {};
  for (const a of _slots) counted[a] = (counted[a] || 0) + 1;
  for (const [attr, cnt] of Object.entries(counted)) {
    if (cnt >= 2) {
      const key = attr + '+' + attr;
      if (SYNERGY_TABLE[key]) effects.push({ key, ...SYNERGY_TABLE[key] });
    }
  }

  const seen = new Set();
  for (let i = 0; i < _slots.length; i++) {
    for (let j = i + 1; j < _slots.length; j++) {
      const [a, b] = [_slots[i], _slots[j]].sort();
      if (a === b) continue;
      const key = a + '+' + b;
      if (!seen.has(key) && SYNERGY_TABLE[key]) {
        effects.push({ key, ...SYNERGY_TABLE[key] });
        seen.add(key);
      }
    }
  }

  return effects;
}

/** 현재 슬롯 배열 복사본 반환 */
function getSlots() { return [..._slots]; }

/** 게임 재시작 시 초기화 */
function reset() { _slots = []; }

// 전역 노출 (다른 모듈에서 window.SynergySystem 으로 접근)
window.SynergySystem = { addSlot, getDamageMult, getActiveEffects, getSlots, reset, ATTRIBUTES, MAX_SLOTS };
