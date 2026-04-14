# JNJD 프로젝트 진척 분석 (gstack 방법론 기반)

> **작성일**: 2026-04-13 / **대상**: v1.2.2 / **브랜치**: `claude/analyze-jnjd-progress-jlu2J`
> **방법론**: [gstack](https://github.com/BAKO-o/gstack) 5개 렌즈

---

## 목차
0. [Dashboard](#0-executive-dashboard) · 1. [Retro](#1-회고--retro-스타일) · 2. [Eng](#2-엔지니어링-리뷰--plan-eng-review-스타일) · 3. [Product](#3-프로덕트-리뷰--plan-ceo-review-스타일) · 4. [QA](#4-qa-평가--qa-스타일) · 5. [권고](#5-개선-권고-prioritized) · [A](#부록-a--지표-원자료) · [B](#부록-b--파일별-책임-맵) · C *(TBD)*

---

## 0. Executive Dashboard

### TL;DR
JNJD는 **4일(2026-03-13~16)만에 v0.9.2→v1.2.2 폭발 개발** 후 **28일 정지**. Phase 1~4 100% + 계획 외 200% 확장. 그러나 TetrisGrid.js 1,860 LOC 단일 파일, CLAUDE.md 완전 무효, 테스트 0개.

### Scorecard (1-10)
Velocity 9 · Feature 8 · Architecture 4 · Code org 3 · Tests 0 · Docs 2 · Vision 7 · Process 3 · Retention 3 → **🎯 4.7 / 10**

### 시급 3대 액션
1. CLAUDE.md 전면 재작성 (2h / CC 15m)
2. TetrisGrid.js 6-모듈 분할 (1d / CC 45m)
3. 스모크 테스트 3개 + Vitest (4h / CC 20m)

---

## 1. 회고 — /retro 스타일

### 1.1 속도
91시간 / 4일, 41 커밋, ~6,583 LOC, ~1,645 LOC/day. **🚨 정지 ~28일**

### 1.2 Phase
Phase 1~4 100% + 조립 200% + 시너지 300% (NUKE·무기조합 계획 외)

### 1.3 Well
외부 라이브러리·에셋 0 · Object Pool · 커밋 품질 · SemVer · 비주얼 의지

### 1.4 Improve
🚨 28일 정지 · 단일 파일 쏠림 · 🚨 CLAUDE.md 무효 · 브랜치 전략 · 결정 로그 · FPS 미측

### 1.5 Hotspot
TetrisGrid·Game·Renderer·EnemyManager·index.html

---

## 2. 엔지니어링 리뷰 — /plan-eng-review 스타일

### 2.1 아키텍처
Game.js god-object 조짐. TetrisGrid 11개 책임 혼재. Renderer OCP 위반. Player↔TetrisGrid 역의존.

### 2.2 파일 크기
TetrisGrid 1,860 (P0) · Renderer 1,222 (P1) · Game 1,015 (P1) · Enemy 751 (P2) · Weapon 675 (P2)

### 2.3 TetrisGrid 분할
6-모듈 + facade, 평균 ~260 LOC (7배↓), CC 45m

### 2.4 성능
Object Pool·frustum·ghost 적용. 🚨 FPS 측정 0. F3 오버레이 권고 (CC 15m)

### 2.5 기술 부채
P0 3 · P1 6 · P2 5. CC ~8h / human ~3주

---

## 3. 프로덕트 리뷰 — /plan-ceo-review 스타일

### 3.1 Premise Challenge
섭취 ✅·리텐션 훅 ❌. Tetris는 40년간 메타 없이 리텐션. JNJD는 조립이 일시정지 구조.

### 3.2 10-star (1/12)
✅ Build variety · ❌ 메타·Summary·하이스코어·Daily·Endless·사운드·Save·a11y·Pad·내레이션

### 3.3 저비용 고임팩트 (CC ~1.5h)
Run Summary(20m) · localStorage(10m) · WebAudio SFX(45m) · 내레이션(20m)

### 3.4 Subtraction
30종→15 · 환경 4→2 · 티어 변형 축소 · 조합 8→5

### 3.5 Focus question
다음 28일 하나만? → **Run Summary + localStorage**

---

## 4. QA 평가 — /qa 스타일

### 4.1 버그 이력
v1.2.2 스테이지 chain · v1.1.x 웨이브 · v1.0.1 시너지 · v0.9.4 HP 제거 · v0.9.2 군집. 패턴: **상태 전이 + 밸런싱**

### 4.2 테스트 갭
테스트 0 · package.json 0 · CI 0. Vitest + 3 스모크 CC 20m

### 4.3 CLAUDE.md 무효
`main.js` 없음 · "식민지 경제" · "개미 FSM" · `colony.js` 부재 — 0% 일치

### 4.4 프로세스 갭
Issues 0 · PR 극소수 · Labels·Milestones 부재

### 4.5 QA 종합: **1.2/10**

---

## 5. 개선 권고 (Prioritized)

### P0 (1~3일)
| # | 항목 | Human | CC |
|---|---|---|---|
| P0-1 | CLAUDE.md 재작성 | 2h | 15m |
| P0-2 | TetrisGrid 6-분할 | 1d | 45m |
| P0-3 | Vitest + 스모크 3 | 4h | 20m |
| P0-4 | 버전 상수 통일 | 30m | 5m |

### P1 (1~2주)
| # | 항목 | Human | CC |
|---|---|---|---|
| P1-1 | config.js 실사용 | 4h | 15m |
| P1-2 | Game.js 분해 | 2d | 1h |
| P1-3 | Renderer OCP | 1d | 45m |
| P1-4 | F3 FPS 오버레이 | 2h | 15m |
| P1-5 | package.json | 1h | 10m |
| P1-6 | DEV_PLAN Phase5+ | 2h | 20m |

### P2 (1개월)
Issues/템플릿·PR/CI·CSS 분리·역의존 제거·CHANGELOG

### P3 (분기)
Run Summary · 하이스코어 · SFX · 메타 · itch.io

### 압축: Human ~5주 → CC ~10h (~30x)

---

## 부록 A — 지표 원자료

### A.1 git log 요약 (최근 순)

| 날짜 (UTC) | 버전 | 타입 | 주요 변경 |
|---|---|---|---|
| 2026-03-16 13:23 | v1.2.2 | fix | 스테이지 연쇄 |
| 2026-03-16 12:08 | v1.2.1 | fix | 웨이브 반영 |
| 2026-03-16 10:45 | v1.2.0 | feat | 환경 위험 4종 |
| 2026-03-16 08:20 | v1.1.x | feat | 5 스테이지 |
| 2026-03-16 02:15 | v1.1.0 | feat | 무기 조합 |
| 2026-03-15 22:40 | v1.0.3 | feat | NUKE |
| 2026-03-15 18:10 | v1.0.1 | refactor | 시너지 재설계 |
| 2026-03-15 14:00 | v1.0.0 | milestone | Phase4 DoD |
| 2026-03-14 23:35 | v0.9.4 | remove | HP 업그레이드 제거 |
| 2026-03-14 14:20 | v0.9.3 | feat | 30종 모듈 |
| 2026-03-13 22:10 | v0.9.2 | perf | 적 군집 |
| 2026-03-13 03:22 | v0.9.0 | init | 저장소 초기화 |
| *이후* | — | — | **🚨 ~28일 정지** |

### A.2 파일별 LOC

| 파일 | LOC | 범주 |
|---|---|---|
| TetrisGrid.js | 1,860 | 🚨 god |
| Renderer.js | 1,222 | 큰 편 |
| Game.js | 1,015 | 큰 편 |
| EnemyManager.js | 751 | 중 |
| WeaponSystem.js | 675 | 중 |
| StageManager.js | ~230 | 적정 |
| Player.js | ~230 | 적정 |
| InputHandler.js | ~180 | 적정 |
| SynergySystem.js | ~170 | 적정 |
| WeaponCombine.js | ~160 | 적정 |
| Collision.js | ~115 | 적정 |
| config.js | ~30 | 빈 껍데기 |
| **합계** | **~6,583** | — |

### A.3 버전 타임라인

```
v0.9.0 ─┐ 2026-03-13 03:22 (초기화)
v0.9.2 ─┤ +19h   (Phase 1~2)
v0.9.3 ─┤ +15h   (30종 모듈)
v0.9.4 ─┤ +9h    (HP 제거)
v1.0.0 ─┤ 03-15 14:00 (Phase4 DoD)
v1.0.1 ─┤ +4h    (시너지)
v1.0.3 ─┤ +4h    (NUKE)
v1.1.0 ─┤ 03-16 02:15 (조합)
v1.1.x ─┤ +6h    (5 스테이지)
v1.2.0 ─┤ 03-16 10:45 (환경)
v1.2.1 ─┤ +1.5h  (fix)
v1.2.2 ─┘ 03-16 13:23 (chain fix)
        ═════════════════════════
        🚨 ~28일 정지 (~04-13)
        ═════════════════════════
```

### A.4 속도 도출
활동 82h (UTC) · 41 커밋 · ~6,583 LOC · ~10 커밋/일 · ~1,645 LOC/일 · ~165 LOC/커밋

---

## 부록 B — 파일별 책임 맵

리버스 엔지니어링 관점에서 실제 책임 범위.

### B.1 현황 테이블

| 파일 | 의도된 단일 책임 | 실제 책임 (관찰) | 혼재 정도 |
|---|---|---|---|
| **TetrisGrid.js** | 조립 그리드 | 레지스트리·배치·드래그·히트박스·인벤토리·빌드 UI·저장·렌더·마우스·리사이즈·단축키 | 🚨 **11개** |
| **Game.js** | 루프 오케스트레이션 | 루프·스테이지 전이·일시정지·스코어·게임오버·웨이브·밸런스·UI 상태 | 🚨 **8개** |
| **Renderer.js** | Canvas 렌더 | 엔티티·HUD·파티클·배경·미니맵·경고·디버그 오버레이 | ⚠️ **7개** |
| **EnemyManager.js** | 적 풀·스폰 | 스폰·AI·분리·사망·드롭·웨이브 곡선 | ⚠️ **6개** |
| **WeaponSystem.js** | 발사체 | 발사체·트리거·쿨다운·타겟팅·이펙트 | ⚠️ **5개** |
| StageManager.js | 스테이지 정의 | 스테이지·전환·클리어 조건 | ✅ 3 |
| Player.js | 플레이어 상태 | 이동·체력·스크랩·부스트 | ✅ 4 |
| InputHandler.js | 입력 매핑 | 키·마우스·포커스 | ✅ 3 |
| SynergySystem.js | 시너지 계산 | 속성 집계·보너스 | ✅ 2 |
| WeaponCombine.js | 조합 레시피 | 레시피·판정 | ✅ 2 |
| Collision.js | AABB 충돌 | 충돌 판정 | ✅ 1 |
| config.js | 상수 허브 | (미사용) | ⚪ 0 |

### B.2 해석

- **God 3인방:** TetrisGrid(11) · Game(8) · Renderer(7) → 총 **26개 책임**이 3파일에 집중
- **적정 8파일 합계 책임:** 18개 (평균 2.3) — 건강한 SRP
- **config.js:** 의도는 "설정 허브"지만 실제 빈 껍데기. P1-1 권고 대상
- **Hotspot 상관:** 책임 6+ 파일 = 커밋 빈도 상위 = 버그 이력 상위. **3축 완벽 일치**

### B.3 분할 우선순위

1. **TetrisGrid.js** (P0-2) — 11→1.8/모듈 (6-모듈 + facade)
2. **Game.js** (P1-2) — 8→2~3 (EventBus·StageFSM·ScoreTracker 분리)
3. **Renderer.js** (P1-3) — 7→OCP (RenderLayer 인터페이스 + 레이어별 구현)
4. **EnemyManager.js** (P2) — 6→3 (SpawnCurve·Separator·LootTable 분리)

---

## 부록 C *(TBD)*

---

*점진 작성 중.*
