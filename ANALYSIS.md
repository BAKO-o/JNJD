# JNJD 프로젝트 진척 분석 (gstack 방법론 기반)

> **작성일**: 2026-04-13 / **대상**: v1.2.2 / **브랜치**: `claude/analyze-jnjd-progress-jlu2J`
> **방법론**: [gstack](https://github.com/BAKO-o/gstack) 5개 렌즈

---

## 목차
0. [Dashboard](#0-executive-dashboard) · 1. [Retro](#1-회고--retro-스타일) · 2. [Eng](#2-엔지니어링-리뷰--plan-eng-review-스타일) · 3. [Product](#3-프로덕트-리뷰--plan-ceo-review-스타일) · 4. QA *(TBD)* · 5. 권고 *(TBD)* · A·B·C *(TBD)*

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

gstack `/plan-ceo-review`의 인지 패턴 — Premise Challenge · 10-star Definition · Focus-as-Subtraction · Temporal Depth.

### 3.1 Premise Challenge — "Vampire Survivors + Tetris" 장르 믹스

**현재 전제:** "Vampire Survivors의 자동 전투 + Tetris의 부품 조립"이라는 장르 믹스가 차별화 포인트다.

**도전 질문:**
- **두 장르의 핵심 중독 요소는?**
  - Vampire Survivors: ① 웨이브 생존 긴장감 ② 메타 프로그레션(언락·캐릭터) ③ 빌드 실험
  - Tetris: ① 공간 퍼즐 의사결정 ② 실시간 압박 ③ 무한 스코어 도전
- **JNJD는 둘 다의 중독 요소를 갖추었는가?**
  - ✅ 웨이브 생존 · ✅ 빌드 실험(30종×4티어×시너지) · ✅ 공간 퍼즐(모듈 배치)
  - ❌ 메타 프로그레션 · ❌ 무한 스코어 도전 · ❌ 실시간 압박 (조립은 일시정지)

**관찰:** 장르 믹스의 "섭취" 부분은 훌륭하나, **리텐션 훅은 하나도 복제되지 않음**. 5 스테이지 클리어 후 다시 켤 이유가 구조적으로 부재.

**EUREKA 후보:** 일반적으로 "메타 프로그레션이 있어야 리텐션"이 통념이나, **Tetris는 메타 프로그레션 없이도 40년간 리텐션**. JNJD가 Tetris 쪽을 선택하려면 **세션 내 즉각적 의사결정 밀도**가 핵심. 현재는 "잠깐 멈추고 조립" 구조라 Tetris 스타일 압박이 없음. → 조립을 실시간 중첩 모드로 바꾸거나(리스크 높음), 스코어 도전 모드를 추가하는 방향 중 택일 필요.

### 3.2 10-star 경험 정의

"1회 플레이 후에도 다시 켜고 싶은 게임"이 되려면:

| # | 요소 | 현재 | 중요도 |
|---|---|---|---|
| 1 | **메타 프로그레션** (영구 언락: 시작 모듈·시너지·함선) | ❌ | 최상 |
| 2 | **Run Summary 화면** (달성한 시너지·DPS·처치 수·모듈) | ❌ | 최상 |
| 3 | **Build variety** (모듈 다양성) | ✅ 30종 · 8레시피 | — |
| 4 | **하이스코어 / localStorage 기록** | ❌ | 상 |
| 5 | **Daily seed / Run** (동일 조건 리더보드) | ❌ | 중 |
| 6 | **Endless 모드 / NG+** | ❌ | 중 |
| 7 | **Aesthetic coherence** (단일 art direction) | 부분 | 중 |
| 8 | **Audio** (WebAudio 절차적 SFX) | ❌ | 상 |
| 9 | **Save / Resume** (런 중단·재개) | ❌ | 중 |
| 10 | **Accessibility** (색맹·자막·자동 일시정지) | ❌ | 중 |
| 11 | **Controller support** (Gamepad API) | ❌ | 하 |
| 12 | **Narrative thread** (제목 "잔해의 귀환" 회수) | ❌ | 하 |

**달성:** 1/12 (Build variety만). **10-star 갭: 매우 큼.**

### 3.3 현재 vs 10-star 갭 분석

**가장 저비용 고임팩트 추가 (Boil the Lake 원칙):**

1. **Run Summary 화면** — 이미 수집된 데이터(모듈·킬·시너지·DPS)를 종료 시 Canvas로 렌더. **CC 20분**. 플레이어가 "이번 런에 무엇을 했는지" 자각하게 하여 반복 플레이 동기 제공.
2. **localStorage 하이스코어** — 웨이브 도달·킬 수·스크랩 누적 기록. **CC 10분**. "지난 번보다 멀리" 동기.
3. **WebAudio SFX 8종** — 발사·피격·레벨업·스테이지 클리어·조립 슬롯·폭발·보스 경고·게임오버. 절차적 생성(OscillatorNode), 외부 에셋 0개 제약 유지. **CC 45분**.
4. **스테이지 간 3줄 내레이션** — "잔해의 귀환" 제목 회수. 네 연구원(송·건·학·종) 캐릭터 활용. **CC 20분**.

**총 CC 공수 ~1.5시간 → 4개 축 확보.** Human 팀 기준 1주일 작업과 등가.

### 3.4 Focus-as-Subtraction (제거 후보)

"추가"보다 "제거"가 게임 디자인에서 더 어렵다 (Garry Tan `/plan-ceo-review` 원칙).

**제거 검토 후보:**

- **30종 모듈 → 핵심 15종** — 한 런에서 플레이어가 실제로 경험하는 모듈은 5~10종. 30종은 선택 피로만 증가시킬 가능성. **각 모듈을 더 차별화하게** 만드는 것이 상위 목표라면 수량 축소가 필요.
- **환경 위험 4종 중 2종 재검토** — 운석·냉각·과열·방사선. 감각 구별(색·사운드·파티클)이 불충분하면 "또 다른 패널티"로 체감. 사운드가 없는 현재, 시각 구별이 필수.
- **25종 적 중 유사 거동 축소** — DRONE/RUSHER/SWARM 등 일부는 속도·HP만 다른 "티어 변형". 거동 자체가 유의미하게 다른 것만 남기고 나머지는 축소.
- **무기 조합 8레시피 → 5레시피** — 사용률 데이터 없이는 판단 어려우나, 원 무기 15종 × 조합 = 선택지 포화 상태. 플레이어는 2~3 레시피만 반복 사용할 가능성.

**원칙:** "적을수록 더 좋다"가 아니라, **적은 수가 각각 더 깊이 있게** 되어야 함. "30종 있어요!"보다 "15종인데 각각 기억에 남아요!"가 상위.

### 3.5 Temporal Depth — 6개월 후

**현재 궤적 (do nothing):**
- 28일 정지 → 3개월 후: 창고 상태
- 6개월 후: 제품 아이덴티티 소실, GitHub 저장소만 남음

**이상형 (인디 타이틀 런칭):**
- 6개월 후: itch.io에 "5분 런 × 50런 컨텐츠" 무료 인디 타이틀 공개. 10-50 리뷰, 작은 디스코드 커뮤니티.
- 필요 경로:
  - (a) P0 부채 해소 (1주) → 개발 재개 장벽 제거
  - (b) 10-star 갭 메우기 (1개월) → Run Summary + 하이스코어 + 사운드
  - (c) 메타 프로그레션 (2~4주) → 리플레이 훅
  - (d) itch.io 페이지 + 배포 (1주) → 공개 채널

**현실적 궤적 (30일 집중):**
- P0 3건 + Run Summary + 사운드 + 메타 프로그레션 최소 세트 = CC 기준 ~10시간. Human 기준 ~6주.
- 30일에 v1.3 → v1.5 배포 → itch.io 공개 → v2.0 메타 프로그레션 업데이트. **시간이 부족한 것이 아니라 우선순위가 문제.**

**Focus question:** 다음 28일 동안 딱 **하나의 기능만** 추가할 수 있다면?
→ **Run Summary + localStorage 하이스코어**. 이유: 현재 게임의 가장 큰 약점인 "종료 후 다시 켤 이유"를 최저 비용으로 해결. 다른 기능은 그 다음.

---

## 4. QA 평가 *(TBD)*
## 5. 개선 권고 *(TBD)*
## 부록 A·B·C *(TBD)*

---

*점진 작성 중.*
