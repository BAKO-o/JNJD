---
tags: [gamedev, javascript, canvas, project]
created: 2026-03-31
status: 진행중
version: v1.2.4
---

# 🚀 JNJD — 스페이스 슈터 개발 노트

> 바닐라 JS + Canvas 2D API만으로 만드는 탑뷰 우주 슈터.
> 텍스트 에디터, 프레임워크 없음. IIFE 모듈 패턴.

---

## 📁 프로젝트 구조

```
jonanjadeul/
├── index.html          ← UI 레이아웃, 도움말 패널
├── style.css           ← 스타일
├── js/
│   ├── config.js       ← 게임 수치 (CFG 기본값 덮어씀)
│   ├── Game.js         ← 메인 루프, 상태머신, VERSION 상수
│   ├── Player.js       ← 플레이어 이동/충돌/HP
│   ├── Renderer.js     ← 모든 Canvas 드로우 함수
│   ├── WeaponSystem.js ← 투사체 풀, 자동화기, 수동 포탄
│   ├── EnemyManager.js ← 적 스폰/AI/보스
│   ├── StageManager.js ← 스테이지 5개, 환경 위험, 소행성
│   ├── TetrisGrid.js   ← 조립창 그리드, 모듈 배치
│   ├── SynergySystem.js← 속성 시너지
│   ├── WeaponCombine.js← 무기 조합 레시피
│   ├── Collision.js    ← 폴리곤 충돌 (SAT)
│   └── InputHandler.js ← 키보드/마우스 입력
output/
└── jonanjadeul/TEST/   ← 즉시 열어볼 수 있는 테스트 빌드
```

---

## 🎮 게임 개요

| 항목 | 내용 |
|---|---|
| 장르 | 탑뷰 우주 슈터 + 로그라이트 |
| 조작 | WASD 이동, 마우스 조준, 좌클릭 포탄, 자동 부포 |
| 핵심 루프 | 전투 → 레벨업 → 조립(모듈 배치) → 다음 웨이브 |
| 스테이지 | 5스테이지, 각 5웨이브, 5번째 웨이브 = 보스 |
| 진행 | 보스 처치 → 스테이지 클리어 → 다음 스테이지 |

### 상태 머신 (Game.js)
```
START → PLAYING ↔ PAUSED
         ↓
      LEVELUP → BUILDING → (다시 PLAYING)
         ↓
      STAGE_CLEAR → CRAFTING → PLAYING
         ↓
      GAMEOVER
```

---

## ✅ 완료된 작업

### v0.9.x — 기반 시스템
- [x] Canvas 기반 렌더링 파이프라인
- [x] 플레이어 이동 / HP / 장갑 시스템
- [x] 투사체 풀 (최대 500개 Object Pooling)
- [x] 적 10종 AI + 보스
- [x] 조립창 (TetrisGrid) — 모듈 드래그&드롭 배치
- [x] 모듈 인벤토리 UI, 슬롯 증설
- [x] 도움말 2패널 레이아웃
- [x] 시작 화면 튜토리얼

### v1.0.0 — 속성 시스템
- [x] 속성 4종: FIRE / LASER / ELECTRIC / KINETIC
- [x] 속성 시너지 (SynergySystem.js)
- [x] 적별 속성 저항/약점
- [x] 속성 강화 모듈 8종

### v1.1.0 — UI 정비
- [x] 조립창 속성 HUD
- [x] 튜토리얼 시너지 탭

### v1.2.0 — 스테이지 & 무기 확장
- [x] 스테이지 시스템 5단계 (StageManager.js)
  - Stage 1: 잔해 지대 (위험 없음)
  - Stage 2: 소행성대 (METEORS)
  - Stage 3: 극저온 성운 (CRYO — 쿨다운 ×1.3)
  - Stage 4: 항성 코로나 (HEAT — 0.5HP/s 지속 데미지)
  - Stage 5: 방사성 구름 (RADIATION — 장갑 ×0.7)
- [x] NUKE 속성 추가
- [x] 무기 조합 시스템 (WeaponCombine.js) — 레시피 6종+

### v1.2.1 — 비주얼 전면 개편
- [x] 플레이어 함선: 삼각형 → **원형 UFO 디스크**
  - 포탑 마우스 방향으로 독립 회전
  - 이동 반대 방향 추진체 불꽃 (속도 비례)
- [x] 자동 탄환: 구체 → **포탄 형태** (각도 보정)
- [x] 수동 포탄: **미사일 형태** (핀 + 동체 + 노즈콘)
- [x] 피격 폭발 이펙트 (속성별 색상)
  - flash 파티클 (확장하는 링)
  - spark 파티클 (방사형 불꽃)
  - 연기 구름

### v1.2.2 — 버그 수정
- [x] 함선 타원 → 완전한 원 (`ctx.arc`)
- [x] 포탄 형태 재작성 (미사일 실루엣)
- [x] **스테이지 연쇄 클리어 버그 수정**
  - 원인: `waveNumber % 5 === 0` 조건이 STAGE_CLEAR 상태 중에도 true 유지
  - 해결: `_stageClearConsumed` 플래그 + `consumeStageClear()` 패턴

### v1.2.3 — 소행성대 개편 (1차)
- [x] 소행성 크기 3단계
  - SMALL (r=7~11, 1격 파괴, 데미지 3)
  - MEDIUM (r=13~18, 파괴 시 SMALL×2 분열, 데미지 6)
  - LARGE (r=22~30, 파괴 시 MEDIUM×2 분열, 데미지 10)
- [x] 투사체로 소행성 파괴 가능
- [x] 소행성 밀도 대폭 증가 (스폰 간격 4~8s → 0.40~0.65s)
- [x] 피격 폭발 이펙트 연동
- [x] 크기별 비주얼 (색상, 꼬리 길이, 크레이터)

### v1.2.4 — 소행성 이동 방식 전환 (현재)
- [x] **화면 좌표 → 월드 좌표** 전환 (적과 동일한 방식)
  - 기존: `sx, sy` (화면 좌표) → 플레이어가 움직이면 소행성이 따라오는 버그
  - 수정: `x, y` (월드 좌표) → 플레이어 이동과 완전히 독립적인 궤도
- [x] 스폰: `player.x/y` 기준 화면 상단·좌측 바깥에서 생성
- [x] 충돌 판정: 월드 좌표 직접 비교 (변환 코드 제거)
- [x] 스폰 수 절반으로 조정 (2개→1개/interval)

---

## 🔧 주요 기술 패턴

### 좌표계
- **월드 좌표**: 플레이어, 적, 투사체, 소행성 → `x, y`
- **화면 좌표**: 렌더링 시 변환 → `sx = cx + (wx - player.x)`
- **화면 중앙**: 항상 플레이어 위치 (플레이어가 카메라)

### 피격 이벤트 큐 패턴
```js
// WeaponSystem / StageManager 내부에서 이벤트 누적
_hitEvents.push({ wx, wy, color, ... });

// Game.js update()에서 소비
for (const ev of WeaponSystem.consumeHitEvents()) {
  spawnExplosion(ev.wx, ev.wy, ...);
}
```

### 스테이지 클리어 소비 플래그
```js
// EnemyManager.js
function isStageClear() {
  if (_stageClearConsumed) return false;
  return (waveNumber % 5 === 0) && (bossEnemy === null) && isResting;
}
// 클리어 감지 직후 소비 → 연쇄 클리어 방지
EnemyManager.consumeStageClear();
```

### Object Pooling (투사체)
```js
const projectiles = []; // 최대 500개 고정 풀
// active=false인 슬롯을 재사용
```

---

## 📊 현재 수치 (config.js 기준)

| 설정 | 값 |
|---|---|
| 소행성 스폰 간격 | 0.40 ~ 0.65s |
| 소행성 SMALL 반지름 | 7 ~ 11px, 데미지 3 |
| 소행성 MEDIUM 반지름 | 13 ~ 18px, 데미지 6 |
| 소행성 LARGE 반지름 | 22 ~ 30px, 데미지 10 |
| 포탄 냉각 시간 | 1.5s |
| 포탄 스플래시 반지름 | 65px |
| 투사체 풀 크기 | 500개 |

---

## 🗺️ 앞으로 해야 할 것 (TODO)

### 🔴 높은 우선순위
- [ ] **소행성 시각적 피드백** — 피격 시 깜빡임 or 데미지 숫자 표시
- [ ] **소행성 HP 2 이상** — LARGE는 2~3격 맞아야 분열 (지금은 1격)
- [ ] **스테이지 2 배경** — 소행성대 분위기 배경 (암석 느낌 별 분포 등)
- [ ] **보스 드랍 연출** — 클리어 이펙트 강화

### 🟡 중간 우선순위
- [ ] **적 AI 다양화** — 지금 단순 추격 → 회피기동, 군집행동 등
- [ ] **무기 조합 레시피 확장** — 현재 6종, 더 추가
- [ ] **스테이지 3~5 전용 적** — 각 환경에 맞는 적 타입
- [ ] **업적/기록 시스템** — 최고 스테이지, 킬 수 등 localStorage 저장
- [ ] **사운드 효과** — Web Audio API로 기본 효과음 (발사, 폭발, 피격)

### 🟢 낮은 우선순위 / 아이디어
- [ ] **미니맵** — 월드가 16배 넓어서 현재 위치 파악 어려움
- [ ] **보스 페이즈 2** — 체력 50% 이하에서 패턴 변화
- [ ] **협동 모드** (장기)
- [ ] **레벨 에디터** (장기)

---

## 🐛 알려진 버그 / 주의사항

| 버그 | 상태 | 비고 |
|---|---|---|
| 스테이지 연쇄 클리어 | ✅ 수정됨 (v1.2.2) | `_stageClearConsumed` 플래그로 해결 |
| 소행성 플레이어 따라오는 현상 | ✅ 수정됨 (v1.2.4) | 화면좌표 → 월드좌표 전환 |
| 투사체가 소행성 통과 (고속) | 미수정 | 고속 투사체 터널링 가능성 있음 |

---

## 🔀 브랜치

| 브랜치 | 설명 |
|---|---|
| `claude/archive-game-new-project-LZWNT` | 현재 작업 브랜치 |
| `output/jonanjadeul/TEST/` | 로컬 테스트 빌드 (파일 직접 열기) |

---

*최종 업데이트: 2026-03-31 / v1.2.4*
