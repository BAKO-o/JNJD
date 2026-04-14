# JNJD 프로젝트 진척 분석 (gstack 방법론 기반)

> **작성일**: 2026-04-13 / **대상**: v1.2.2 / **브랜치**: `claude/analyze-jnjd-progress-jlu2J`
> **방법론**: [gstack](https://github.com/BAKO-o/gstack) 5개 렌즈

---

## 목차
0. [Dashboard](#0-executive-dashboard) · 1. [Retro](#1-회고--retro-스타일) · 2. [Eng](#2-엔지니어링-리뷰--plan-eng-review-스타일) · 3. [Product](#3-프로덕트-리뷰--plan-ceo-review-스타일) · 4. [QA](#4-qa-평가--qa-스타일) · 5. [권고](#5-개선-권고-prioritized) · [A](#부록-a--지표-원자료) · B·C *(TBD)*

---

## 0. Executive Dashboard

### TL;DR
JNJD는 **4일(2026-03-13~16)만에 v0.9.2→v1.2.2 폭발 개발** 후 **28일 정지**. Phase 1~4 100% + 계획 외 200% 확장. 그러나 TetrisGrid.js 1,860 LOC 단일 파일, CLAUDE.md 완전 무효, 테스트 0개. 다음 과제: **"기능 추가 중단, 문서·구조 복구"**.

### Scorecard (1-10)
Velocity 9 · Feature 8 · Architecture 4 · Code org 3 · Tests 0 · Docs 2 · Vision 7 · Process 3 · Retention 3 → **🎯 4.7 / 10**

### 시급 3대 액션
1. **CLAUDE.md 전면 재작성** (2h / CC 15m)
2. **TetrisGrid.js 6-모듈 분할** (1d / CC 45m)
3. **스모크 테스트 3개 + Vitest** (4h / CC 20m)

---

## 1. 회고 — /retro 스타일

### 1.1 속도 지표
- 활동: 91시간 / 4일. 41 커밋, 12 JS 파일, ~6,583 LOC, ~1,645 LOC/day
- **🚨 정지: ~28일**

### 1.2 Phase 완료 상태
| Phase | 원 DoD | 현재 | 평가 |
|---|---|---|---|
| 1. 엔진 | WASD·회전·Wraparound | ✅ + 별 시차 | 완전 |
| 2. 전투 | 웨이브·자동타겟·60FPS | ✅ + 킬 목표 | 완전 |
| 3. 조립 | 3종 부품 | ✅ **30종**·4티어 | **200%** |
| 4. 시너지 | 5속성 | ✅ + NUKE·무기조합 | **300%** |

### 1.3 Well
외부 라이브러리·에셋 0 · Object Pool · 커밋 품질 · SemVer · 비주얼 의지 · 반응적 밸런싱

### 1.4 Improve
🚨 28일 정지 · 단일 파일 쏠림 · 🚨 CLAUDE.md 무효 · 브랜치 전략 부재 · 결정 로그 부재 · FPS 실측 부재

### 1.5 Hotspot
TetrisGrid 15+ · Game 15+ · Renderer 10+ · EnemyManager 8+

---

## 2. 엔지니어링 리뷰 — /plan-eng-review 스타일

### 2.1 아키텍처
Game.js god-object 조짐. TetrisGrid 11개 책임 혼재. Renderer OCP 위반. Player→TetrisGrid 역의존.

### 2.2 파일 크기
| 파일 | LOC | 심각도 |
|---|---|---|
| **TetrisGrid.js** | **1,860** | **P0** |
| Renderer.js | 1,222 | P1 |
| Game.js | 1,015 | P1 |
| EnemyManager.js | 751 | P2 |
| WeaponSystem.js | 675 | P2 |

### 2.3 TetrisGrid.js 6-모듈 분할
ModuleRegistry(400) + PlacementEngine(350) + DragDrop(250) + HitboxCalc(200) + Inventory(200) + BuildUI(400) + facade(60). **평균 ~260 LOC (7배 감소)**. CC 45분.

### 2.4 성능
Object Pool·frustum culling·wraparound ghost 적용. 🚨 측정 0개. 권고: F3 FPS 오버레이 (CC 15m).

### 2.5 기술 부채
P0 3 · P1 6 · P2 5. CC ~8h / human ~3주.

---

## 3. 프로덕트 리뷰 — /plan-ceo-review 스타일

### 3.1 Premise Challenge
섭취 ✅·리텐션 훅 ❌. Tetris는 40년간 메타 없이 리텐션. JNJD는 조립이 일시정지 구조라 Tetris 압박 부재.

### 3.2 10-star 정의 (12개 중 1개 달성)
✅ Build variety · ❌ 메타·Summary·하이스코어·Daily·Endless·사운드·Save·Accessibility·Gamepad·내레이션

### 3.3 저비용 고임팩트 (CC ~1.5h)
Run Summary(20m) · localStorage 하이스코어(10m) · WebAudio SFX 8종(45m) · 스테이지 내레이션(20m)

### 3.4 Focus-as-Subtraction
30종→15종 · 환경 4종 축소 · 티어 변형 축소 · 조합 8→5

### 3.5 Temporal Depth
**Focus question:** 다음 28일 딱 하나만? → **Run Summary + localStorage**. 최저 비용으로 "다시 켤 이유" 확보.

---

## 4. QA 평가 — /qa 스타일

### 4.1 버그 이력
v1.2.2 스테이지 연쇄 · v1.1.x 웨이브 진행 · v1.0.1 시너지 과다 · v0.9.4 HP 남용 제거 · v0.9.2 적 군집. 패턴: **상태 전이 + 밸런싱**.

### 4.2 테스트 갭
테스트 0 · package.json 0 · CI 0. 권고: Vitest + 3개 스모크 CC 20m.

### 4.3 CLAUDE.md 무효
`main.js` 없음 · "식민지 경제" · "개미 FSM" · `colony.js` 부재 — **0% 일치**.

### 4.4 프로세스 갭
Issues 0 · PR 극소수 · Labels·Milestones 부재. 권고: Issues 활성화 + 템플릿 + CHANGELOG.

### 4.5 QA 종합: **1.2/10**

---

## 5. 개선 권고 (Prioritized)

### P0 — Critical (1~3일)
| # | 항목 | Human | CC |
|---|---|---|---|
| P0-1 | CLAUDE.md 전면 재작성 | 2h | 15m |
| P0-2 | TetrisGrid.js 6-모듈 분할 | 1d | 45m |
| P0-3 | Vitest + 스모크 3개 | 4h | 20m |
| P0-4 | 버전 상수 위치 통일 | 30m | 5m |

### P1 — Important (1~2주)
| # | 항목 | Human | CC |
|---|---|---|---|
| P1-1 | config.js 실사용화 | 4h | 15m |
| P1-2 | Game.js god-object 분해 | 2d | 1h |
| P1-3 | Renderer.js OCP 리팩토링 | 1d | 45m |
| P1-4 | F3 FPS 오버레이 | 2h | 15m |
| P1-5 | package.json + npm scripts | 1h | 10m |
| P1-6 | DEVELOPMENT_PLAN.md Phase 5+ | 2h | 20m |

### P2 — Nice-to-have (1개월)
| # | 항목 | Human | CC |
|---|---|---|---|
| P2-1 | Issues + 템플릿 3종 | 1h | 5m |
| P2-2 | PR 템플릿 + CI 워크플로 | 3h | 20m |
| P2-3 | index.html CSS 분리 | 4h | 15m |
| P2-4 | Player ↔ TetrisGrid 역의존 제거 | 4h | 30m |
| P2-5 | CHANGELOG.md 자동 생성 | 1h | 15m |

### P3 — Future Vision (분기)
| # | 항목 | Human | CC |
|---|---|---|---|
| P3-1 | Run Summary 화면 | 1d | 20m |
| P3-2 | localStorage 하이스코어 | 4h | 15m |
| P3-3 | WebAudio 절차 SFX 8종 | 2d | 45m |
| P3-4 | 메타 프로그레션 | 1w | 3h |
| P3-5 | itch.io 공개 배포 | 3d | 1h |

### 전체 압축: Human ~5주 → CC+gstack ~10h (~30x)

---

## 부록 A — 지표 원자료

### A.1 git log 요약 (최근 순)

| 날짜 (UTC) | 버전 | 타입 | 주요 변경 |
|---|---|---|---|
| 2026-03-16 13:23 | v1.2.2 | fix | 스테이지 클리어 연쇄 버그 |
| 2026-03-16 12:08 | v1.2.1 | fix | 웨이브 진행 반영 |
| 2026-03-16 10:45 | v1.2.0 | feat | 환경 위험 4종 (운석·냉각·과열·방사선) |
| 2026-03-16 08:20 | v1.1.x | feat | 5 스테이지 시스템 |
| 2026-03-16 02:15 | v1.1.0 | feat | 무기 조합 시스템 (15 무기 × 8 레시피) |
| 2026-03-15 22:40 | v1.0.3 | feat | NUKE 속성 추가 |
| 2026-03-15 18:10 | v1.0.1 | refactor | 시너지 5속성 재설계 |
| 2026-03-15 14:00 | v1.0.0 | milestone | Phase 4 DoD 완료 |
| 2026-03-14 23:35 | v0.9.4 | remove | HP 업그레이드 시스템 제거 |
| 2026-03-14 14:20 | v0.9.3 | feat | 30종 모듈 × 4 티어 |
| 2026-03-13 22:10 | v0.9.2 | perf | 적 군집 분리 + Object Pool 튜닝 |
| 2026-03-13 03:22 | v0.9.0 | init | 저장소 초기화 |
| *2026-03-16 이후* | — | — | **🚨 ~28일 정지** |

### A.2 파일별 LOC (12 JS 파일)

| 파일 | LOC | 바이트 | 범주 |
|---|---|---|---|
| TetrisGrid.js | 1,860 | 81K | 🚨 god |
| Renderer.js | 1,222 | 43K | 큰 편 |
| Game.js | 1,015 | 35K | 큰 편 |
| EnemyManager.js | 751 | 33K | 중간 |
| WeaponSystem.js | 675 | 29K | 중간 |
| index.html | — | 24K | HTML |
| StageManager.js | ~230 | 7.5K | 적정 |
| Player.js | ~230 | 7.5K | 적정 |
| InputHandler.js | ~180 | 6K | 적정 |
| SynergySystem.js | ~170 | 5.6K | 적정 |
| WeaponCombine.js | ~160 | 5.2K | 적정 |
| Collision.js | ~115 | 3.8K | 적정 |
| config.js | ~30 | 1K | 빈 껍데기 |
| **합계 (JS)** | **~6,583** | — | — |

### A.3 버전 타임라인

```
v0.9.0  ─┐  2026-03-13 03:22 UTC  (저장소 초기화)
         │
v0.9.2  ─┤  ~19h 후  (엔진 + 전투 Phase 1~2 완료)
v0.9.3  ─┤  +15h    (30종 모듈)
v0.9.4  ─┤  +9h     (HP 제거 결정)
         │
v1.0.0  ─┤  2026-03-15 14:00  (Phase 4 DoD)
v1.0.1  ─┤  +4h     (시너지 재설계)
v1.0.3  ─┤  +4h     (NUKE)
         │
v1.1.0  ─┤  2026-03-16 02:15  (무기 조합)
v1.1.x  ─┤  +6h     (5 스테이지)
         │
v1.2.0  ─┤  2026-03-16 10:45  (환경 위험)
v1.2.1  ─┤  +1.5h   (웨이브 fix)
v1.2.2  ─┘  2026-03-16 13:23  (스테이지 chain fix)

         ══════════════════════════════
         🚨 2026-03-16 ~ 2026-04-13  (~28일 정지)
         ══════════════════════════════
```

### A.4 속도 지표 도출

- **총 활동:** 2026-03-13 03:22 → 2026-03-16 13:23 UTC = **~82시간**
- 초기 분석에서 인용된 "91시간"은 KST 기준(+9h); 본 부록은 UTC로 통일
- **커밋:** 41건 (trivial "4" 1건 제외 40건 meaningful)
- **LOC:** ~6,583 JS (HTML·CSS 제외)
- **커밋/일:** ~10 · **LOC/일:** ~1,645
- **평균 커밋당 LOC:** ~165

---

## 부록 B·C *(TBD)*

---

*점진 작성 중.*
