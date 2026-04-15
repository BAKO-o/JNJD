# CLAUDE.md — JNJD 프로젝트 지침

> **프로젝트**: 잔해의 귀환 (JNJD) — HTML5 Canvas 우주 슈터 + 테트리스 모듈 조립 게임
> **현재 버전**: v1.7.0 (2026-04-15, Phase B-3b-2 반사 DoT + 피격 반사 — FIRE:BLOCK / LASER:L)
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

### 2.1 버전 상수 위치 (P0-4b 이후)

**단일 소스**: `jonanjadeul/js/version.js` — `window.JNJD_VERSION`

```js
window.JNJD_VERSION = 'v1.5.0'; // 코멘트에 요약
```

`index.html` 이 `version.js` 를 다른 모든 스크립트보다 먼저 로드한다. 다른 파일은 `window.JNJD_VERSION` 을 참조한다 (`Game.js` 의 `document.getElementById('version-display').textContent = window.JNJD_VERSION` 참조). **`const VERSION` 같은 레거시 상수를 다시 만들지 말 것** — 스모크 테스트가 실패시킨다.

유의미한 변경 시 SemVer로 갱신:
- `MAJOR`: 게임 규칙 변경 (예: 조립 시스템 교체)
- `MINOR`: 신기능 (예: 무기 조합 추가)
- `PATCH`: 버그 수정·밸런싱·구조 정리

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

## 4. 기술 부채 (2026-04-15 기준)

1. **P0-1** — CLAUDE.md 재작성 ✅
2. **P0-2** — `TetrisGrid.js` → `tetris/` 서브모듈 분할 ✅ (v1.3.0, 1,860 → 762 LOC, −59.0%)
3. **P0-3** — Vitest + 스모크 테스트 (파일 존재 / 버전 SemVer / 파일별 LOC 캡 4종) ✅
4. **P0-4** — 버전 상수 단일 소스 (`js/version.js`) ✅ (P0-4a 추출 + P0-4b 마이그레이션 완료)

**분할 결과** (stage 1~6 누적):
- `TetrisGrid.js` — 762 LOC · 게임플레이 로직 + state + render.js facade wrapper
- `tetris/defs.js` — 129 LOC · 상수·카탈로그 (P0-2 stage 1)
- `tetris/icons.js` — 293 LOC · 아이콘 드로잉 헬퍼 5종 (P0-2 stage 2)
- `tetris/render.js` — 806 LOC · 인벤토리·패널·조립 오버레이 드로잉 5종 (stage 3~6)

Phase B 이후 검토: state.js 분리(pending/zoom 등 내부 가변 상태를 별도 모듈로). 현재는
state-as-parameter 패턴으로 render 측에서는 상태를 매 호출 수신하므로 긴급도 낮음.

상세: [`ANALYSIS.md`](ANALYSIS.md) / [`analysis/05-recommendations.md`](analysis/05-recommendations.md)

### 4.1 Phase B — Shape Synergy (진행 중)

"속성 × 모양" 2축 시너지 도입. 테트리스 배치 결과가 단순히 "무기가 추가되었다"에
그치지 않고 **어떤 모양으로 배치했는가** 까지 의미를 갖도록 하는 게임 디자인 축.

| 단계 | 상태 | 내용 |
|---|---|---|
| **B-1** | ✅ v1.4.0 | `MODULE_DEFS[*].shape` 자동 주입 (DOT/LINE/L/BLOCK/OTHER 5분류) — `tetris/defs.js` 의 `classifyShape()` |
| **B-2** | ✅ v1.4.0 | `SynergySystem.addShapeAttr/removeShapeAttr` + `SHAPE_SYNERGY_TABLE` (9조합, 3속성 × 3모양) — damage 배율만 적용. |
| **B-3a** | ✅ v1.5.0 | `WeaponSystem._applyShapeHooks` — 탄 단위 비수치 훅 4종: LASER:LINE 관통+2 · ELECTRIC:LINE 연쇄+1 · FIRE:L 폭발 반경 ×1.3 · ELECTRIC:L 크리 25%×2.0. 17개 발사 지점 + orbit/radiator crit 분기. |
| **B-3b-1** | ✅ v1.6.0 | ELECTRIC:BLOCK → EMP 펄스. 적 `stunTimer` 필드 + `EnemyManager.stunEnemy(e, dur)` + update 루프 AI 스킵 분기. 탄에 `stunDuration=0.8s` 전파 → cannon/auto/chain/orbit 4경로에서 피격 시 `stunEnemy`. **보스 면역**, 기존 timer 보다 큰 값만 반영(무한연장 방지). |
| **B-3b-2** | ✅ v1.7.0 | FIRE:BLOCK → 피격 반사 DoT (2.0s · 3dps 화염). LASER:L → 받은 피해 50% 즉시 반사. `TetrisGrid.hitShip(x, y, dmg, player, attacker)` 시그니처 확장 · 적 `burnTimer`/`burnDps` 필드 + `EnemyManager.applyBurn(e, dur, dps)` + update 루프 DoT 틱 (AI/stun 판정 전). 반사는 보스 허용(단순 데미지), `invincibleTime` 가드 공유로 무효 타격은 반사도 발동하지 않음. |
| **B-4** | 🔜 | 플레이테스트 밸런싱. 9조합 HUD 가시화(ShapeBadge) 및 이펙트 연결은 B-5 로 이관 검토. |

9조합 = FIRE/ELECTRIC/LASER × LINE/L/BLOCK. KINETIC/NUKE 및 DOT/OTHER 는 shape
시너지 비대상(단순한 기반 무기 · 특수 모양 → 프로토타입 범위 축소). 배율은 1.15~1.30
구간에서 운영. 기존 "속성 쌍" 시너지와 **곱연산**으로 누적된다.

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
