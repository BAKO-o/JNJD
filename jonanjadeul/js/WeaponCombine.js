/**
 * WeaponCombine.js — 무기 조합 시스템
 *
 * 두 무기를 선택해 조합하면 새로운 강력한 무기가 생성된다.
 * 원본 무기 2개는 소비(Consumed)된다.
 *
 * 조합 레시피: 무기 타입(FIREARM/ENERGY/CONVENTIONAL) + 속성(attr) 기반
 * 순서 무관 (A+B = B+A).
 *
 * 조합 레시피 목록:
 *   ENERGY+LASER  + ENERGY+FIRE    → WPN_ION_BLAST       (이온 방전포)
 *   FIREARM+FIRE  + CONVENTIONAL   → WPN_EXPLOSIVE_MISSILE (폭발 미사일)
 *   FIREARM+KINETIC + FIREARM+KINETIC → WPN_MINIGUN       (미니건)
 *   ENERGY+ELECTRIC + ENERGY+LASER → WPN_ION_CANNON      (이온 캐논)
 *   FIREARM+FIRE  + ENERGY+FIRE    → WPN_INCENDIARY      (소이탄)
 *   CONVENTIONAL+NUKE + any        → WPN_NUKE_LAUNCHER   (핵 발사기)
 *   ENERGY+ELECTRIC + ENERGY+FIRE  → WPN_RADIATOR        (방사기)
 *   ENERGY+LASER  + ENERGY+ELECTRIC→ WPN_GAMMA_RAY       (감마선포)
 */

'use strict';

const WeaponCombine = (() => {

  // ── 무기 타입: TetrisGrid MODULE_DEFS의 weaponType 필드 사용
  // FIREARM / ENERGY / CONVENTIONAL
  // ── 속성: FIRE / LASER / ELECTRIC / KINETIC / NUKE

  /**
   * 조합 레시피 배열
   * 각 레시피: { a: {type, attr}, b: {type, attr}, result: 'MODULE_KEY', name, desc }
   * attr: null = 속성 무관 (와일드카드)
   */
  const RECIPES = [
    {
      a: { type: 'ENERGY',       attr: 'LASER'    },
      b: { type: 'ENERGY',       attr: 'FIRE'     },
      result: 'WPN_ION_BLAST',
      name:   '이온 방전포',
      desc:   '[에너지+레이저] × [에너지+화염] → 강력한 이온 폭발 방전',
    },
    {
      a: { type: 'FIREARM',      attr: 'FIRE'     },
      b: { type: 'CONVENTIONAL', attr: null       },
      result: 'WPN_EXPLOSIVE_MISSILE',
      name:   '폭발 미사일',
      desc:   '[화기+화염] × [재래식] → 광역 폭발 유도탄',
    },
    {
      a: { type: 'FIREARM',      attr: 'KINETIC'  },
      b: { type: 'FIREARM',      attr: 'KINETIC'  },
      result: 'WPN_MINIGUN',
      name:   '미니건',
      desc:   '[화기+물리] × [화기+물리] → 초고속 5연사 기관포',
    },
    {
      a: { type: 'ENERGY',       attr: 'ELECTRIC' },
      b: { type: 'ENERGY',       attr: 'LASER'    },
      result: 'WPN_ION_CANNON',
      name:   '이온 캐논',
      desc:   '[에너지+전기] × [에너지+레이저] → 고데미지 이온 빔',
    },
    {
      a: { type: 'FIREARM',      attr: 'FIRE'     },
      b: { type: 'ENERGY',       attr: 'FIRE'     },
      result: 'WPN_INCENDIARY',
      name:   '소이 폭탄',
      desc:   '[화기+화염] × [에너지+화염] → 8방향 확산 소이탄',
    },
    {
      a: { type: 'CONVENTIONAL', attr: 'NUKE'     },
      b: { type: null,           attr: null       },
      result: 'WPN_NUKE_LAUNCHER',
      name:   '핵 발사기',
      desc:   '[재래식+핵] × [아무 무기] → 느리지만 대범위 핵 투사체',
    },
    {
      a: { type: 'ENERGY',       attr: 'ELECTRIC' },
      b: { type: 'ENERGY',       attr: 'FIRE'     },
      result: 'WPN_RADIATOR',
      name:   '방사기',
      desc:   '[에너지+전기] × [에너지+화염] → 초대형 궤도 방사체',
    },
    {
      a: { type: 'ENERGY',       attr: 'LASER'    },
      b: { type: 'ENERGY',       attr: 'ELECTRIC' },
      result: 'WPN_GAMMA_RAY',
      name:   '감마선포',
      desc:   '[에너지+레이저] × [에너지+전기] → 관통 감마선 빔',
    },
  ];

  /**
   * 두 무기 모듈 키로 조합 레시피 찾기
   * @param {string} keyA — TetrisGrid MODULE_DEFS 키 (예: 'WPN_LASER')
   * @param {string} keyB
   * @returns {{ result:string, name:string, desc:string }|null}
   */
  function findRecipe(keyA, keyB) {
    const defA = _getWeaponInfo(keyA);
    const defB = _getWeaponInfo(keyB);
    if (!defA || !defB) return null;

    for (const recipe of RECIPES) {
      // 정방향 A=a, B=b
      if (_matches(defA, recipe.a) && _matches(defB, recipe.b)) {
        return { result: recipe.result, name: recipe.name, desc: recipe.desc };
      }
      // 역방향 A=b, B=a (레시피 a≠b 일 때만)
      if (_matches(defA, recipe.b) && _matches(defB, recipe.a)) {
        return { result: recipe.result, name: recipe.name, desc: recipe.desc };
      }
    }
    return null;
  }

  function _matches(weaponInfo, recipeSlot) {
    // null = 와일드카드
    if (recipeSlot.type !== null && weaponInfo.type !== recipeSlot.type) return false;
    if (recipeSlot.attr !== null && weaponInfo.attr !== recipeSlot.attr) return false;
    return true;
  }

  function _getWeaponInfo(moduleKey) {
    if (!window.TetrisGrid) return null;
    const defs = TetrisGrid.getModuleDefs ? TetrisGrid.getModuleDefs() : null;
    if (!defs || !defs[moduleKey]) return null;
    const def = defs[moduleKey];
    return {
      type: def.weaponType ?? null,
      attr: def.bonus?.weaponAttr ?? null,
    };
  }

  /** 전체 레시피 목록 반환 (UI 표시용) */
  function getRecipes() { return RECIPES; }

  return { findRecipe, getRecipes };

})();

window.WeaponCombine = WeaponCombine;
