# 부록 B — 파일별 책임 맵

> [← 인덱스로 돌아가기](../ANALYSIS.md)

리버스 엔지니어링 관점에서 실제 책임 범위.

## B.1 현황 테이블

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

## B.2 해석

- **God 3인방:** TetrisGrid(11) · Game(8) · Renderer(7) → 총 **26개 책임**이 3파일에 집중
- **적정 8파일 합계 책임:** 18개 (평균 2.3) — 건강한 SRP (Single Responsibility Principle)
- **config.js:** 의도는 "설정 허브"지만 실제 빈 껍데기. P1-1 권고 대상
- **Hotspot 상관:** 책임 6+ 파일 = 커밋 빈도 상위 = 버그 이력 상위. **3축 완벽 일치**

## B.3 분할 우선순위

1. **TetrisGrid.js** (P0-2) — 11 → 1.8/모듈 (6-모듈 + facade)
2. **Game.js** (P1-2) — 8 → 2~3 (EventBus·StageFSM·ScoreTracker 분리)
3. **Renderer.js** (P1-3) — 7 → OCP (RenderLayer 인터페이스 + 레이어별 구현)
4. **EnemyManager.js** (P2) — 6 → 3 (SpawnCurve·Separator·LootTable 분리)

## B.4 책임 수 ↔ 버그 이력 상관

| 파일 | 책임 | 버그 이력 |
|---|---|---|
| TetrisGrid | 11 | 드래그 오작동·스냅 버그·리사이즈 |
| Game | 8 | 스테이지 chain·웨이브 진행 |
| Renderer | 7 | (직접 버그 적으나 엔티티 추가 시 수정 필수) |
| EnemyManager | 6 | 적 군집 겹침·스폰 타이밍 |
| Weapon | 5 | 무기 조합 전이 |
| 적정 파일들 | 1~4 | 거의 없음 |

**결론:** 책임 수는 거의 선형으로 버그 이력과 비례. god-object 분할이 버그 방지의 가장 큰 레버리지.

---

*— 부록 B 끝.*
