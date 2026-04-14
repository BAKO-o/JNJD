# JNJD 프로젝트 진척 분석 (gstack 방법론 기반)

> **작성일**: 2026-04-13
> **분석 대상 버전**: v1.2.2 (2026-03-16 커밋)
> **브랜치**: `claude/analyze-jnjd-progress-jlu2J`
> **분석 방법론**: [gstack](https://github.com/BAKO-o/gstack)의 5개 렌즈
> — `/retro` · `/plan-eng-review` · `/plan-ceo-review` · `/qa` · prioritized recommendations

---

## 목차

0. [Executive Dashboard](#0-executive-dashboard)
1. [회고 — /retro 스타일](#1-회고--retro-스타일)
2. [엔지니어링 리뷰 — /plan-eng-review 스타일](#2-엔지니어링-리뷰--plan-eng-review-스타일)
3. [프로덕트 리뷰 — /plan-ceo-review 스타일](#3-프로덕트-리뷰--plan-ceo-review-스타일) *(TBD)*
4. [QA 평가 — /qa 스타일](#4-qa-평가--qa-스타일) *(TBD)*
5. [개선 권고 (Prioritized)](#5-개선-권고-prioritized) *(TBD)*
6. [부록 A — 지표 원자료](#부록-a--지표-원자료) *(TBD)*
7. [부록 B — 파일별 책임 맵](#부록-b--파일별-책임-맵) *(TBD)*
8. [부록 C — v1.3 ~ v2.0 제안 로드맵](#부록-c--v13--v20-제안-로드맵) *(TBD)*

---

## 0. Executive Dashboard

### TL;DR

JNJD(AP3: 잔해의 귀환)는 **2026-03-13 ~ 2026-03-16 단 4일 동안 v0.9.2에서 v1.2.2까지 폭발적으로 개발**된 HTML5 Canvas + Vanilla JS 기반 우주 슈터다. 원 계획(Phase 1~4)은 100% 완료했고, 계획에 없던 보스 시스템·25종 적·30종 모듈·속성 시너지·5스테이지 환경 위험·무기 조합 시스템까지 **원 계획 대비 약 200% 기능 확장**을 달성했다. 그러나 **최종 커밋 이후 약 28일간 완전 정지** 상태이며, `TetrisGrid.js` 단일 파일이 **1,860 LOC (81KB)**로 비대해졌고, `CLAUDE.md`는 **이전 프로젝트(개미 식민지 시뮬레이터)의 지시문이 그대로 남아있다**. 테스트 0개·package.json 없음·GitHub Issues 0건 등 프로덕션 진입 전 정리가 시급. 다음 스프린트의 핵심 과제는 **"기능 추가 중단, 문서·구조 복구"**.

### Scorecard (1-10)

| 축 | 점수 | 근거 |
|---|---|---|
| **Velocity** (개발 속도) | **9** | 4일간 40 커밋, ~1,645 LOC/day |
| **Feature completeness** | **8** | Phase 1~4 100% + 계획 외 200% 추가 |
| **Architecture** | **4** | Game.js god-object 조짐, 단일 파일 1,860 LOC |
| **Code organization** | **3** | TetrisGrid.js 단일 IIFE에 11개 책임 혼재 |
| **Test coverage** | **0** | 테스트 파일 0개, 프레임워크 없음 |
| **Documentation** | **2** | CLAUDE.md 완전 무효 |
| **Product vision** | **7** | 장르 믹스 명확, 10-star 갭은 큼 |
| **Process / workflow** | **3** | main 직접 커밋, Issues 0개 |
| **Player retention hook** | **3** | 메타 프로그레션·세이브·하이스코어 부재 |
| **🎯 종합** | **4.7 / 10** | "프로토타입 완료, 프로덕션 정리 필요" |

### 가장 시급한 3가지 액션

| # | 액션 | Why | 공수 (human / CC) |
|---|---|---|---|
| **1** | **CLAUDE.md 전면 재작성** | AI 세션 오작동 방지 | 2h / 15m |
| **2** | **TetrisGrid.js 6-모듈 분할** | 유지보수 병목 해소 | 1d / 45m |
| **3** | **최소 스모크 테스트 3개 + Vitest 세팅** | 회귀 방지 기반 | 4h / 20m |

---

## 1. 회고 — /retro 스타일

gstack `/retro` 스킬이 제시하는 "per-contributor breakdown, hotspot 분석, 7/14/30일 윈도우" 프레임으로 평가.

### 1.1 개발 속도 지표

**활동 창:** 2026-03-13 03:22 UTC → 2026-03-16 22:23 UTC = **약 91시간 (4일)**

| 지표 | 값 |
|---|---|
| 전체 커밋 | 41 (meaningful 40) |
| JS 파일 | 12개 (원 계획 8 + 신규 4) |
| 총 LOC | ~6,583 |
| 평균 속도 | ~1,645 LOC/day (인간팀 대비 ~30배 압축) |
| 버전 롤업 | v0.9.2 → v1.2.2 |

**🚨 정지 기간:** 최종 커밋(2026-03-16) 이후 **약 28일** (본 분석일 기준)

### 1.2 Phase 완료 상태 (DEVELOPMENT_PLAN.md DoD 대비)

| Phase | 원 DoD | 현재 | 평가 |
|---|---|---|---|
| 1. 엔진 코어 | WASD·회전·Wraparound | ✅ + 별 시차 스크롤 | 완전 달성 |
| 2. 전투 | 웨이브·자동타겟·60FPS | ✅ + 킬 목표·휴식 시간 | 완전 달성 |
| 3. 조립 | 3종 부품·드래그&드롭 | ✅ **30종**·4티어·회전·인벤토리 | **200% 초과** |
| 4. 시너지 | 5속성·조합 | ✅ + NUKE·무기조합 8레시피·약점/저항 | **300% 초과** |

**계획에 없던 추가:** 보스 5종(v0.8), 모듈 4티어(v0.9.2), 스크랩(v0.9), 방향성 장갑(v0.9.4), 5스테이지+환경위험(v1.2), UFO 비주얼(v1.2.1)

### 1.3 What went well

1. **기술 제약 엄수** — 외부 라이브러리 0개, 에셋 0개 (DEVELOPMENT_PLAN.md §5 규칙 1,4 완벽 준수)
2. **Object Pooling 일관** — 적 300·투사체 500·보스 150 풀
3. **커밋 메시지 품질** — 한국어 요약 + 세부 bullet + 버전 태그
4. **점진적 버전 번호** — v0.9.x 패치 후 v1.0.0 승격 규칙
5. **시각 디자인 의지** — UFO 디스크·포탑·폭발 이펙트 (에셋 없이)
6. **반응적 밸런싱** — v0.6.1 자동 줌, v0.9.1 저티어 면역, v0.9.4 HP 재설계

### 1.4 What needs improvement

1. **🚨 28일 완전 정지** — 번아웃 또는 관성 상실 신호, 로그 부재
2. **단일 파일 쏠림** — TetrisGrid.js 1,860 LOC 단일 IIFE
3. **🚨 CLAUDE.md 무효화** — `colony.js`, `main.js`, "식민지 경제" 등 현 코드에 없는 것을 지시
4. **브랜치 전략 부재** — 41 커밋 중 PR은 3건, 브랜치명(`claude/archive-game-new-project-LZWNT`)과 실제 개발 의도 불일치
5. **결정 로그 부재** — v0.9.4 "HP 업그레이드 제거"의 사유 미기록
6. **FPS 측정 부재** — "60FPS (300적 + 500투사체)" DoD 실측 없음
7. **버전 위치 불일치** — CLAUDE.md는 `main.js` 참조하나 해당 파일 없음

### 1.5 Hotspot 분석

| 파일 | 추정 수정 | 이유 |
|---|---|---|
| TetrisGrid.js | 15+ | 조립 시스템이 거의 모든 버전에서 변경 |
| Game.js | 15+ | 오케스트레이터라 모든 기능이 건드림 |
| Renderer.js | 10+ | 신규 적·보스·이펙트마다 draw 추가 |
| EnemyManager.js | 8+ | 25종 적·5종 보스·환경 위험 |
| index.html | 8+ | HUD·튜토리얼·도움말 UI |

→ **결합도 경고:** 이 3파일에 수정이 집중 = 다음 기능 추가 시 재충돌 고위험. 분할 ROI 매우 높음.

**Per-author:** Claude ~35 커밋 (코어), BAKO-o ~5 커밋 (setting·머지). 전형적 **solo + AI force-multiplier** (gstack `REPO_MODE=solo` 패턴).

---

## 2. 엔지니어링 리뷰 — /plan-eng-review 스타일

gstack `/plan-eng-review`의 prime directives: zero silent failures, 의존성 명료화, DRY 공격적 적용, 테스트 커버리지 비협상.

### 2.1 아키텍처 평가

**의존성 그래프:**

```
index.html
    │
    ▼
┌─────────┐
│  Game   │ ◄── 모든 모듈 조율자 (god-object 조짐)
└────┬────┘
     │
     ├─► InputHandler       (독립, 건강)
     ├─► Player             (TetrisGrid.getGrid() 역의존)
     ├─► Collision          (유틸, 건강)
     ├─► EnemyManager       (Player, Collision 의존)
     ├─► WeaponSystem       (Enemy, Player, WeaponCombine, Synergy 의존)
     ├─► TetrisGrid    ◄─── 거대 블랙박스 (hitbox + UI + 입력 + 렌더 모두 담당)
     ├─► Renderer           (모든 entity draw; 1,222 LOC)
     ├─► StageManager       (Enemy/Weapon에 스폰 파라미터 주입)
     ├─► SynergySystem      (Weapon이 쿼리)
     └─► WeaponCombine      (Weapon에 레시피 제공)
```

**문제점:**

- **Game.js (1,015 LOC)** — 원 설계의 "오케스트레이터" 역할을 넘어 상태 관리·루프·HUD 조율·메뉴 전환까지 떠맡음. 전형적 god-object 진행.
- **TetrisGrid.js** — 최소 **11개 책임** 혼재: 모듈 정의 테이블·배치 상태·드래그&드롭·4티어 드랍·슬롯 확장·pending 큐·zoom 보정·hitbox 재계산·validSlots 계산·BUILDING 렌더·BUILDING 입력.
- **Renderer.js (1,222 LOC)** — 모든 draw 로직을 중앙집중. entity 자신의 draw()로 분산시키지 않아 신규 적 추가마다 Renderer.js 수정 필요(OCP 위반).
- **Player → TetrisGrid 역의존** — Player.getHitPolygons()가 TetrisGrid.getGrid()를 호출 → 순환 의존의 전조.

### 2.2 파일 크기 Red Flag 랭킹

| 파일 | LOC | KB | 심각도 | 분할 권고 |
|---|---|---|---|---|
| **TetrisGrid.js** | **1,860** | **81** | **P0** | 6모듈 분할 (§2.3) |
| Renderer.js | 1,222 | 43 | P1 | entity.draw()로 분산 |
| Game.js | 1,015 | 35 | P1 | 상태머신 `states/` 분리 |
| EnemyManager.js | 751 | 33 | P2 | `enemies/types.js` 데이터 분리 |
| WeaponSystem.js | 675 | 29 | P2 | `weapons/types.js` 데이터 분리 |
| index.html | — | 24 | P2 | 튜토리얼 HTML `templates/` 추출 |
| StageManager.js | — | 7.5 | OK | — |
| Player.js | — | 7.5 | OK | — |
| InputHandler.js | — | 6 | OK | — |
| SynergySystem.js | — | 5.6 | OK | — |
| WeaponCombine.js | — | 5.2 | OK | — |
| Collision.js | — | 3.8 | OK | — |
| config.js | — | 1 | 빈 껍데기 | **확장** — 밸런스 수치 집중 |

**관찰:**
- 300 LOC 미만 5파일은 건강. 500 LOC 초과 5파일이 수정 hotspot과 **완전히 일치** (§1.5 표와 교차 확인).
- config.js는 26 LOC에 환경 피해 수치 4개뿐. 원 CLAUDE.md는 "게임 수치는 config.js에서 관리"라고 했으나 실제로는 각 파일에 하드코딩.

### 2.3 TetrisGrid.js 6-모듈 분할 제안

*(다음 커밋에서 작성)*

### 2.4 성능 고려사항

*(다음 커밋에서 작성)*

### 2.5 기술 부채 리스트

*(다음 커밋에서 작성)*

---

## 3. 프로덕트 리뷰 — /plan-ceo-review 스타일

*(다음 커밋에서 작성)*

---

## 4. QA 평가 — /qa 스타일

*(다음 커밋에서 작성)*

---

## 5. 개선 권고 (Prioritized)

*(다음 커밋에서 작성)*

---

## 부록 A — 지표 원자료

*(다음 커밋에서 작성)*

---

## 부록 B — 파일별 책임 맵

*(다음 커밋에서 작성)*

---

## 부록 C — v1.3 ~ v2.0 제안 로드맵

*(다음 커밋에서 작성)*

---

*이 문서는 점진적으로 작성 중이며, 각 섹션은 별도 커밋으로 추가됩니다.*
