/**
 * Vitest 설정 — JNJD 스모크 테스트용
 *
 * 게임 본체는 IIFE + window 전역 패턴이라 모듈 테스트가 불가.
 * 따라서 초기 스모크 테스트는 "파일 구조 + 핵심 상수 존재 여부"에 국한.
 * 추후 TetrisGrid 6-분할(P0-2) 이후 실제 단위 테스트로 확장.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    globals: false,
    reporters: ['default'],
  },
});
