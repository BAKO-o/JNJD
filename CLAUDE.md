# CLAUDE.md — JNJD 프로젝트 지침

> **프로젝트**: 잔해의 귀환 (JNJD) — HTML5 Canvas 우주 슈터 + 테트리스 모듈 조립 게임
> **현재 버전**: v1.2.2 (2026-03-16)
> **스택**: Vanilla JavaScript (프레임워크·라이브러리·외부 에셋 0개)
> **이 문서는 200줄 이내 유지**. 세부 지침은 `rules/`·`GUIDE.md` 참조.

---

## 1. 프로젝트 구조

```
/
├── jonanjadeul/              # 게임 본체 (배포 단위)
│   ├── index.html            # 진입점 (24KB, 인라인 CSS 존재)
│   ├── css/                  # (현재 비어 있음, 분리 예정 - P2)
│   └── js/                   # 12 JS 파일, 총 ~6,583 LOC
│       ├── Game.js           # 메인 루프 & FSM 오케스트레이터 ★
│       ├── Renderer.js       # Canvas 렌더
│       ├── Player.js         # 플레이어 상태·이동
│       ├── EnemyManager.js   # 적 풀·스폰·AI
│       ├── WeaponSystem.js   # 발사체·타겟팅
│       ├── WeaponCombine.js  # 무기 조합 레시피
│       ├── SynergySystem.js  # 시너지 5속성
│       ├── TetrisGrid.js     # 조립 그리드 (🚨 1,860 LOC, P0 분할 대상)
│       ├── StageManager.js   # 5 스테이지 + 환경 위험
│       ├── InputHandler.js   # 키·마우스 매핑
│       ├── Collision.js      # AABB 충돌
│       └── config.js         # (빈 껍데기, P1 실사용화 대상)
├── ANALYSIS.md               # gstack 5-렌즈 분석 (인덱스 + analysis/)
├── DEVELOPMENT_PLAN.md       # 원 Phase 1~4 계획 (Phase 5+ 미갱신)
├── GUIDE.md                  # 상세 개발 가이드 (25KB)
├── README.md / README.ko.md  # 공개 문서
└── rules/ · skills/ · hooks/ # Claude Code 플러그인 리소스
```

## 2. 핵심 규칙

### 2.1 버전 상수 위치

**정확한 위치**: `jonanjadeul/js/Game.js` **12번째 줄**

```js
const VERSION = 'v1.2.2'; // 코멘트에 요약
```

유의미한 변경 시 SemVer로 갱신:
- `MAJOR`: 게임 규칙 변경 (예: 조립 시스템 교체)
- `MINOR`: 신기능 (예: 무기 조합 추가)
- `PATCH`: 버그 수정·밸런싱

### 2.2 커밋 메시지 형식

```
타입: 한 줄 요약 (무엇을 왜)

- 세부 변경 1
- 세부 변경 2
```

허용 타입: `feat` · `fix` · `refactor` · `perf` · `docs` · `style` · `test` · `chore` · `analysis`

### 2.3 GUIDE.md 동기화

코드 변경 시 **해당하는 경우에만** `GUIDE.md` 관련 섹션을 함께 갱신:
- 새 클래스/모듈 추가 → 구조 맵 갱신
- CFG·밸런스 수치 변경 → 밸런스 섹션 갱신
- 버그 수정 → 버그 패턴 섹션 갱신
- FSM 상태 추가 → 상태 머신 다이어그램 갱신

섹션 번호는 `GUIDE.md` 실제 목차를 확인 후 사용. (추측 금지)

### 2.4 테스트 빌드 복사 (선택 사항)

`output/jonanjadeul/TEST/` 폴더가 존재하면 배포 미리보기용:

```bash
cp -r jonanjadeul/* output/jonanjadeul/TEST/
```

해당 폴더가 없으면 스킵 가능.

## 3. 게임 아키텍처 요약

### 3.1 상태 머신 (FSM)

`Game.js`의 `STATE` 열거 — **8개 상태**:

```
START → PLAYING ↔ PAUSED
         ↓ ↑
         BUILDING / LEVELUP / STAGE_CLEAR / CRAFTING
         ↓
         GAMEOVER
```

### 3.2 월드 크기

- `WORLD_W = 12800`, `WORLD_H = 7200` (Wraparound 적용)
- 자동 줌: 플레이어 히트박스 크기에 따라 `ZOOM_MIN=0.32 ~ 1.0`

### 3.3 업그레이드 시스템

네 연구원: **송**(전술)·**건**(공학)·**학**(과학)·**종**(군사). `UPGRADE_POOL` 에서 랜덤 3개 제시.

## 4. 기술 부채 (2026-04-13 기준)

현재 **28일 정지** 상태. 재개 시 권장 순서:

1. **P0-1** — 본 CLAUDE.md 재작성 ✅ (이 커밋)
2. **P0-2** — `TetrisGrid.js` 6-모듈 분할 (`tetris/` 하위 디렉토리)
3. **P0-3** — Vitest + 스모크 테스트 3개 (`package.json` 생성 필요)
4. **P0-4** — 버전 상수 단일 소스 (`js/version.js` 분리 제안)

상세: [`ANALYSIS.md`](ANALYSIS.md) / [`analysis/05-recommendations.md`](analysis/05-recommendations.md)

## 5. 세션 관리 팁 (Claude Code 모범 사례)

- **새 대화 시작**: 응답이 느려지거나 200K 토큰 근접 시 `/export` 후 새 세션
- **긴 파일 편집 회피**: `TetrisGrid.js` 같은 거대 파일은 읽을 때 `offset`·`limit` 활용
- **부분 커밋 권장**: 큰 변경은 논리 단위로 여러 커밋 분할

## 6. 참고 문서

| 목적 | 파일 |
|---|---|
| 게임 개발 상세 가이드 | [`GUIDE.md`](GUIDE.md) |
| 원 계획 (Phase 1~4) | [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) |
| 진척 분석 (gstack 5-렌즈) | [`ANALYSIS.md`](ANALYSIS.md) |
| Claude Code 플러그인 규칙 | [`rules/`](rules/) |
| 기여 방법 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

---

*— 이전 버전(개미 식민지 시뮬레이터용)의 지시문은 2026-04-14 제거됨. P0-1 완료.*
