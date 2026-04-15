/**
 * JNJD 스모크 테스트 (3개)
 *
 * 목적: 배포 무결성 + 핵심 구조 상수 보전 검증
 *
 * 게임 본체가 IIFE + window 전역 패턴이라 단위 테스트 부적합.
 * TetrisGrid 6-분할(P0-2) 이후 실제 단위 테스트로 확장 예정.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';

const ROOT = resolve(import.meta.dirname, '..');
const JS_DIR = resolve(ROOT, 'jonanjadeul/js');

describe('JNJD 스모크 테스트', () => {
  /**
   * 1. 배포 핵심 파일 존재 검증
   *    누락 시 즉시 실패 → 배포 빌드에서 파일 삭제 사고 방지
   */
  it('jonanjadeul/js 하위 핵심 JS 파일 + tetris/ 서브모듈이 모두 존재한다', () => {
    const required = [
      'Game.js',
      'Renderer.js',
      'Player.js',
      'EnemyManager.js',
      'WeaponSystem.js',
      'WeaponCombine.js',
      'SynergySystem.js',
      'TetrisGrid.js',
      'StageManager.js',
      'InputHandler.js',
      'Collision.js',
      'config.js',
      'version.js',
      // P0-2 stage 1+: tetris/ 하위 분할 모듈 (누적 추가 예정)
      'tetris/defs.js',
      'tetris/icons.js',
      'tetris/render.js',
    ];
    const missing = required.filter(f => !existsSync(resolve(JS_DIR, f)));
    expect(missing, `누락된 파일: ${missing.join(', ')}`).toEqual([]);
  });

  /**
   * 2. VERSION 단일 소스 존재 + SemVer 형식 검증
   *    CLAUDE.md 가 약속한 "version.js 내 window.JNJD_VERSION" 계약 유지 (P0-4b 이후).
   *    추가로 Game.js 에 레거시 `const VERSION` 잔여가 없는지도 확인.
   */
  it('version.js 에 SemVer 형식의 window.JNJD_VERSION 이 있고, Game.js 에 레거시 const VERSION 잔여가 없다', () => {
    const ver = readFileSync(resolve(JS_DIR, 'version.js'), 'utf8');
    const match = ver.match(/window\.JNJD_VERSION\s*=\s*['"](v\d+\.\d+\.\d+)['"]/);
    expect(match, 'version.js 에서 window.JNJD_VERSION 을 찾지 못함').not.toBeNull();
    expect(match[1]).toMatch(/^v\d+\.\d+\.\d+$/);

    const game = readFileSync(resolve(JS_DIR, 'Game.js'), 'utf8');
    expect(
      /const\s+VERSION\s*=/.test(game),
      'Game.js 에 레거시 const VERSION 이 남아 있음 (version.js 의 window.JNJD_VERSION 만 사용할 것)',
    ).toBe(false);
  });

  /**
   * 3. 파일별 LOC 상한 (god-object 재출현 방지용 압력 장치)
   *
   *    P0-2 완료 후 TetrisGrid.js + tetris/* 분할로 단일 4,000 LOC 캡은 의미가
   *    줄었다. 각 모듈에 "현재 + 여유" 수준의 개별 상한을 두어, 특정 파일이
   *    다시 god-object 로 부풀지 못하게 한다.
   *
   *    기준 (2026-04-15 stage 6 종료 시점):
   *    - TetrisGrid.js   : 762  LOC → cap 1,500 (facade + 게임플레이 로직)
   *    - tetris/defs.js  : 129  LOC → cap 400
   *    - tetris/icons.js : 293  LOC → cap 800
   *    - tetris/render.js: 806  LOC → cap 1,600
   */
  it.each([
    ['TetrisGrid.js',    1500],
    ['tetris/defs.js',   400],
    ['tetris/icons.js',  800],
    ['tetris/render.js', 1600],
  ])('%s 는 상한선 %i LOC 를 넘지 않는다', (relPath, cap) => {
    const content = readFileSync(resolve(JS_DIR, relPath), 'utf8');
    const lines = content.split('\n').length;
    expect(lines, `${relPath}: ${lines} LOC — 상한선(${cap}) 초과. 분할을 고려하세요`).toBeLessThan(cap);
  });

  /**
   * 5. Phase B Proposal 1 — SynergySystem shape 배율 적용
   *    SynergySystem.js 를 vm 에 실행한 뒤:
   *    - addShapeAttr('FIRE','LINE') 단독 시 getDamageMult 가 ≈ 1.15
   *    - addShapeAttr 2회로 FIRE:LINE + LASER:BLOCK 활성 시 ≈ 1.15 * 1.30
   *    - removeShapeAttr 로 카운터가 0 에 도달하면 기여가 사라짐
   *    - 알 수 없는 키(KINETIC:LINE, FIRE:OTHER 등) 는 무시
   */
  it('SynergySystem.addShapeAttr 가 getDamageMult 에 9개 조합만 반영한다', () => {
    const js = readFileSync(resolve(JS_DIR, 'SynergySystem.js'), 'utf8');
    const sandbox = { window: {} };
    createContext(sandbox);
    runInContext(js, sandbox);
    const S = sandbox.window.SynergySystem;

    S.reset();
    expect(S.getDamageMult()).toBeCloseTo(1.0, 5);

    S.addShapeAttr('FIRE', 'LINE');
    expect(S.getDamageMult()).toBeCloseTo(1.15, 5);

    S.addShapeAttr('LASER', 'BLOCK');
    expect(S.getDamageMult()).toBeCloseTo(1.15 * 1.30, 5);

    // 9 조합 외 값은 무시
    S.addShapeAttr('KINETIC', 'LINE');   // KINETIC 은 shape 시너지 비대상
    S.addShapeAttr('FIRE', 'OTHER');     // OTHER 는 shape 시너지 비대상
    expect(S.getDamageMult()).toBeCloseTo(1.15 * 1.30, 5);

    // 역적용
    S.removeShapeAttr('FIRE', 'LINE');
    expect(S.getDamageMult()).toBeCloseTo(1.30, 5);
    S.removeShapeAttr('LASER', 'BLOCK');
    expect(S.getDamageMult()).toBeCloseTo(1.0, 5);

    // 활성 효과 HUD 목록
    S.reset();
    S.addShapeAttr('ELECTRIC', 'BLOCK');
    const effects = S.getActiveEffects();
    expect(effects.length).toBe(1);
    expect(effects[0].key).toBe('ELECTRIC:BLOCK');
    expect(effects[0].name).toBe('전기 축전지');
  });

  /**
   * 4. Phase B Proposal 1 — Shape Synergy 인프라
   *    defs.js 실행 후 MODULE_DEFS 모든 엔트리에 `shape` 필드가 주입되며,
   *    대표 모듈 5종이 기대대로 DOT/LINE/L/BLOCK/OTHER 로 분류되는지 확인.
   *    (LINE/L/BLOCK 셋만 shape 시너지 대상, DOT/OTHER 는 비대상)
   */
  it('MODULE_DEFS 모든 엔트리에 shape 필드 주입 + 대표 5종 분류 일치', () => {
    const defsJs = readFileSync(resolve(JS_DIR, 'tetris/defs.js'), 'utf8');
    const sandbox = { window: {} };
    createContext(sandbox);
    runInContext(defsJs, sandbox);
    const defs = sandbox.window.TetrisDefs;
    expect(defs, 'window.TetrisDefs 가 정의되지 않음').toBeDefined();

    // 모든 엔트리에 shape 주입
    for (const key of defs.MODULE_KEYS) {
      const shape = defs.MODULE_DEFS[key].shape;
      expect(
        ['DOT', 'LINE', 'L', 'BLOCK', 'OTHER'].includes(shape),
        `${key}: shape='${shape}' — 알 수 없는 분류`,
      ).toBe(true);
    }

    // 대표 분류 샘플
    expect(defs.MODULE_DEFS.HULL_1.shape).toBe('DOT');             // 1셀
    expect(defs.MODULE_DEFS.THRUSTER.shape).toBe('LINE');          // 2셀 직선
    expect(defs.MODULE_DEFS.WPN_RAILGUN.shape).toBe('LINE');       // 3셀 I자
    expect(defs.MODULE_DEFS.WPN_TYPHOON.shape).toBe('L');          // 3셀 L자
    expect(defs.MODULE_DEFS.REINFORCED_HULL.shape).toBe('BLOCK');  // 2×2
    expect(defs.MODULE_DEFS.WPN_OMEGA.shape).toBe('BLOCK');        // 2×2 무기
    expect(defs.MODULE_DEFS.TITAN_HULL.shape).toBe('LINE');        // 수직 I4
    expect(defs.MODULE_DEFS.RESONANCE_CORE.shape).toBe('OTHER');   // 4셀 T자
  });

  /**
   * 6. Phase B-3a — WeaponSystem._applyShapeHooks 탄 단위 비수치 훅
   *    SynergySystem 을 먼저 로드하고, WeaponSystem 을 같은 sandbox 에 로드한 뒤:
   *    - LASER:LINE 활성 → pierceLeft += 2
   *    - ELECTRIC:LINE 활성 → chainCount += 1
   *    - FIRE:L 활성 + splashR>0 → splashR *= 1.3 (splashR=0 탄은 변화 없음)
   *    - ELECTRIC:L 활성 + Math.random 을 0 으로 고정 → damage *= 2.0, isCrit=true
   *    - ELECTRIC:L 활성 + Math.random 을 0.9 로 고정 → damage 그대로, isCrit=false
   */
  it('WeaponSystem._applyShapeHooks 가 4종 훅을 올바르게 적용한다', () => {
    const synJs = readFileSync(resolve(JS_DIR, 'SynergySystem.js'), 'utf8');
    const wpnJs = readFileSync(resolve(JS_DIR, 'WeaponSystem.js'), 'utf8');
    const sandbox = { window: {}, Math: Object.create(Math) };
    createContext(sandbox);
    runInContext(synJs, sandbox);
    runInContext(wpnJs, sandbox);
    const W = sandbox.window.WeaponSystem;
    const S = sandbox.window.SynergySystem;
    expect(W && W._applyShapeHooks, 'WeaponSystem._applyShapeHooks 가 노출되지 않음').toBeTruthy();

    // ── LASER:LINE → pierceLeft +2
    S.reset();
    S.addShapeAttr('LASER', 'LINE');
    const p1 = { active: true, damage: 1, pierceLeft: 0, chainCount: 0, splashR: 0, isCrit: false };
    W._applyShapeHooks(p1);
    expect(p1.pierceLeft).toBe(2);

    // ── ELECTRIC:LINE → chainCount +1 (기존 chain 값 누적)
    S.reset();
    S.addShapeAttr('ELECTRIC', 'LINE');
    const p2 = { active: true, damage: 1, pierceLeft: 0, chainCount: 2, splashR: 0, isCrit: false };
    W._applyShapeHooks(p2);
    expect(p2.chainCount).toBe(3);

    // ── FIRE:L → splashR *= 1.3 (splashR>0 인 탄만)
    S.reset();
    S.addShapeAttr('FIRE', 'L');
    const cannon = { active: true, damage: 1, pierceLeft: 0, chainCount: 0, splashR: 100, isCrit: false };
    const auto   = { active: true, damage: 1, pierceLeft: 0, chainCount: 0, splashR: 0,   isCrit: false };
    W._applyShapeHooks(cannon);
    W._applyShapeHooks(auto);
    expect(cannon.splashR).toBeCloseTo(130, 5);
    expect(auto.splashR).toBe(0);   // 자동무기 탄은 splashR 0 유지

    // ── ELECTRIC:L 크리: Math.random 을 고정해 둘 다 검증
    S.reset();
    S.addShapeAttr('ELECTRIC', 'L');
    // 성공: random=0 → 0<0.25 → 크리
    sandbox.Math.random = () => 0;
    const pCrit = { active: true, damage: 5, pierceLeft: 0, chainCount: 0, splashR: 0, isCrit: false };
    W._applyShapeHooks(pCrit);
    expect(pCrit.damage).toBe(10);
    expect(pCrit.isCrit).toBe(true);
    // 실패: random=0.9 → 크리 미발동
    sandbox.Math.random = () => 0.9;
    const pMiss = { active: true, damage: 5, pierceLeft: 0, chainCount: 0, splashR: 0, isCrit: false };
    W._applyShapeHooks(pMiss);
    expect(pMiss.damage).toBe(5);
    expect(pMiss.isCrit).toBe(false);

    // ── shape 시너지 비활성 → 아무 훅도 적용되지 않음
    S.reset();
    const pNone = { active: true, damage: 1, pierceLeft: 0, chainCount: 0, splashR: 50, isCrit: false, stunDuration: 0 };
    W._applyShapeHooks(pNone);
    expect(pNone.pierceLeft).toBe(0);
    expect(pNone.chainCount).toBe(0);
    expect(pNone.splashR).toBe(50);
    expect(pNone.stunDuration).toBe(0);

    // ── Phase B-3b-1: ELECTRIC:BLOCK → stunDuration = 0.8 (탄 단위 EMP 펄스)
    S.reset();
    S.addShapeAttr('ELECTRIC', 'BLOCK');
    const pStun = { active: true, damage: 1, pierceLeft: 0, chainCount: 0, splashR: 0, isCrit: false, stunDuration: 0 };
    W._applyShapeHooks(pStun);
    expect(pStun.stunDuration).toBeCloseTo(0.8, 5);

    // ── Phase B-3b-1 해제: ELECTRIC:BLOCK 카운트 0 → stunDuration 도 0 으로 리셋 (풀 재사용 보호)
    S.removeShapeAttr('ELECTRIC', 'BLOCK');
    const pStunOff = { active: true, damage: 1, pierceLeft: 0, chainCount: 0, splashR: 0, isCrit: false, stunDuration: 0.8 };
    W._applyShapeHooks(pStunOff);
    expect(pStunOff.stunDuration).toBe(0);
  });

  /**
   * 7. Phase B-3a — WeaponSystem 소스에 17개 발사 지점 + _applyShapeHooks 호출
   *    regression guard: 누군가 새 무기 분기를 추가하면서 훅을 빼먹지 않도록.
   *    (fireCannon + fire + _fireSecondary 의 15개 분기 + nuke_shell 등 = 17)
   */
  it('WeaponSystem 에 _applyShapeHooks 호출이 최소 17곳 이상 존재한다', () => {
    const wpn = readFileSync(resolve(JS_DIR, 'WeaponSystem.js'), 'utf8');
    const calls = wpn.match(/_applyShapeHooks\s*\(\s*p\s*\)\s*;/g) || [];
    expect(calls.length, `_applyShapeHooks 호출: ${calls.length} (기대: ≥17)`).toBeGreaterThanOrEqual(17);
  });

  /**
   * 8. Phase B-3b-1 — EnemyManager.stunEnemy 계약
   *    - 일반 적: stunTimer 는 max(prev, duration) (짧은 펄스로 축소되지 않음)
   *    - 보스 면역 · 비활성 / 잘못된 duration → noop
   *    EnemyManager IIFE 는 top-level 에 외부 전역 참조가 없어 vm 에서 바로 실행 가능.
   */
  it('EnemyManager.stunEnemy 가 보스 면역·덮어쓰기 규칙을 지킨다', () => {
    const js = readFileSync(resolve(JS_DIR, 'EnemyManager.js'), 'utf8');
    const sandbox = { window: {}, console, Math, Date, Object };
    createContext(sandbox);
    runInContext(js, sandbox);
    const EM = sandbox.window.EnemyManager;
    expect(EM && EM.stunEnemy, 'stunEnemy 미노출').toBeTruthy();

    const e = { active: true, isBoss: false, stunTimer: 0 };
    EM.stunEnemy(e, 0.8);
    expect(e.stunTimer).toBeCloseTo(0.8, 5);
    EM.stunEnemy(e, 0.3);           // 더 짧은 펄스는 축소하지 않음
    expect(e.stunTimer).toBeCloseTo(0.8, 5);
    EM.stunEnemy(e, 1.5);           // 더 긴 펄스는 갱신
    expect(e.stunTimer).toBeCloseTo(1.5, 5);

    const boss = { active: true, isBoss: true, stunTimer: 0 };
    EM.stunEnemy(boss, 0.8);
    expect(boss.stunTimer).toBe(0);

    const inactive = { active: false, isBoss: false, stunTimer: 0 };
    EM.stunEnemy(inactive, 1.0);
    expect(inactive.stunTimer).toBe(0);

    const e2 = { active: true, isBoss: false, stunTimer: 0 };
    EM.stunEnemy(e2, 0);
    EM.stunEnemy(e2, -1);
    EM.stunEnemy(null, 0.8);
    expect(e2.stunTimer).toBe(0);
  });

  /**
   * 9. Phase B-3b-1 — WeaponSystem 의 stunEnemy 호출 커버리지
   *    regression guard: cannon / auto / chain / orbit 4경로 모두 연결돼야 한다.
   */
  it('WeaponSystem 이 최소 4곳에서 EnemyManager.stunEnemy 를 호출한다', () => {
    const wpn = readFileSync(resolve(JS_DIR, 'WeaponSystem.js'), 'utf8');
    const calls = wpn.match(/EnemyManager\.stunEnemy\s*\(/g) || [];
    expect(calls.length, `EnemyManager.stunEnemy 호출: ${calls.length} (기대: ≥4 — cannon/auto/chain/orbit)`).toBeGreaterThanOrEqual(4);
  });

  /**
   * 10. Phase B-3b-2 — EnemyManager.applyBurn 계약
   *    - 일반 적 · 보스 모두 대상 (DoT 는 CC 가 아니라 단순 데미지)
   *    - duration / dps 각각 Math.max(prev, new) 로 덮어쓰기 (약한 소스로 축소되지 않음)
   *    - 비활성 / duration<=0 / dps<=0 / null → noop
   */
  it('EnemyManager.applyBurn 이 max 덮어쓰기 규칙을 지키고 보스도 허용한다', () => {
    const js = readFileSync(resolve(JS_DIR, 'EnemyManager.js'), 'utf8');
    const sandbox = { window: {}, console, Math, Date, Object };
    createContext(sandbox);
    runInContext(js, sandbox);
    const EM = sandbox.window.EnemyManager;
    expect(EM && EM.applyBurn, 'applyBurn 미노출').toBeTruthy();

    const e = { active: true, isBoss: false, burnTimer: 0, burnDps: 0 };
    EM.applyBurn(e, 2.0, 3);
    expect(e.burnTimer).toBeCloseTo(2.0, 5);
    expect(e.burnDps).toBe(3);

    // 약한 소스 — 축소 없음
    EM.applyBurn(e, 0.5, 1);
    expect(e.burnTimer).toBeCloseTo(2.0, 5);
    expect(e.burnDps).toBe(3);

    // 더 긴 duration 만 반영
    EM.applyBurn(e, 5.0, 2);
    expect(e.burnTimer).toBeCloseTo(5.0, 5);
    expect(e.burnDps).toBe(3);

    // 더 높은 dps 만 반영
    EM.applyBurn(e, 1.0, 10);
    expect(e.burnTimer).toBeCloseTo(5.0, 5);
    expect(e.burnDps).toBe(10);

    // 보스도 DoT 대상
    const boss = { active: true, isBoss: true, burnTimer: 0, burnDps: 0 };
    EM.applyBurn(boss, 2.0, 3);
    expect(boss.burnTimer).toBeCloseTo(2.0, 5);
    expect(boss.burnDps).toBe(3);

    // 잘못된 인자 — noop
    const e2 = { active: true, isBoss: false, burnTimer: 0, burnDps: 0 };
    EM.applyBurn(e2, 0, 3);
    EM.applyBurn(e2, 2.0, 0);
    EM.applyBurn(e2, -1, 3);
    EM.applyBurn({ active: false, burnTimer: 0, burnDps: 0 }, 2.0, 3);
    EM.applyBurn(null, 2.0, 3);
    expect(e2.burnTimer).toBe(0);
    expect(e2.burnDps).toBe(0);
  });

  /**
   * 11. Phase B-3b-2 — TetrisGrid.hitShip 이 shape 시너지 피격 반사에 연결돼 있음
   *    regression guard: 누군가 hitShip 을 리팩토링하면서 반사 훅을 빼먹지 않도록.
   *    소스에 FIRE:BLOCK → applyBurn / LASER:L → damageEnemy 두 분기가 모두 있어야 한다.
   */
  it('TetrisGrid.hitShip 에 FIRE:BLOCK (applyBurn) + LASER:L (damageEnemy) 반사 분기가 모두 존재한다', () => {
    const src = readFileSync(resolve(JS_DIR, 'TetrisGrid.js'), 'utf8');
    expect(
      /['"]FIRE:BLOCK['"][\s\S]{0,120}applyBurn\s*\(/.test(src),
      'FIRE:BLOCK → applyBurn 분기 누락',
    ).toBe(true);
    expect(
      /['"]LASER:L['"][\s\S]{0,120}damageEnemy\s*\(/.test(src),
      'LASER:L → damageEnemy 분기 누락',
    ).toBe(true);
    // hitShip 시그니처에 attacker 파라미터 존재
    expect(/function\s+hitShip\s*\([^)]*attacker[^)]*\)/.test(src), 'hitShip(attacker) 파라미터 없음').toBe(true);
  });

  /**
   * 12. Phase B-5 — SynergySystem.SHAPE_ICONS export 계약
   *    HUD 가 사용하는 아이콘 맵이 3 shape 모두 포함해야 한다.
   *    (LINE/L/BLOCK — DOT/OTHER 는 shape 시너지 비대상이라 아이콘도 없음)
   */
  it('SynergySystem.SHAPE_ICONS 에 LINE/L/BLOCK 아이콘이 모두 존재한다', () => {
    const js = readFileSync(resolve(JS_DIR, 'SynergySystem.js'), 'utf8');
    const sandbox = { window: {} };
    createContext(sandbox);
    runInContext(js, sandbox);
    const S = sandbox.window.SynergySystem;
    expect(S.SHAPE_ICONS, 'SHAPE_ICONS 미노출').toBeTruthy();
    for (const sh of ['LINE', 'L', 'BLOCK']) {
      expect(
        typeof S.SHAPE_ICONS[sh] === 'string' && S.SHAPE_ICONS[sh].length > 0,
        `SHAPE_ICONS.${sh} 누락 또는 비문자열`,
      ).toBe(true);
    }
  });

  /**
   * 13. Phase B-5 — Game.js _drawSynergyHUD 가 shape 시각화 3요소를 모두 사용
   *    regression guard: HUD 에서 shape 뱃지 · 모양 분포 라인이 빠지지 않도록.
   *    (1) SHAPE_ICONS 참조 (2) getShapeCounts 호출 (3) ef.key 의 ':' 구분 분기
   */
  it('Game.js _drawSynergyHUD 가 SHAPE_ICONS / getShapeCounts / key split(":") 를 모두 사용한다', () => {
    const src = readFileSync(resolve(JS_DIR, 'Game.js'), 'utf8');
    expect(/SHAPE_ICONS/.test(src), 'Game.js 에 SHAPE_ICONS 참조 없음').toBe(true);
    expect(/getShapeCounts\s*\(/.test(src), 'Game.js 에 getShapeCounts 호출 없음').toBe(true);
    // shape 뱃지 분기: ef.key 의 ':' 존재 여부로 분기
    expect(
      /ef\.key[\s\S]{0,80}(indexOf\s*\(\s*['"]:['"]\s*\)|includes\s*\(\s*['"]:['"]\s*\)|split\s*\(\s*['"]:['"]\s*\))/.test(src),
      'Game.js _drawSynergyHUD 에 shape 뱃지 분기(ef.key 의 ":" 검사) 없음',
    ).toBe(true);
  });
});
