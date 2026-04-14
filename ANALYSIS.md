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
1. **CLAUDE.md 전면 재작성** (2h / CC 15m) — AI 세션 오작동 방지
2. **TetrisGrid.js 6-모듈 분할** (1d / CC 45m) — 유지보수 병목
3. **스모크 테스트 3개 + Vitest** (4h / CC 20m) — 회귀 방지

---

## 1. 회고 — /retro 스타일

### 1.1 속도 지표
- 활동: 2026-03-13 03:22 → 03-16 22:23 UTC = **~91시간**
- 41 커밋, 12 JS 파일, **~6,583 LOC**, **~1,645 LOC/day**
- v0.9.2 → v1.2.2 (메이저 1, 마이너 2, 패치 다수)
- **🚨 정지: ~28일** (최종 커밋 이후)

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
2. Object Pooling 일관 (적 300·투사체 500)
3. 커밋 메시지 품질 (한국어 + 버전 태그)
4. SemVer 엄수
5. 비주얼 의지 (UFO·폭발 이펙트)
6. 반응적 밸런싱 (v0.6.1 자동 줌, v0.9.4 HP 재설계)

### 1.4 Improve
1. **🚨 28일 정지** — 번아웃 신호, 로그 부재
2. 단일 파일 쏠림 (TetrisGrid 1,860 LOC)
3. **🚨 CLAUDE.md 무효화** — `colony.js`, `main.js`, "식민지 경제" 지시
4. 브랜치 전략 부재 (PR 3건만, 브랜치명 불일치)
5. 결정 로그 부재 (HP 재설계 사유 미기록)
6. FPS 실측 부재
7. 버전 위치 불일치 (`main.js` 참조하나 없음)

### 1.5 Hotspot
| 파일 | 추정 수정 |
|---|---|
| TetrisGrid.js | 15+ |
| Game.js | 15+ |
| Renderer.js | 10+ |
| EnemyManager.js | 8+ |
| index.html | 8+ |

→ **분할 ROI 매우 높음.** Per-author: Claude ~35 / BAKO-o ~5 (solo + AI pattern).

---

## 2. 엔지니어링 리뷰 — /plan-eng-review 스타일

### 2.1 아키텍처 평가

```
index.html
    │
    ▼
┌─────────┐
│  Game   │ ◄── 모든 모듈 조율자 (god-object 조짐)
└────┬────┘
     │
     ├─► InputHandler       (독립)
     ├─► Player             (TetrisGrid 역의존)
     ├─► Collision          (유틸)
     ├─► EnemyManager       (Player, Collision)
     ├─► WeaponSystem       (Enemy, Player, WeaponCombine, Synergy)
     ├─► TetrisGrid    ◄─── 거대 블랙박스 (11개 책임)
     ├─► Renderer           (모든 entity draw)
     ├─► StageManager       (Enemy/Weapon 스폰 파라미터)
     ├─► SynergySystem      (Weapon이 쿼리)
     └─► WeaponCombine      (Weapon에 레시피)
```

**문제:**
- Game.js 1,015 LOC — god-object 진행
- TetrisGrid.js 11개 책임 혼재 (모듈 정의·배치·드래그·티어·슬롯·큐·zoom·hitbox·validSlots·BUILDING 렌더·BUILDING 입력)
- Renderer.js 1,222 LOC — entity draw 중앙집중 (OCP 위반)
- Player → TetrisGrid 역의존 (순환 전조)

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
| config.js | — | 1 | 빈 껍데기 |

→ 500 LOC 초과 상위 5파일 = 수정 hotspot (§1.5) 완전 일치.

### 2.3 TetrisGrid.js 6-모듈 분할 제안

**현재 1,860 LOC → 6개 모듈로 분할:**

| 새 파일 | 예상 LOC | 책임 | 경계 기준 |
|---|---|---|---|
| `modules/ModuleRegistry.js` | ~400 | 30종 모듈 정의 + 4티어 드랍 가중치 + weaponAttr | **데이터** |
| `modules/PlacementEngine.js` | ~350 | grid Map, validSlots 계산, anchor 배치, 슬롯 확장 | **상태** |
| `modules/DragDrop.js` | ~250 | 드래그 상태머신, tryStartDrag·endDrag, pending 복원 | **상태** |
| `modules/HitboxCalc.js` | ~200 | recalcHitbox, 방향성 장갑 hitShip, _drawModulePanel 제외 | **파생 계산** |
| `modules/Inventory.js` | ~200 | 슬롯 증설 경제(스크랩 150), scrapPending, placedModules | **상태** |
| `modules/BuildUI.js` | ~400 | BUILDING 상태 렌더·입력·미니프리뷰·패널·cyclePending | **프레젠테이션** |
| `TetrisGrid.js` (facade) | ~60 | 공개 API 위임 | **entry** |

**경계 기준:** 데이터(Registry) / 상태(Placement·Drag·Inventory) / 파생(Hitbox) / 프레젠테이션(UI) — MVC-ish 분리.

**이득:**
- 단일 파일 1,860 LOC → 평균 ~260 LOC (7배 감소)
- 신규 모듈 추가: Registry만 수정 (OCP 준수)
- 드래그 버그: DragDrop만 테스트 가능
- BUILDING UI 변경: Renderer 건드리지 않고 BuildUI 내에서 처리

**마이그레이션 전략 (CC 기준 45분):**
1. (5m) `modules/` 폴더 생성 + ModuleRegistry 데이터 먼저 추출 (순수 데이터라 의존 없음)
2. (10m) PlacementEngine + Inventory 추출 (Registry만 참조)
3. (10m) HitboxCalc 추출 (PlacementEngine 참조)
4. (10m) DragDrop 추출 (Placement + Hitbox 참조)
5. (8m) BuildUI 추출 (전부 참조, canvas draw)
6. (2m) TetrisGrid.js facade로 축소

**위험:** 기존 외부 호출자(Game.js·Player.js)의 API 호환. Facade가 동일 interface 유지하므로 호출자 무수정.

### 2.4 성능 고려사항

*(다음 커밋)*

### 2.5 기술 부채 리스트

*(다음 커밋)*

---

## 3. 프로덕트 리뷰 *(TBD)*
## 4. QA 평가 *(TBD)*
## 5. 개선 권고 *(TBD)*
## 부록 A·B·C *(TBD)*

---

*점진 작성 중. 각 섹션 별도 커밋.*
