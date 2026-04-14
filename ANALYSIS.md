# JNJD 프로젝트 진척 분석 (gstack 방법론 기반)

> **작성일**: 2026-04-13 / **대상**: v1.2.2 / **브랜치**: `claude/analyze-jnjd-progress-jlu2J`
> **방법론**: [gstack](https://github.com/BAKO-o/gstack) 5개 렌즈

---

## 목차
0. [Dashboard](#0-executive-dashboard) · 1. [Retro](#1-회고--retro-스타일) · 2. [Eng](#2-엔지니어링-리뷰--plan-eng-review-스타일) · 3. [Product](#3-프로덕트-리뷰--plan-ceo-review-스타일) · 4. [QA](#4-qa-평가--qa-스타일) · 5. [권고](#5-개선-권고-prioritized) · A·B·C *(TBD)*

---

## 0. Executive Dashboard

### TL;DR
JNJD는 **4일(2026-03-13~16)만에 v0.9.2→v1.2.2 폭발 개발** 후 **28일 정지**. Phase 1~4 100% + 계획 외 200% 확장. 그러나 TetrisGrid.js 1,860 LOC 단일 파일, CLAUDE.md 완전 무효(이전 개미 게임 지시문), 테스트 0개. 다음 과제: **"기능 추가 중단, 문서·구조 복구"**.

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
외부 라이브러리·에셋 0개 · Object Pooling · 커밋 메시지 품질 · SemVer · 비주얼 의지 · 반응적 밸런싱

### 1.4 Improve
🚨 28일 정지 · 단일 파일 쏠림 · 🚨 CLAUDE.md 무효 · 브랜치 전략 부재 · 결정 로그 부재 · FPS 실측 부재 · 버전 위치 불일치

### 1.5 Hotspot
TetrisGrid 15+ · Game 15+ · Renderer 10+ · EnemyManager 8+ · index.html 8+
Per-author: Claude ~35 / BAKO-o ~5 (solo + AI).

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
ModuleRegistry(400) + PlacementEngine(350) + DragDrop(250) + HitboxCalc(200) + Inventory(200) + BuildUI(400) + facade(60). **평균 ~260 LOC/파일 (7배 감소)**. CC 45분.

### 2.4 성능
- 적용됨: Object Pool, frustum culling, wraparound ghost
- 🚨 측정 0개 — DoD "60FPS" 검증 수단 없음
- 핫스팟 후보: `_separateEnemies` O(n²), 선형 pool 스캔, 9-copy ghost
- 권고: F3 FPS 오버레이 (CC 15m)

### 2.5 기술 부채
P0 3건 · P1 6건 · P2 5건. 누적 해소 CC ~8시간 / human ~3주.

---

## 3. 프로덕트 리뷰 — /plan-ceo-review 스타일

### 3.1 Premise Challenge
두 장르 중독 요소 중 **섭취는 ✅·리텐션 훅은 ❌**. Tetris는 40년간 메타 없이 리텐션 — JNJD가 그 길을 가려면 **세션 내 즉각 의사결정 밀도** 필요하나 조립은 일시정지 구조.

### 3.2 10-star 정의 (12개 중 1개 달성)
✅ Build variety · ❌ 메타·Summary·하이스코어·Daily·Endless·사운드·Save·Accessibility·Gamepad·내레이션

### 3.3 저비용 고임팩트 (CC ~1.5시간)
1. **Run Summary** (CC 20m) · 2. **localStorage 하이스코어** (CC 10m) · 3. **WebAudio SFX 8종** (CC 45m) · 4. **스테이지 내레이션** (CC 20m)

### 3.4 Focus-as-Subtraction
30종 모듈 → 15종 · 환경 위험 4종 축소 · 적 티어 변형 축소 · 조합 8→5

### 3.5 Temporal Depth
**Focus question:** 다음 28일 딱 하나만? → **Run Summary + localStorage**. 이유: "다시 켤 이유"를 최저 비용 해결.

---

## 4. QA 평가 — /qa 스타일

### 4.1 버그 이력 (커밋 고고학)
v1.2.2 스테이지 연쇄 · v1.1.x 웨이브 진행 · v1.0.1 시너지 과다 · v0.9.4 HP 남용 제거 · v0.9.2 적 군집. 패턴: **상태 전이 + 밸런싱**.

### 4.2 테스트 갭
테스트 0 · package.json 0 · CI 0 · 수동 QA 체크리스트 0. 권고: Vitest + 3개 스모크 (placement/synergy/stage-transition) CC 20m.

### 4.3 CLAUDE.md 무효 증거
`main.js` 없음 · "식민지 경제" · "개미 FSM" · `colony.js` 존재 안 함 — **0% 일치**. 다음 AI 세션 오작동 위험.

### 4.4 프로세스 갭
Issues 0 · PRs 극소수 · Labels 기본 · Milestones 0 · Releases 본문 빈 상태. 권고: Issues 활성화 + 템플릿 3종 + CHANGELOG.md.

### 4.5 QA 종합: **1.2/10** — 프로덕션 진입 전 최우선 복구 영역.

---

## 5. 개선 권고 (Prioritized)

gstack 원칙 — 작은 배치 · 증거 기반 · "당장 해소 가능한 것부터". 각 항목 **[human 공수] / [CC+gstack 공수]** 표기. Human 팀 ~2주 규모가 CC 기준 ~5시간 (약 50배 압축).

### P0 — Critical (1~3일 내)

**영향도: 프로젝트 계속 진행 가능성 자체에 직결.**

| # | 항목 | Human | CC | 이유 |
|---|---|---|---|---|
| P0-1 | **CLAUDE.md 전면 재작성** | 2h | 15m | 다음 AI 세션이 개미 게임 지시문을 따라 잘못된 수정을 시도할 위험. 가장 저비용 고임팩트. |
| P0-2 | **TetrisGrid.js 6-모듈 분할** | 1d | 45m | 81KB 단일 파일이 리팩토링·버그 수정 자체를 차단. ModuleRegistry / PlacementEngine / DragDrop / HitboxCalc / Inventory / BuildUI + facade. |
| P0-3 | **Vitest 세팅 + 스모크 3개** | 4h | 20m | 테스트 0인 상태에서 P0-2 분할은 위험. 안전망 먼저. |
| P0-4 | **버전 상수 위치 통일** | 30m | 5m | CLAUDE.md는 `main.js:3` 참조하나 `main.js` 부재. `README.md` + `index.html <title>` + `package.json` 3곳 동기화 방안 결정. |

**P0 합계:** Human ~1.5일 / CC ~85분.

### P1 — Important (1~2주 내)

**영향도: 품질·생산성에 직결하나 1~2주 내 미해결도 작동함.**

| # | 항목 | Human | CC | 이유 |
|---|---|---|---|---|
| P1-1 | **config.js 실사용화** | 4h | 15m | 현재 빈 껍데기. 30종 모듈·25종 적·5 스테이지 튜닝 상수를 중앙화. |
| P1-2 | **Game.js god-object 분해** | 2d | 1h | 1,015 LOC. StateMachine / Loop / Pause / HUD 분리. |
| P1-3 | **Renderer.js OCP 리팩토링** | 1d | 45m | 1,222 LOC. 렌더 객체별 `draw()` 위임. |
| P1-4 | **F3 FPS 오버레이 + Performance.now 측정** | 2h | 15m | DoD "60FPS" 검증 수단. |
| P1-5 | **package.json + npm scripts** | 1h | 10m | 의존성·스크립트·메타데이터 표준화. |
| P1-6 | **DEVELOPMENT_PLAN.md Phase 5+ 확장** | 2h | 20m | 계획 외 확장 200%를 계획 안으로 끌어들임. |

**P1 합계:** Human ~4일 / CC ~3시간.

### P2 — Nice-to-have (1개월 내)

| # | 항목 | Human | CC | 이유 |
|---|---|---|---|---|
| P2-1 | **GitHub Issues + 템플릿 3종** | 1h | 5m | 결정 로그·로드맵 가시성. |
| P2-2 | **PR 템플릿 + CI 워크플로** | 3h | 20m | `.github/workflows/test.yml` 20줄. |
| P2-3 | **index.html CSS 분리** | 4h | 15m | 24KB 단일 HTML. `styles.css` 추출. |
| P2-4 | **Player ↔ TetrisGrid 역의존 제거** | 4h | 30m | 이벤트 버스 또는 콜백 주입. |
| P2-5 | **CHANGELOG.md 자동 생성** | 1h | 15m | 커밋 메시지 기반 git-cliff 또는 수동. |

**P2 합계:** Human ~2일 / CC ~85분.

### P3 — Future Vision (분기 단위)

| # | 항목 | Human | CC | 이유 |
|---|---|---|---|---|
| P3-1 | **Run Summary 화면** | 1d | 20m | 10-star 갭 최대 임팩트. "다시 켤 이유". |
| P3-2 | **localStorage 하이스코어 + Leaderboard** | 4h | 15m | 동일 목적 지원. |
| P3-3 | **WebAudio 절차 SFX 8종** | 2d | 45m | 외부 에셋 0 제약 유지. |
| P3-4 | **메타 프로그레션 (언락·함선)** | 1w | 3h | 장르 믹스 리텐션 훅. |
| P3-5 | **itch.io 공개 배포** | 3d | 1h | 제품 아이덴티티 확립. 6개월 궤적의 핵심 마일스톤. |

**P3 합계:** Human ~3주 / CC ~5시간.

### 전체 압축 요약

| 우선순위 | Human | CC+gstack | 압축비 |
|---|---|---|---|
| P0 | 1.5일 | 85분 | ~10x |
| P1 | 4일 | 3시간 | ~10x |
| P2 | 2일 | 85분 | ~14x |
| P3 | 3주 | 5시간 | ~25x |
| **전체** | **~5주** | **~10시간** | **~30x** |

**해석:** CC+gstack 집중 1일이면 P0+P1+P2 완수 (Human 기준 ~2주), CC 2일이면 P3까지 (Human 기준 ~5주). **시간이 아니라 우선순위·집중이 병목.**

### 실행 순서 제안

```
Day 1 (CC ~2h):  P0-1 → P0-4 → P0-3 → P0-2
                 (재작성 → 동기화 → 안전망 → 대공사)
Day 2 (CC ~3h):  P1-5 → P1-1 → P1-4 → P1-2 → P1-3
                 (package → config → FPS → god-object → renderer)
Day 3 (CC ~2h):  P1-6 → P2 전체
                 (계획 복구 → 인프라 잡일 배치 처리)
Day 4~5 (CC ~5h): P3-1 → P3-2 → P3-3 → 그 외
                 (다시 켤 이유 → 기록 → 사운드 → 비전)
```

**중간 배포 계획:** P0 완료 시점에 `v1.3.0` 태그 — "Rebuild foundations". P2 완료 시점 `v1.4.0` — "Process hardened". P3-1~P3-3 시점 `v1.5.0` — "Retention loop". P3-4~P3-5 시점 `v2.0.0` — "Public release".

---

## 부록 A·B·C *(TBD)*

---

*점진 작성 중.*
