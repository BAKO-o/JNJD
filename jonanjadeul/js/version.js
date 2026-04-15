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

window.JNJD_VERSION = 'v1.3.0'; // P0-2: TetrisGrid.js → tetris/ 서브모듈 분할 (−59.0% LOC)

// Game.js 는 이 전역(window.JNJD_VERSION)을 단일 소스로 사용한다.
// 새 버전 배포 시 이 파일 한 줄만 수정하면 됨.
