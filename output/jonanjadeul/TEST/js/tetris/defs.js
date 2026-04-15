/**
 * tetris/defs.js — 테트리스 조립 시스템의 정의 상수
 *
 * P0-2 stage 1: TetrisGrid.js 에서 모듈 카탈로그와 티어 상수를 분리.
 * 이 파일은 다른 어느 파일도 참조하지 않는 순수 데이터 모듈이다.
 *
 * 노출: window.TetrisDefs
 */
'use strict';

window.TetrisDefs = (() => {

  // ── 셀 크기 & 그리드 반경
  const CELL  = 22;   // 셀 크기 (px) — 게임플레이 & 조립 UI 공통
  const MAX_R = 7;    // 그리드 반경 (코어 기준 ±7 칸)
  const HALF  = CELL / 2;

  // ── 함체 슬롯 상수
  const HULL_SLOT_EXPAND_COST   = 150; // 슬롯 증설 스크랩 비용
  const HULL_SLOT_EXPAND_AMOUNT = 3;   // 1회 증설 슬롯 수
  const HULL_SLOT_INITIAL       = 12;  // 초기 최대 함체 슬롯

  // ── 티어 시스템
  const TIER_WEIGHTS = { COMMON: 72, RARE: 20, EPIC: 6, LEGENDARY: 2 };
  const TIER_LABELS  = { COMMON: '일반', RARE: '희귀', EPIC: '에픽', LEGENDARY: '전설' };
  const TIER_COLORS  = { COMMON: '#94a3b8', RARE: '#3b82f6', EPIC: '#a855f7', LEGENDARY: '#f59e0b' };

  // ── 스크랩 환산표 (unequip/scrap 시)
  const SCRAP_VALUES = { COMMON: 5, RARE: 15, EPIC: 30, LEGENDARY: 60 };

  // ── 모듈 정의 (tier: COMMON/RARE/EPIC/LEGENDARY)
  // cells: 앵커(0,0) 기준 차지하는 셀 오프셋 배열
  const MODULE_DEFS = {
    // ─── 일반 (COMMON) ───
    HULL_1:          { tier:'COMMON',    name:'장갑판 I',        cells:[{gx:0,gy:0}],                                          color:'#64748b', desc:'HP +25',                        bonus:{hp:25} },
    HULL_2:          { tier:'COMMON',    name:'장갑판 II',       cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#475569', desc:'HP +50',                        bonus:{hp:50} },
    THRUSTER:        { tier:'COMMON',    name:'추진기',          cells:[{gx:0,gy:0},{gx:-1,gy:0}],                             color:'#1e40af', desc:'이동속도 +15%',                  bonus:{speed:0.15} },
    WING_L:          { tier:'COMMON',    name:'좌익 모듈',       cells:[{gx:0,gy:0},{gx:0,gy:-1}],                             color:'#0e7490', desc:'HP +20 / 속도 +8%',             bonus:{hp:20,speed:0.08} },
    WING_R:          { tier:'COMMON',    name:'우익 모듈',       cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#0e7490', desc:'HP +20 / 속도 +8%',             bonus:{hp:20,speed:0.08} },

    // ─── 희귀 (RARE) ───
    GUN_1:           { tier:'RARE',      name:'포탑 마운트',     cells:[{gx:0,gy:0}],                                          color:'#b45309', desc:'데미지 +15%',                   bonus:{damage:0.15} },
    GUN_2:           { tier:'RARE',      name:'이중 포탑',       cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#92400e', desc:'데미지 +25% / 쿨다운 -15%',     bonus:{damage:0.25,cooldownMult:0.85} },
    HULL_3:          { tier:'RARE',      name:'중장갑판',        cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:2,gy:0}],                 color:'#334155', desc:'HP +90',                        bonus:{hp:90} },
    THRUSTER_2:      { tier:'RARE',      name:'고출력 추진기',   cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#1d4ed8', desc:'이동속도 +25%',                  bonus:{speed:0.25} },
    WING_HEAVY:      { tier:'RARE',      name:'강화익',          cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:-1}],                color:'#0c4a6e', desc:'HP +40 / 속도 +12%',            bonus:{hp:40,speed:0.12} },

    // ─── 에픽 (EPIC) ───
    REACTOR:         { tier:'EPIC',      name:'반응로',          cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#7e22ce', desc:'데미지 +30% / 쿨다운 -15%',     bonus:{damage:0.30,cooldownMult:0.85} },
    SHIELD_CELL:     { tier:'EPIC',      name:'실드 셀',         cells:[{gx:0,gy:0}],                                          color:'#6d28d9', desc:'HP +60',                        bonus:{hp:60} },
    REINFORCED_HULL: { tier:'EPIC',      name:'강화 외장',       cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:1},{gx:1,gy:1}],    color:'#1e293b', desc:'HP +150',                       bonus:{hp:150} },
    TWIN_GUN:        { tier:'EPIC',      name:'트윈 포대',       cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:-1,gy:0}],                color:'#78350f', desc:'데미지 +40% / 쿨다운 -20%',     bonus:{damage:0.40,cooldownMult:0.80} },

    // ─── 전설 (LEGENDARY) ───
    OVERCLOCK:       { tier:'LEGENDARY', name:'오버클럭 엔진',   cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#a16207', desc:'속도 +35% / 데미지 +20%',       bonus:{speed:0.35,damage:0.20} },
    FURY_CORE:       { tier:'LEGENDARY', name:'분노 코어',       cells:[{gx:0,gy:0}],                                          color:'#7f1d1d', desc:'데미지 +50% / 쿨다운 -25%',     bonus:{damage:0.50,cooldownMult:0.75} },
    TITAN_HULL:      { tier:'LEGENDARY', name:'타이탄 장갑',     cells:[{gx:0,gy:0},{gx:0,gy:1},{gx:0,gy:-1},{gx:0,gy:2}],   color:'#0f172a', desc:'HP +300',                       bonus:{hp:300} },

    // ─── 무기 (COMMON) ───
    WPN_GATLING:     { tier:'COMMON',    weaponType:'FIREARM',       name:'개틀링포',        cells:[{gx:0,gy:0}],                                          color:'#dc2626', desc:'빠른 3방향 연사',               bonus:{weapon:'WPN_GATLING',    weaponAttr:'KINETIC'} },
    WPN_FLAK:        { tier:'COMMON',    weaponType:'CONVENTIONAL',  name:'플랙포',          cells:[{gx:0,gy:0}],                                          color:'#ca8a04', desc:'8방향 근거리 폭발',              bonus:{weapon:'WPN_FLAK',       weaponAttr:'KINETIC'} },
    WPN_LASER:       { tier:'COMMON',    weaponType:'ENERGY',        name:'레이저포',        cells:[{gx:0,gy:0}],                                          color:'#2563eb', desc:'초고속 단일 연사',               bonus:{weapon:'WPN_LASER',      weaponAttr:'LASER'} },

    // ─── 무기 (RARE) ───
    WPN_SPREAD:      { tier:'RARE',      weaponType:'FIREARM',       name:'산탄포',          cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#ea580c', desc:'5발 부채꼴 발사',               bonus:{weapon:'WPN_SPREAD',     weaponAttr:'KINETIC'} },
    WPN_MISSILE:     { tier:'RARE',      weaponType:'FIREARM',       name:'유도탄',          cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#0891b2', desc:'호밍 미사일 발사',               bonus:{weapon:'WPN_MISSILE',    weaponAttr:'FIRE'} },
    WPN_ORBIT:       { tier:'RARE',      weaponType:'ENERGY',        name:'궤도포',          cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#059669', desc:'3개 공전 탄',                   bonus:{weapon:'WPN_ORBIT',      weaponAttr:'ELECTRIC'} },
    WPN_MINE:        { tier:'RARE',      weaponType:'CONVENTIONAL',  name:'기뢰',            cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#7f1d1d', desc:'정지 기뢰 설치',                bonus:{weapon:'WPN_MINE',       weaponAttr:'KINETIC'} },

    // ─── 무기 (EPIC) ───
    WPN_SNIPER:      { tier:'EPIC',      weaponType:'ENERGY',        name:'저격포',          cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#7c3aed', desc:'고데미지 단발 저격',            bonus:{weapon:'WPN_SNIPER',     weaponAttr:'LASER'} },
    WPN_CHAIN:       { tier:'EPIC',      weaponType:'ENERGY',        name:'연쇄탄',          cells:[{gx:0,gy:0}],                                          color:'#9d174d', desc:'연쇄 충격파 3회',              bonus:{weapon:'WPN_CHAIN',      weaponAttr:'ELECTRIC'} },
    WPN_NOVA:        { tier:'EPIC',      weaponType:'ENERGY',        name:'노바포',          cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#6d28d9', desc:'전방향 12발 폭발',              bonus:{weapon:'WPN_NOVA',       weaponAttr:'FIRE'} },
    WPN_PLASMA:      { tier:'EPIC',      weaponType:'ENERGY',        name:'플라즈마포',      cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#c026d3', desc:'7발 광역 플라즈마',             bonus:{weapon:'WPN_PLASMA',     weaponAttr:'FIRE'} },
    WPN_RAILGUN:     { tier:'EPIC',      weaponType:'CONVENTIONAL',  name:'레일건',          cells:[{gx:0,gy:0},{gx:0,gy:1},{gx:0,gy:2}],                 color:'#0369a1', desc:'초고데미지 관통탄',             bonus:{weapon:'WPN_RAILGUN',    weaponAttr:'KINETIC'} },

    // ─── 무기 (LEGENDARY) ───
    WPN_TYPHOON:     { tier:'LEGENDARY', weaponType:'FIREARM',       name:'태풍포',          cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:1}],                 color:'#0c4a6e', desc:'8방향 고속 연사',               bonus:{weapon:'WPN_TYPHOON',    weaponAttr:'KINETIC'} },
    WPN_ANNIHILATOR: { tier:'LEGENDARY', weaponType:'ENERGY',        name:'소멸자',          cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:2,gy:0}],                 color:'#450a0a', desc:'5연쇄 고데미지 충격파',         bonus:{weapon:'WPN_ANNIHILATOR',weaponAttr:'ELECTRIC'} },
    WPN_OMEGA:       { tier:'LEGENDARY', weaponType:'ENERGY',        name:'오메가포',        cells:[{gx:0,gy:0},{gx:0,gy:1},{gx:1,gy:0},{gx:1,gy:1}],    color:'#312e81', desc:'24발 전방향 포격',             bonus:{weapon:'WPN_OMEGA',      weaponAttr:'FIRE'} },

    // ─── NUKE 기본 무기 (EPIC/LEGENDARY) ───
    WPN_NUKE_SHELL:  { tier:'EPIC',      weaponType:'CONVENTIONAL',  name:'핵탄두',          cells:[{gx:0,gy:0},{gx:0,gy:1},{gx:1,gy:0}],                 color:'#4ade80', desc:'느린 호밍 핵 투사체 (광역 r=100)', bonus:{weapon:'WPN_NUKE_SHELL',  weaponAttr:'NUKE'} },
    WPN_RADIATOR_BASE:{ tier:'RARE',     weaponType:'ENERGY',        name:'방사체',          cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#86efac', desc:'5개 궤도 방사 탄',               bonus:{weapon:'WPN_RADIATOR_BASE',weaponAttr:'NUKE'} },

    // ─── 조합 결과 무기 (LEGENDARY) ─ 드랍 불가, craftCombine으로만 획득 ───
    WPN_ION_BLAST:        { tier:'LEGENDARY', weaponType:'ENERGY',       name:'이온 방전포',   cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:1}],                 color:'#c4b5fd', desc:'8발 이온 폭발 방전 [조합 전용]',  bonus:{weapon:'WPN_ION_BLAST',        weaponAttr:'LASER'} },
    WPN_EXPLOSIVE_MISSILE:{ tier:'LEGENDARY', weaponType:'FIREARM',      name:'폭발 미사일',   cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:2,gy:0}],                 color:'#f97316', desc:'광역 폭발 유도탄 [조합 전용]',     bonus:{weapon:'WPN_EXPLOSIVE_MISSILE',weaponAttr:'FIRE'} },
    WPN_MINIGUN:          { tier:'LEGENDARY', weaponType:'FIREARM',      name:'미니건',        cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#fca5a5', desc:'초고속 5연사 기관포 [조합 전용]',  bonus:{weapon:'WPN_MINIGUN',          weaponAttr:'KINETIC'} },
    WPN_ION_CANNON:       { tier:'LEGENDARY', weaponType:'ENERGY',       name:'이온 캐논',     cells:[{gx:0,gy:0},{gx:0,gy:1},{gx:0,gy:2}],                 color:'#818cf8', desc:'고데미지 이온 관통 빔 [조합 전용]', bonus:{weapon:'WPN_ION_CANNON',       weaponAttr:'ELECTRIC'} },
    WPN_INCENDIARY:       { tier:'LEGENDARY', weaponType:'FIREARM',      name:'소이 폭탄',     cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#ef4444', desc:'8방향 확산 소이탄 [조합 전용]',    bonus:{weapon:'WPN_INCENDIARY',       weaponAttr:'FIRE'} },
    WPN_NUKE_LAUNCHER:    { tier:'LEGENDARY', weaponType:'CONVENTIONAL', name:'핵 발사기',     cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:1},{gx:1,gy:1}],    color:'#4ade80', desc:'대범위 핵 투사체 [조합 전용]',     bonus:{weapon:'WPN_NUKE_LAUNCHER',    weaponAttr:'NUKE'} },
    WPN_RADIATOR:         { tier:'LEGENDARY', weaponType:'ENERGY',       name:'방사기',        cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:1}],                 color:'#86efac', desc:'5개 대형 궤도 방사 [조합 전용]',   bonus:{weapon:'WPN_RADIATOR',         weaponAttr:'NUKE'} },
    WPN_GAMMA_RAY:        { tier:'LEGENDARY', weaponType:'ENERGY',       name:'감마선포',      cells:[{gx:0,gy:0},{gx:0,gy:1},{gx:1,gy:0},{gx:1,gy:1}],    color:'#bef264', desc:'관통 감마선 빔 [조합 전용]',       bonus:{weapon:'WPN_GAMMA_RAY',        weaponAttr:'LASER'} },

    // ─── 속성 강화 (RARE) — 단일 속성 +1, 1셀 ───
    FIRE_CORE:       { tier:'RARE',      name:'화염 코어',       cells:[{gx:0,gy:0},{gx:0,gy:1}],                              color:'#b91c1c', desc:'🔥 FIRE +1 (화염 시너지 강화)', bonus:{weaponAttr:'FIRE'} },
    ELECTRIC_COIL:   { tier:'RARE',      name:'전기 코일',       cells:[{gx:0,gy:0},{gx:1,gy:0}],                              color:'#a16207', desc:'⚡ ELECTRIC +1 (전기 시너지 강화)', bonus:{weaponAttr:'ELECTRIC'} },
    LASER_PRISM:     { tier:'RARE',      name:'레이저 프리즘',   cells:[{gx:0,gy:0},{gx:0,gy:-1}],                             color:'#5b21b6', desc:'💜 LASER +1 (레이저 시너지 강화)', bonus:{weaponAttr:'LASER'} },
    KINETIC_MASS:    { tier:'RARE',      name:'질량 코어',       cells:[{gx:0,gy:0},{gx:-1,gy:0}],                             color:'#1f2937', desc:'🔩 KINETIC +1 (동역학 시너지 강화)', bonus:{weaponAttr:'KINETIC'} },
    NUKE_CORE:       { tier:'EPIC',      name:'핵 코어',         cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:1}],                 color:'#166534', desc:'☢ NUKE +1 (핵 시너지 강화)', bonus:{weaponAttr:'NUKE'} },

    // ─── 속성 강화 (EPIC) — 두 속성 +1씩, 2~3셀 ───
    PLASMA_CONDUIT:  { tier:'EPIC',      name:'플라즈마 도관',   cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:1}],                 color:'#c026d3', desc:'🔥⚡ FIRE+ELECTRIC +1씩 (플라즈마 방전 강화)', bonus:{weaponAttrs:['FIRE','ELECTRIC']} },
    ION_CIRCUIT:     { tier:'EPIC',      name:'이온 회로',       cells:[{gx:0,gy:0},{gx:-1,gy:0},{gx:1,gy:0}],                color:'#4338ca', desc:'💜⚡ LASER+ELECTRIC +1씩 (이온 방전 강화)', bonus:{weaponAttrs:['LASER','ELECTRIC']} },
    IGNITION_MASS:   { tier:'EPIC',      name:'점화 질량체',     cells:[{gx:0,gy:0},{gx:0,gy:1},{gx:0,gy:-1}],                color:'#9a3412', desc:'🔥🔩 FIRE+KINETIC +1씩 (폭발탄 강화)', bonus:{weaponAttrs:['FIRE','KINETIC']} },

    // ─── 속성 강화 (LEGENDARY) — 세 속성 +1씩, 4셀 ───
    RESONANCE_CORE:  { tier:'LEGENDARY', name:'공명 코어',       cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:-1,gy:0},{gx:0,gy:1}],   color:'#5b21b6', desc:'🔥💜⚡ FIRE+LASER+ELECTRIC +1씩 (다중 시너지)', bonus:{weaponAttrs:['FIRE','LASER','ELECTRIC']} },
  };

  // ──────────────────────────────────────────────────────────────
  // Shape classification (Phase B Proposal 1 — v1.4.0)
  //
  // cells 배열의 기하를 보고 아래 5종 중 하나로 분류한다:
  //   DOT   — 1셀
  //   LINE  — 2셀 이상 일직선 (2-line, I3, I4 포함)
  //   L     — 3셀 꺾임 (연결 가정 · 비직선)
  //   BLOCK — 4셀 2×2 정사각
  //   OTHER — 그 외 (T자, 커스텀 4셀 등) → shape 시너지 비대상
  //
  // SynergySystem 의 shape 시너지 테이블은 LINE/L/BLOCK 3종만 다룬다.
  // DOT 와 OTHER 는 분류만 부여하고 시너지 버프는 붙지 않는다.
  // MODULE_DEFS 는 정적 데이터이므로 init 타임에 1회만 계산해 삽입한다.
  // ──────────────────────────────────────────────────────────────
  function classifyShape(cells) {
    const n = cells.length;
    if (n === 1) return 'DOT';

    const sameRow = cells.every(c => c.gy === cells[0].gy);
    const sameCol = cells.every(c => c.gx === cells[0].gx);
    if (sameRow || sameCol) return 'LINE'; // 2셀 직선 / I3 / I4

    if (n === 4) {
      const xs = [...new Set(cells.map(c => c.gx))].sort((a, b) => a - b);
      const ys = [...new Set(cells.map(c => c.gy))].sort((a, b) => a - b);
      if (xs.length === 2 && ys.length === 2 &&
          xs[1] - xs[0] === 1 && ys[1] - ys[0] === 1) {
        return 'BLOCK';
      }
    }

    // 3셀 비직선 → L자 (MODULE_DEFS 는 항상 4-연결이라 가정)
    if (n === 3) return 'L';

    return 'OTHER';
  }

  // 모든 MODULE_DEFS 엔트리에 shape 필드를 1회 주입
  for (const key of Object.keys(MODULE_DEFS)) {
    MODULE_DEFS[key].shape = classifyShape(MODULE_DEFS[key].cells);
  }

  const MODULE_KEYS = Object.keys(MODULE_DEFS);

  // 조합으로만 획득 가능한 무기 키 (드랍 풀에서 제외)
  const CRAFT_ONLY_KEYS = new Set([
    'WPN_ION_BLAST','WPN_EXPLOSIVE_MISSILE','WPN_MINIGUN','WPN_ION_CANNON',
    'WPN_INCENDIARY','WPN_NUKE_LAUNCHER','WPN_RADIATOR','WPN_GAMMA_RAY',
  ]);
  const DROPPABLE_MODULE_KEYS = MODULE_KEYS.filter(k => !CRAFT_ONLY_KEYS.has(k));

  return {
    CELL, MAX_R, HALF,
    HULL_SLOT_EXPAND_COST, HULL_SLOT_EXPAND_AMOUNT, HULL_SLOT_INITIAL,
    TIER_WEIGHTS, TIER_LABELS, TIER_COLORS,
    SCRAP_VALUES,
    MODULE_DEFS, MODULE_KEYS, CRAFT_ONLY_KEYS, DROPPABLE_MODULE_KEYS,
    classifyShape, // Phase B: 테스트·추가 모듈 등록용 헬퍼 노출
  };

})();
