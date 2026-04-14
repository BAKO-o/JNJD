# 2. 엔지니어링 리뷰 — /plan-eng-review 스타일

> [← 인덱스로 돌아가기](../ANALYSIS.md)

## 2.1 아키텍처 평가

### 현재 의존성 (대략적 관계)

```
        index.html
            │
            ▼
        Game.js  ────────────┐  (god-object 조짐)
         │ │ │ │ │ │         │
         ▼ ▼ ▼ ▼ ▼ ▼         ▼
    Player  Input  Enemy  Weapon  Tetris  Renderer
              Handler  Manager  System   Grid    (OCP 위반 조짐)
                        │       │        │
                        ▼       ▼        ▼
                     Collision  Synergy  (역의존)
                                WeaponCombine
```

### 문제점

- **Game.js god-object 조짐** — 루프·스테이지 전이·스코어·UI 상태 등 8개 책임 혼재
- **TetrisGrid.js 11개 책임 혼재** — 레지스트리·배치·드래그·히트박스·인벤토리·빌드 UI·저장·렌더·마우스·리사이즈·단축키
- **Renderer.js OCP 위반** — 새 엔티티 타입이 추가될 때마다 렌더 코드 직접 수정
- **Player → TetrisGrid 역의존** — 플레이어 상태가 조립 그리드를 참조

## 2.2 파일 크기 Red Flag

| 파일 | LOC | 바이트 | 심각도 |
|---|---|---|---|
| **TetrisGrid.js** | **1,860** | **81 KB** | **P0** |
| Renderer.js | 1,222 | 43 KB | P1 |
| Game.js | 1,015 | 35 KB | P1 |
| EnemyManager.js | 751 | 33 KB | P2 |
| WeaponSystem.js | 675 | 29 KB | P2 |
| index.html | — | 24 KB | P2 (인라인 CSS) |

**참조 기준:** 일반적 JS 단일 파일 건강 범위 = 200~400 LOC. TetrisGrid.js는 **~5배 초과**.

## 2.3 TetrisGrid.js 6-모듈 분할 제안

현재 1,860 LOC → 분할 후 평균 ~260 LOC/파일 (**~7배 감소**)

| 신규 파일 | 책임 | 예상 LOC |
|---|---|---|
| `tetris/ModuleRegistry.js` | 30종 모듈 정의·티어·속성 | ~400 |
| `tetris/PlacementEngine.js` | 그리드 좌표·배치 규칙·충돌 검사 | ~350 |
| `tetris/DragDrop.js` | 마우스 드래그·스냅·프리뷰 | ~250 |
| `tetris/HitboxCalc.js` | 플레이어 히트박스 재계산 | ~200 |
| `tetris/Inventory.js` | 보유 모듈·스택·정렬 | ~200 |
| `tetris/BuildUI.js` | 빌드 모드 UI·단축키·리사이즈 | ~400 |
| `TetrisGrid.js` (facade) | 위 6개 모듈 orchestration | ~60 |

**예상 효과:**
- 각 파일 단일 책임 확보 → 테스트 작성 가능
- 버그 hotspot 분산
- 신규 모듈 추가 시 ModuleRegistry만 수정 (OCP 준수)

**공수:** human 1일 / CC+gstack 45분

## 2.4 성능 고려사항

### 적용된 최적화
- ✅ Object Pooling (적·발사체·파티클)
- ✅ Frustum culling (화면 밖 엔티티 스킵)
- ✅ Wraparound ghost rendering (맵 경계 근처 9-copy 방식)

### 측정·관측 부재
- 🚨 **FPS 측정 0개** — DoD "60FPS"를 검증할 수단 없음
- 🚨 Frame time 히스토그램 없음
- 🚨 엔티티 수 상한 테스트 안 됨

### 핫스팟 후보 (추정)
- `EnemyManager._separateEnemies` — O(n²) 거리 계산, n=50 이상이면 위험
- Object Pool 선형 스캔 — 풀 크기 비대 시 성능 저하
- Wraparound 9-copy — 맵 경계 근처에서 렌더 호출 9배

### 권고
- **F3 FPS 오버레이** 추가 (frame time 히스토그램, 엔티티 카운트) — CC 15m
- Spatial hash grid 도입 (separateEnemies 최적화) — 측정 후 판단

## 2.5 기술 부채 리스트 (14건)

### P0 (3건)
1. CLAUDE.md 무효 (0% 일치)
2. TetrisGrid.js god-object
3. 테스트 0개

### P1 (6건)
4. `config.js` 빈 껍데기 (실제 CFG는 `Game.js` 내 하드코딩)
5. Game.js god-object
6. Renderer.js OCP 위반
7. DEVELOPMENT_PLAN.md Phase 5+ 누락 (실제 구현은 Phase 4 훨씬 초과)
8. 버전 상수 단일 소스 부재
9. `package.json` 없음

### P2 (5건)
10. PR 워크플로 사실상 부재 (대부분 main 직접 푸시)
11. GitHub Issues 0개 (작업 추적 수단 없음)
12. FPS 실측 수단 없음
13. `index.html` 24KB — 인라인 CSS·JS 다수
14. Player → TetrisGrid 역의존

**누적 해소 공수:** human ~3주 / CC+gstack ~8시간 (**~22배 압축**)

---

*— /plan-eng-review 끝.*
