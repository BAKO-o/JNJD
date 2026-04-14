/**
 * version.js — JNJD 버전 상수의 단일 소스 (P0-4)
 *
 * 이 파일은 index.html 에서 모든 다른 스크립트보다 먼저 로드됨.
 * 다른 스크립트는 `window.JNJD_VERSION` 을 참조해야 함.
 *
 * SemVer 규칙 (CLAUDE.md 2.1 참조):
 *   MAJOR: 게임 규칙 변경
 *   MINOR: 신기능
 *   PATCH: 버그 수정·밸런싱
 *
 * 변경 이력 코멘트는 이 줄 옆에 유지 (git log 와 중복 OK).
 */
'use strict';

window.JNJD_VERSION = 'v1.2.2'; // 원형 함선, 미사일 포탄, 스테이지 연쇄클리어 버그 수정

// 레거시 호환: Game.js line 12의 `const VERSION` 이 아직 존재하는 동안 이중 참조 허용.
// v1.3에서 Game.js 가 이 전역을 읽도록 마이그레이션 예정.
