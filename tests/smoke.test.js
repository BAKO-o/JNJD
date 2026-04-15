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
});
