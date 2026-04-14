# JNJD 프로젝트 진척 분석 (gstack 방법론 기반)

> **작성일**: 2026-04-13 / **대상**: v1.2.2 / **브랜치**: `claude/analyze-jnjd-progress-jlu2J`
> **방법론**: [gstack](https://github.com/BAKO-o/gstack) 5개 렌즈

---

## 목차
0. [Dashboard](#0-executive-dashboard) · 1. [Retro](#1-회고--retro-스타일) · 2. [Eng](#2-엔지니어링-리뷰--plan-eng-review-스타일) · 3. Product *(TBD)* · 4. QA *(TBD)* · 5. 권고 *(TBD)* · A·B·C *(TBD)*

---

## 0. Executive Dashboard

### TL;DR
JNJD는 **4일(2026-03-13~16)만에 v0.9.2→v1.2.2 폭발 개발** 후 **28일 정지**. Phase 1~4 100% + 계획 외 200% 확장. 그러나 TetrisGrid.js 1,860 LOC 단일 파일, CLAUDE.md 완전 무효(이전 개미 게임 지시문), 테스트 0개. 다음 과제: **"기능 추가 중단, 문서·구조 복구"**.

### Scorecard (1-10)
| 축 | 점수 |
|---|---|
| Velocity | 9 |
| Feature completeness | 8 |
| Architecture | 4 |
| Code organization | 3 |
| Test coverage | 0 |
| Documentation | 2 |
| Product vision | 7 |
| Process / workflow | 3 |
| Player retention hook | 3 |
| **🎯 종합** | **4.7 / 10** |

### 시급 3대 액션
1. **CLAUDE.md 전면 재작성** (2h / CC 15m)
2. **TetrisGrid.js 6-모듈 분할** (1d / CC 45m)
3. **스모크 테스트 3개 + Vitest** (4h / CC 20m)

---

## 1. 회고 — /retro 스타일

### 1.1 속도 지표
- 활동: 2026-03-13 03:22 → 03-16 22:23 UTC = **~91시간**
- 41 커밋, 12 JS 파일, **~6,583 LOC**, **~1,645 LOC/day**
- v0.9.2 → v1.2.2
- **🚨 정지: ~28일**

### 1.2 Phase 완료 상태
| Phase | 원 DoD | 현재 | 평가 |
|---|---|---|---|
| 1. 엔진 | WASD·회전·Wraparound | ✅ + 별 시차 | 완전 |
| 2. 전투 | 웨이브·자동타겟·60FPS | ✅ + 킬 목표 | 완전 |
| 3. 조립 | 3종 부품 | ✅ **30종**·4티어·인벤토리 | **200%** |
| 4. 시너지 | 5속성 | ✅ + NUKE·무기조합·약점 | **300%** |

**계획 외 추가:** 보스 5종, 4티어 모듈, 스크랩, 방향성 장갑, 5스테이지+환경위험, UFO 비주얼

### 1.3 Well
1. 외부 라이브러리·에셋 0개 (제약 엄수)
2. Object Pooling 일관
3. 커밋 메시지 품질
4. SemVer 엄수
5. 비주얼 의지 (UFO·폭발 이펙트)
6. 반응적 밸런싱

### 1.4 Improve
1. **🚨 28일 정지** — 번아웃 신호
2. 단일 파일 쏠림 (TetrisGrid 1,860 LOC)
3. **🚨 CLAUDE.md 무효화**
4. 브랜치 전략 부재 (PR 3건만)
5. 결정 로그 부재
6. FPS 실측 부재
7. 버전 위치 불일치

### 1.5 Hotspot
TetrisGrid 15+ · Game 15+ · Renderer 10+ · EnemyManager 8+ · index.html 8+
→ **분할 ROI 매우 높음.** Per-author: Claude ~35 / BAKO-o ~5 (solo + AI).

---

## 2. 엔지니어링 리뷰 — /plan-eng-review 스타일

### 2.1 아키텍처 평가

```
index.html
    │
    ▼
┌─────────┐
│  Game   │ ◄── god-object 조짐
└────┬────┘
     ├─► InputHandler (독립)
     ├─► Player (TetrisGrid 역의존)
     ├─► Collision (유틸)
     ├─► EnemyManager
     ├─► WeaponSystem
     ├─► TetrisGrid ◄── 거대 블랙박스 (11개 책임)
     ├─► Renderer (중앙집중, OCP 위반)
     ├─► StageManager
     ├─► SynergySystem
     └─► WeaponCombine
```

### 2.2 파일 크기 Red Flag
| 파일 | LOC | KB | 심각도 |
|---|---|---|---|
| **TetrisGrid.js** | **1,860** | **81** | **P0** |
| Renderer.js | 1,222 | 43 | P1 |
| Game.js | 1,015 | 35 | P1 |
| EnemyManager.js | 751 | 33 | P2 |
| WeaponSystem.js | 675 | 29 | P2 |
| index.html | — | 24 | P2 |
| 나머지 7파일 | <800 | <8 | OK |

### 2.3 TetrisGrid.js 6-모듈 분할
| 새 파일 | LOC | 책임 |
|---|---|---|
| ModuleRegistry.js | ~400 | 30종 모듈 + 4티어 드랍 (데이터) |
| PlacementEngine.js | ~350 | grid, validSlots, 슬롯 확장 (상태) |
| DragDrop.js | ~250 | 드래그 상태머신 (상태) |
| HitboxCalc.js | ~200 | recalcHitbox, 방향성 장갑 (파생) |
| Inventory.js | ~200 | 슬롯 경제, scrapPending (상태) |
| BuildUI.js | ~400 | BUILDING 렌더+입력 (프레젠테이션) |
| TetrisGrid.js | ~60 | facade |

**이득:** 평균 ~260 LOC/파일 (7배 감소), OCP 준수, 드래그 버그 격리 테스트 가능.

### 2.4 성능 고려사항

**현재 적용된 최적화:**
- Object Pooling: 적 300/500·투사체 500·보스 150
- Frustum culling: `_zoom` 보정된 cullX/cullY 마진 적용 (v0.6.1 버그수정으로 확보)
- Wraparound ghost: 9-copy offset 루프 (정석 구현)

**측정된 성능 지표: 0개**
- DEVELOPMENT_PLAN.md §4는 "60FPS (300적 + 500투사체 동시)" DoD를 명시.
- 실제 FPS 카운터·프로파일링·메모리 측정 **전무**.
- "잘 돌아간다"로 종결된 관찰 기반 자기 검증.

**우려되는 핫스팟:**
1. **EnemyManager `_separateEnemies` O(n²)** — 매 프레임 활성 적 간 원-원 분리 패스. n=300에서 45,000 비교/프레임. 소규모엔 OK, 웨이브 후반(MAX=500)에선 잠재 병목.
2. **Pool 선형 스캔** — `for (const e of pool) if (!e.active) continue` 패턴. active-list 별도 관리 시 N→active 수로 감소.
3. **9-copy ghost render** — 모든 엔티티에 대해 9번 draw 호출 가능. 화면 크기 근처에서만 발생하나, 컬링 조건이 draw 전이 아닌 draw 내부에 있으면 setTransform 오버헤드 발생.
4. **Renderer.js 단일 거대 switch/분기** — 30+종 draw 함수 디스패치를 매 프레임 수백 회. JIT에는 무리 없으나 프로파일링 없이 확신 불가.
5. **ctx.save/restore 중첩** — zoom 적용·ghost offset·개별 entity 회전 등 중첩 가능. 핫패스 감소 기회 있음.

**권고:**
- F3 토글로 FPS·frame time·활성 엔티티 수·pool 사용률 오버레이 (CC 15분 작업).
- `performance.now()` 기반 프레임 budget 측정. 16.67ms 초과 프레임 로깅.
- Chrome DevTools Performance 레코딩으로 웨이브 10 이후 실측. 실측 없이 최적화 금지 (premature optimization 회피).

### 2.5 기술 부채 리스트

우선순위별로 정리. 각 항목에 "현재 피해"와 "방치 시 복리 이자" 표기.

| # | 부채 | 현재 피해 | 방치 시 이자 | 심각도 |
|---|---|---|---|---|
| D1 | **CLAUDE.md 완전 무효** — 이전 개미 게임 지시문 | 다음 AI 세션이 colony.js 등 없는 파일 수정 시도 | AI 세션당 오해 누적, 수동 수정 반복 | **P0** |
| D2 | **TetrisGrid.js 1,860 LOC** | 신규 모듈 추가 시 파일 스크롤·충돌·컨텍스트 초과 | 버그 픽스 난이도 지수 증가, 마지막엔 rewrite 불가피 | **P0** |
| D3 | **테스트 0개** | 리팩토링 후 "잘 되는지" 확인 불가 | 회귀 누적, 스테이지 연쇄 클리어 같은 버그 재발 | **P0** |
| D4 | **config.js 빈 껍데기 (1KB)** | 밸런스 수치가 6,500 LOC에 흩어져 있음 | 밸런스 패치마다 grep 탐색, 의도 표현력 상실 | P1 |
| D5 | **Game.js 1,015 LOC god-object** | 새 상태 추가 시 Game.js 수정 필연 | 상태머신 복잡도 증가로 전환 버그 증가 | P1 |
| D6 | **Renderer.js OCP 위반** | 신규 적·무기마다 Renderer 수정 | entity 추가의 비용 고정, 분산 리팩토링 필요 | P1 |
| D7 | **DEVELOPMENT_PLAN.md v1.0 이전 기준** | v1.1~v1.2의 추가 기능이 문서화 없음 | 다음 개발자 온보딩 비용, 의도 상실 | P1 |
| D8 | **버전 상수 위치 불일치** | CLAUDE.md의 `main.js` 참조 무효 | 버전 표기 누락·중복 위험 | P1 |
| D9 | **package.json 없음** | npm 스크립트 없음, 도구 부트스트랩 불가 | Vitest·ESLint·Prettier 도입 장벽 | P1 |
| D10 | **PR 워크플로 부재** | 41 커밋 중 PR은 3건 | 코드 리뷰 기회 상실, main 오염 위험 | P2 |
| D11 | **GitHub Issues 0건** | 사용자 피드백 채널 없음 | 실제 플레이어 버그 리포트 경로 부재 | P2 |
| D12 | **FPS 측정 도구 없음** | DoD 검증 불가 | 성능 회귀 무감지, 최적화 근거 부재 | P2 |
| D13 | **index.html 24KB 인라인** | 튜토리얼·HUD 마크업 혼재 | HTML 리팩토링 시 전체 스크롤 필요 | P2 |
| D14 | **Player.js → TetrisGrid.getGrid() 역의존** | 순환 의존 전조 | 분할 리팩토링 시 걸림돌 | P2 |

**부채 총량 추정:** P0 3건 + P1 6건 + P2 5건 = 14건. CC+gstack 기준 누적 해소 공수 ~8시간. 인간팀 기준 ~3주.

---

## 3. 프로덕트 리뷰 *(TBD)*
## 4. QA 평가 *(TBD)*
## 5. 개선 권고 *(TBD)*
## 부록 A·B·C *(TBD)*

---

*점진 작성 중. 각 섹션 별도 커밋.*
