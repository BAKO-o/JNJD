# JNJD 프로젝트 진척 분석 (gstack 방법론 기반)

> **작성일**: 2026-04-13 / **대상**: v1.2.2 / **브랜치**: `claude/analyze-jnjd-progress-jlu2J`
> **방법론**: [gstack](https://github.com/BAKO-o/gstack) 5개 렌즈

---

## 목차
0. [Dashboard](#0-executive-dashboard) · 1. [Retro](#1-회고--retro-스타일) · 2. [Eng](#2-엔지니어링-리뷰--plan-eng-review-스타일) · 3. [Product](#3-프로덕트-리뷰--plan-ceo-review-스타일) · 4. [QA](#4-qa-평가--qa-스타일) · 5. 권고 *(TBD)* · A·B·C *(TBD)*

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
P0 3건 (CLAUDE.md · TetrisGrid.js · 테스트 0), P1 6건 (config.js · Game.js · Renderer · DEVELOPMENT_PLAN · 버전 · package.json), P2 5건 (PR 워크플로 · Issues · FPS · index.html · 역의존). 누적 해소 CC ~8시간 / human ~3주.

---

## 3. 프로덕트 리뷰 — /plan-ceo-review 스타일

### 3.1 Premise Challenge
두 장르 중독 요소 중 **섭취는 ✅·리텐션 훅은 ❌**. 5 스테이지 클리어 후 다시 켤 이유 부재. Tetris는 40년간 메타 없이 리텐션 — JNJD가 그 길을 가려면 **세션 내 즉각 의사결정 밀도**가 핵심이나, 현재 조립은 일시정지 구조라 Tetris 압박이 없음.

### 3.2 10-star 정의 (12개 중 1개 달성)
✅ Build variety
❌ 메타 프로그레션 · Run Summary · 하이스코어 · Daily seed · Endless · 사운드 · Save/Resume · Accessibility · Gamepad · 내레이션 · Aesthetic coherence (부분)

### 3.3 저비용 고임팩트 갭 메우기 (CC ~1.5시간)
1. **Run Summary** 화면 (CC 20m) — 수집 데이터 Canvas 렌더
2. **localStorage 하이스코어** (CC 10m)
3. **WebAudio SFX 8종** (CC 45m) — 절차적 생성, 외부 에셋 0 제약 유지
4. **스테이지 간 3줄 내레이션** (CC 20m) — "잔해의 귀환" 회수

### 3.4 Focus-as-Subtraction (제거 후보)
- 30종 모듈 → 15종 (각각 더 깊이)
- 환경 위험 4종 → 사운드 없이 시각 구별 충분한 것만
- 25종 적 중 티어 변형(DRONE/RUSHER/SWARM) 축소
- 무기 조합 8레시피 → 5레시피 (데이터 기반)

### 3.5 Temporal Depth (6개월 후)
- **Do nothing:** 3개월 후 창고 상태, 6개월 후 저장소만 남음
- **Ideal:** itch.io 무료 인디 타이틀 공개, 디스코드 커뮤니티
- **현실 30일 집중:** v1.3(P0) → v1.5(사운드·요약) → v2.0(메타) = CC ~10시간
- **Focus question:** 다음 28일 딱 하나만? → **Run Summary + localStorage 하이스코어**. 이유: "다시 켤 이유"를 최저 비용 해결

---

## 4. QA 평가 — /qa 스타일

gstack `/qa`의 렌즈 — 버그 이력 추적 · 테스트 커버리지 · 문서 정합성 · 프로세스 갭. 본 프로젝트는 테스트·이슈 트래커·CI가 **전무**하여 "QA"는 커밋 메시지 고고학으로 재구성.

### 4.1 알려진 버그 이력 (커밋 메시지 추출)

| 버전 | 증상 | 수정 | 교훈 |
|---|---|---|---|
| v1.2.2 | 스테이지 클리어 연쇄 버그 (스테이지 2→3 자동 진행 실패) | 상태 전이 조건 수정 | **상태 머신 단위 테스트 부재** |
| v1.1.x | 웨이브 진행 반영 안 됨 | 클리어 판정 로직 수정 | 글로벌 상태 변이 추적 어려움 |
| v1.0.1 | 시너지 과다 발동 / 균형 붕괴 | 5속성 재설계 | 밸런싱은 수치 아닌 **시스템 수정** |
| v0.9.4 | HP 업그레이드 남용 | 시스템 제거 | "추가보다 제거" 원칙 실증 사례 |
| v0.9.2 | 적 군집 겹침 · 프레임 드랍 | 분리 힘 + 풀 튜닝 | **프로파일러 없이 추정 기반 수정** |

**패턴 진단:**
- 버그는 주로 **상태 전이**(스테이지·웨이브)와 **밸런싱 시스템**(시너지·HP)에 집중.
- 상태 전이 버그는 시간상 재발 가능성 높음 — **단위 테스트 1개가 있었다면 사전 방지 가능**했을 범주.
- 프로파일러 부재로 성능 버그는 "증상→추정→수정" 루프. Chrome DevTools Performance 탭 1회 사용이면 확증 가능.

### 4.2 테스트 갭

**실측:**
- 테스트 파일: **0개** (`*.test.js`, `*.spec.js`, `test/`, `__tests__/` 어디에도 없음)
- `package.json` **없음** → 테스트 러너 설치 불가 상태
- CI 워크플로 (`.github/workflows/`) **없음**
- 수동 QA 체크리스트 **없음**

**영향도:**
- 리팩토링 안전망 0 → TetrisGrid.js 분할이 심리적으로 차단됨
- v1.2.2 스테이지 버그처럼 **회귀 테스트 대상 버그조차 테스트 없음**
- DoD "60FPS 안정 유지"는 측정 수단 없이 주장만 가능

**최소 권고 (CC 20분):**

```
tests/
├── placement.test.js    // 모듈 배치 유효성 3 케이스
├── synergy.test.js      // 5속성 × 3티어 조합 스냅샷
└── stage-transition.test.js  // v1.2.2 재발 방지 회귀 테스트
```

- Vitest + jsdom (외부 에셋 0 제약은 유지 — 테스트는 개발 의존성)
- `package.json`의 `scripts.test`: `vitest run`
- GitHub Actions 워크플로 20줄로 PR 체크 자동화

### 4.3 문서 QA — CLAUDE.md 무효 증거

**주장:** CLAUDE.md는 100% 이전 프로젝트(개미 식민지 시뮬레이터)의 잔재이며, 현재 저장소와 **단 한 줄도 일치하지 않음**.

**증거:**
| CLAUDE.md 언급 | 실제 저장소 | 상태 |
|---|---|---|
| `main.js` 3번째 줄 버전 상수 | `main.js` 파일 **없음** (`game.js` 존재) | ❌ |
| "식민지 경제" | 우주 슈터 게임 | ❌ |
| "개미 상태머신(Idle/Wander/Carry...)" | 적 FSM은 `EnemyManager.js`에 있음 | ❌ |
| "colony.js" 파일 | 존재하지 않음 | ❌ |
| 장르/테마 설명 | 완전 불일치 | ❌ |

**리스크:**
- 다음 Claude Code 세션이 CLAUDE.md를 읽고 "main.js 3번째 줄 버전을 업데이트하라"는 지시를 따르려 시도 → 혼란·오작동
- 신규 기여자가 프로젝트 구조를 완전히 오해
- **이는 P0 중 가장 저비용·고임팩트 수정 (CC 15분)**

**권고 CLAUDE.md 신규 목차:**
```
1. 프로젝트 개요 (Vampire Survivors + Tetris, Canvas + Vanilla JS)
2. 파일 구조 (jonanjadeul/js/ 12 파일, 각 책임 1줄)
3. 버전 관리 (README.md 및 index.html 타이틀 동기화)
4. 외부 에셋 0 제약 (의도적 디자인)
5. 브랜치 전략 (feature/*, claude/*)
6. 커밋 컨벤션 (type: summary 형식)
7. 테스트 실행 (설치 후)
```

### 4.4 프로세스 갭

**GitHub 워크플로 실측:**
- Issues: **0개** (open + closed 모두)
- PRs: 극소수 (대부분 main 직접 커밋)
- Labels: 기본값만
- Milestones: 없음
- Projects: 없음
- Discussions: 비활성화
- Release Notes: GitHub Releases 생성 이력 없음 (태그는 있으나 본문 비어있음)

**의미:**
- **결정 로그 없음** — 왜 HP 업그레이드를 제거했는지, 왜 시너지를 재설계했는지 구조화된 기록이 커밋 메시지 외 없음
- **로드맵 가시성 없음** — DEVELOPMENT_PLAN.md는 Phase 1~4만 다루고 v1.0 이후 확장은 계획 외
- **기여자 온보딩 경로 없음** — solo + AI 구조에서 괜찮으나, 오픈 소스화하려면 병목

**최소 권고:**
1. **GitHub Issues 활성화** + 템플릿 3종 (bug / feature / tech-debt) — CC 5m
2. **v1.3 마일스톤 생성** + P0 3건 이슈화 — human 15m
3. **PR 템플릿** (what / why / test plan) — CC 3m
4. **CHANGELOG.md** — v0.9.0 이후 공개 변경 이력 (커밋 메시지 기반 자동 추출) — CC 15m

### 4.5 QA 스코어

| 항목 | 점수 | 근거 |
|---|---|---|
| 버그 추적 | 2/10 | 커밋 메시지만, Issues 0 |
| 테스트 커버리지 | 0/10 | 테스트 파일 0개 실측 |
| 문서 정합성 | 1/10 | CLAUDE.md 100% 무효 |
| 프로세스 성숙도 | 2/10 | PR·CI·Label 부재 |
| 성능 측정 | 1/10 | DoD는 60FPS, 측정 수단 0 |
| **QA 종합** | **1.2/10** | 프로덕션 진입 전 최우선 복구 영역 |

---

## 5. 개선 권고 *(TBD)*
## 부록 A·B·C *(TBD)*

---

*점진 작성 중.*
