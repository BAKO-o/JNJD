# 5. 개선 권고 (Prioritized)

> [← 인덱스로 돌아가기](../ANALYSIS.md)

공수 표기: **Human** = 단독 개발자 실제 작업 시간 / **CC** = Claude Code + gstack 방법론 활용 시 예상 시간.

## P0 — Critical (1~3일)

| # | 항목 | Human | CC | 근거 |
|---|---|---|---|---|
| P0-1 | **CLAUDE.md 전면 재작성** | 2h | 15m | 현재 100% 무효. 다음 세션 오작동 위험 |
| P0-2 | **TetrisGrid.js 6-모듈 분할** | 1d | 45m | 1,860 LOC god-object, hotspot 1위 |
| P0-3 | **Vitest + 스모크 테스트 3개** | 4h | 20m | 테스트 0개 → 회귀 방어막 부재 |
| P0-4 | **버전 상수 위치 통일** | 30m | 5m | CLAUDE.md 참조 위치 존재하지 않음 |

## P1 — Important (1~2주)

| # | 항목 | Human | CC | 근거 |
|---|---|---|---|---|
| P1-1 | config.js 실사용화 | 4h | 15m | 현재 빈 껍데기, 밸런싱 값 하드코딩 |
| P1-2 | Game.js god-object 분해 (EventBus·StageFSM·ScoreTracker) | 2d | 1h | 8책임 집중, hotspot 2위 |
| P1-3 | Renderer.js OCP 리팩토링 (RenderLayer 인터페이스) | 1d | 45m | 엔티티 추가마다 renderer 수정 |
| P1-4 | F3 FPS 오버레이 (frame time + 엔티티 수) | 2h | 15m | DoD "60FPS" 검증 불가 |
| P1-5 | package.json + npm scripts | 1h | 10m | npm 생태계 활용 기반 |
| P1-6 | DEVELOPMENT_PLAN.md Phase 5+ 갱신 | 2h | 20m | 실제 구현이 Phase 4 훨씬 초과 |

## P2 — Nice-to-have (1개월)

| # | 항목 | Human | CC | 근거 |
|---|---|---|---|---|
| P2-1 | Issue 템플릿 3종 (bug/feat/chore) + Labels | 1h | 5m | 작업 추적 기반 |
| P2-2 | PR 템플릿 + GitHub Actions CI (lint + test) | 3h | 20m | 단독 개발이라도 self-review |
| P2-3 | index.html CSS 분리 (외부 `style.css`) | 4h | 15m | 24KB 파일, 인라인 CSS 다수 |
| P2-4 | Player → TetrisGrid 역의존 제거 (이벤트 기반) | 4h | 30m | 결합도 감소 |
| P2-5 | CHANGELOG.md 자동 생성 (git log → Keep a Changelog) | 1h | 15m | 28일 후 재개 시 복원 수단 |

## P3 — Future Vision (분기)

| # | 항목 | Human | CC | 근거 |
|---|---|---|---|---|
| P3-1 | Run Summary 화면 | 1d | 20m | 10-star 요소 1 (최상) |
| P3-2 | localStorage 하이스코어 | 4h | 15m | 10-star 요소 2 (상) |
| P3-3 | WebAudio 절차 SFX 8종 | 2d | 45m | 10-star 요소 3 (상), 에셋 0 유지 |
| P3-4 | 메타 프로그레션 (영구 언락) | 1w | 3h | 리텐션 훅 핵심 |
| P3-5 | itch.io 공개 배포 | 3d | 1h | 6개월 궤적의 목표 |

## 전체 공수 합계

| 우선순위 | Human | CC | 압축률 |
|---|---|---|---|
| P0 (4건) | 1일 7시간 | 1시간 25분 | ~18x |
| P1 (6건) | 5일 3시간 | 2시간 45분 | ~16x |
| P2 (5건) | 1일 5시간 | 1시간 25분 | ~15x |
| P3 (5건) | 3주 6일 | 5시간 20분 | ~80x |
| **합계** | **~5주 (human)** | **~10시간 (CC)** | **~30x** |

## 추천 실행 순서

1. **Week 1:** P0 전부 → 다음 세션 오작동 차단 + 구조 건강화
2. **Week 2:** P1-5, P1-1, P1-4 → npm 생태계 + config 정돈 + 측정 수단
3. **Week 3~4:** P1-2, P1-3 → god-object 해소
4. **Month 2:** P3-1, P3-2 → 리텐션 훅 최소 세트
5. **Month 3~:** P2 잔여 + P3-3~5 → 공개 준비

---

*— 권고 끝.*
