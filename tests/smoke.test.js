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
   * 3. TetrisGrid.js god-object 감지
   *    4,000 LOC 돌파 시 실패 → 리팩터 미루기 방지용 압력 장치
   *    (현재 ~1,860 LOC · P0-2 분할 후 이 테스트는 파일별로 세분화 예정)
   */
  it('TetrisGrid.js 는 god-object 상한선(4,000 LOC)을 넘지 않는다', () => {
    const content = readFileSync(resolve(JS_DIR, 'TetrisGrid.js'), 'utf8');
    const lines = content.split('\n').length;
    expect(lines, `현재 ${lines} LOC — P0-2 리팩터를 서두르세요`).toBeLessThan(4000);
  });
});
