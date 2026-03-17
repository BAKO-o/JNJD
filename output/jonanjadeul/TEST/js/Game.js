/**
 * Game.js — 메인 게임 루프 & 상태머신 오케스트레이터
 *
 * 상태: START → PLAYING ↔ PAUSED → LEVELUP → PLAYING → GAMEOVER
 *
 * 의존 모듈 (window 전역으로 노출됨):
 *   InputHandler, Renderer, Collision, Player, EnemyManager, WeaponSystem
 */

'use strict';

const VERSION = 'v1.2.4'; // 소행성 월드 좌표 전환 — 플레이어 이동에 독립적인 자체 궤도

// ── 맵 설정 (16배 넓어진 월드)
const WORLD_W = 12800;
const WORLD_H = 7200;

// ── 상태 열거
const STATE = {
  START:       'START',
  PLAYING:     'PLAYING',
  PAUSED:      'PAUSED',
  LEVELUP:     'LEVELUP',
  BUILDING:    'BUILDING',    // 테트리스 모듈 조립
  STAGE_CLEAR: 'STAGE_CLEAR', // 스테이지 클리어 연출
  CRAFTING:    'CRAFTING',    // 무기 조합창
  GAMEOVER:    'GAMEOVER',
};

// ── 별 배경 설정
const STAR_COUNT = 180;

const Game = (() => {

  // ── 게임 상태
  let state     = STATE.START;
  let prevState = STATE.START;
  let lastTimestamp = 0;
  let elapsedTime   = 0;    // 플레이 총 시간 (s)
  let animFrameId   = null;

  // ── 줌 (기체 크기에 따라 자동 축소)
  let zoom = 1.0;
  const ZOOM_BASE = 55;   // hitboxRadius가 이 이하일 때 zoom = 1.0
  const ZOOM_MIN  = 0.32; // 최소 줌 (매우 큰 기체)

  // ── 엔티티
  let player = null;

  // ── 인벤토리 패널 표시 여부
  let inventoryOpen = false;

  // ── 스테이지 클리어 연출
  let _stageClearTimer   = 0;    // 클리어 메시지 표시 시간
  const STAGE_CLEAR_SHOW = 3.5;  // 초

  // ── 조합창 상태
  let _craftSlotA      = null;   // { key, anchorGx, anchorGy }
  let _craftSlotB      = null;
  let _craftRecipe     = null;   // WeaponCombine.findRecipe 결과
  let _craftList       = [];     // getCraftableWeapons() 결과 (UI 목록)
  let _craftSelectIdx  = 0;      // 목록 선택 인덱스

  // ── 스테이지 클리어 확인용 플래그 (보스 처치 후 한 번만 트리거)
  let _stageClearPending = false;

  // ── 별 배경 데이터 (화면 좌표 기반, 시차 스크롤 없음)
  let stars = [];

  // ── 파티클 배열 (폭발 이펙트)
  const particles = [];

  // ── HUD 엘리먼트 캐시
  const elHpBar      = document.getElementById('hp-bar');
  const elHpText     = document.getElementById('hp-text');
  const elXpBar      = document.getElementById('xp-bar');
  const elXpText     = document.getElementById('xp-text');
  const elTimer      = document.getElementById('timer');
  const elKillCount  = document.getElementById('kill-count');
  const elWaveNum    = document.getElementById('wave-num');

  const elWaveKill    = document.getElementById('wave-kill');
  const elRestOverlay = document.getElementById('overlay-rest');
  const elRestTimer   = document.getElementById('rest-timer');
  const elRestTitle   = document.getElementById('rest-title');

  const elOverlayPause    = document.getElementById('overlay-pause');
  const elOverlayLevelup  = document.getElementById('overlay-levelup');
  const elOverlayGameover = document.getElementById('overlay-gameover');
  const elOverlayStart    = document.getElementById('overlay-start');
  const elGameoverStats   = document.getElementById('gameover-stats');
  const elUpgradeChoices  = document.getElementById('upgrade-choices');
  const elModuleBadge     = document.getElementById('module-badge');
  const elModuleCount     = document.getElementById('module-count');
  const elScrapCount      = document.getElementById('scrap-count');

  // ── 업그레이드 선택지 정의
  // 연구원: 송(전술), 건(공학), 학(과학), 종(군사·함선)
  const UPGRADE_POOL = [
    {
      id: 'song_firepower', icon: '🔫', name: '송: 화력 증가',
      desc: '무기 데미지 +25%',
      apply: (p) => { p.damageMult += 0.25; }
    },
    {
      id: 'song_tactics', icon: '⚔️', name: '송: 전술 사격',
      desc: '사거리 +60px · 쿨다운 -10%',
      apply: () => {
        const curRange = WeaponSystem.getWeaponStat('range') ?? 350;
        const curCd    = WeaponSystem.getWeaponStat('cooldown') ?? 0.72;
        WeaponSystem.upgradeWeapon('range', curRange + 60);
        WeaponSystem.upgradeWeapon('cooldown', Math.max(0.15, curCd * 0.9));
      }
    },
    {
      id: 'gun_engine', icon: '⚡', name: '건: 엔진 부스트',
      desc: '이동속도 +20%',
      apply: (p) => { p.speedMult += 0.20; }
    },
    {
      id: 'gun_rapid', icon: '🔄', name: '건: 연사 강화',
      desc: '발사 쿨다운 -20%',
      apply: () => {
        const cur = WeaponSystem.getWeaponStat('cooldown') ?? 0.72;
        WeaponSystem.upgradeWeapon('cooldown', Math.max(0.15, cur * 0.8));
      }
    },
    {
      id: 'hak_range', icon: '🎯', name: '학: 사거리 확장',
      desc: '무기 사거리 +80px',
      apply: () => {
        const cur = WeaponSystem.getWeaponStat('range') ?? 350;
        WeaponSystem.upgradeWeapon('range', cur + 80);
      }
    },
    {
      id: 'hak_repair', icon: '🔧', name: '학: 긴급 수리',
      desc: '장착 장갑판 내구도 전량 회복 · 스크랩 +25',
      apply: (p) => { TetrisGrid.repairAllHull(); p.scrap += 25; }
    },
    {
      id: 'jong_armor', icon: '🛡️', name: '종: 장갑 강화',
      desc: '현재 장착 장갑판 최대 내구도 +50%',
      apply: () => { TetrisGrid.boostHullMaxHp(1.5); }
    },
    {
      id: 'jong_bulkhead', icon: '⚙️', name: '종: 함체 증설',
      desc: `함체 슬롯 +${TetrisGrid.getExpandAmount ? TetrisGrid.getExpandAmount() : 3}`,
      apply: () => { TetrisGrid.expandHullSlots(3); }
    },
  ];

  // 시차 계수: layer 0(먼 별) = 0.12, layer 1(가까운 별) = 0.38
  const PARALLAX = [0.12, 0.38];

  /** 별 배경 초기화 — 화면 좌표로 랜덤 배치, layer 속성 부여 */
  function initStars() {
    stars = [];
    const W = Renderer.getWidth();
    const H = Renderer.getHeight();
    for (let i = 0; i < STAR_COUNT; i++) {
      const layer = i < STAR_COUNT * 0.65 ? 0 : 1; // 65% 먼 별, 35% 가까운 별
      stars.push({
        sx:    Math.random() * W,
        sy:    Math.random() * H,
        size:  layer === 0 ? 1 : (Math.random() < 0.3 ? 2 : 1.5),
        alpha: layer === 0 ? 0.3 + Math.random() * 0.4 : 0.6 + Math.random() * 0.4,
        layer,
      });
    }
  }

  /**
   * 별 시차 스크롤 — 플레이어 속도 반대 방향으로 별 이동
   * 화면 경계 이탈 시 반대편에 재등장
   */
  function updateStars(dt) {
    if (!player) return;
    const W = Renderer.getWidth();
    const H = Renderer.getHeight();
    for (const s of stars) {
      const p = PARALLAX[s.layer];
      s.sx -= player.vx * dt * p;
      s.sy -= player.vy * dt * p;
      // 화면 경계 wrap
      s.sx = ((s.sx % W) + W) % W;
      s.sy = ((s.sy % H) + H) % H;
    }
  }

  /** 새 파티클 생성 (적 파괴 폭발) */
  function spawnParticles(wx, wy) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        alpha: 1,
        color: Math.random() < 0.5 ? '#f97316' : '#fbbf24',
        lifetime: 0.4 + Math.random() * 0.3,
        age: 0,
        ptype: 'spark',
      });
    }
  }

  /**
   * 폭발 이펙트 생성 — 피격 시 플래시 + 불꽃 파편
   * @param {number} wx      - 월드 X
   * @param {number} wy      - 월드 Y
   * @param {string} color   - 기본 폭발 색상
   * @param {string} hitType - 'cannon'|'auto'
   * @param {number} splashR - 스플래시 반지름 (폭발 크기 기준)
   * @param {string|null} attr - 무기 속성 (NUKE 등)
   */
  function spawnExplosion(wx, wy, color, hitType, splashR, attr) {
    // 속성/타입에 따른 폭발 색/크기 결정
    let flashColor = color;
    let sparkCount = hitType === 'cannon' ? 12 : 5;
    let flashRadius = splashR > 0 ? splashR : (hitType === 'cannon' ? 40 : 18);
    let sparkColor2 = '#fbbf24';

    if (attr === 'NUKE') {
      flashColor = '#4ade80'; sparkColor2 = '#86efac';
      sparkCount = 18; flashRadius = Math.max(flashRadius, 80);
    } else if (attr === 'FIRE') {
      flashColor = '#ef4444'; sparkColor2 = '#f97316';
    } else if (attr === 'ELECTRIC') {
      flashColor = '#60a5fa'; sparkColor2 = '#a78bfa';
      sparkCount = Math.max(sparkCount, 8);
    } else if (attr === 'LASER') {
      flashColor = '#bef264'; sparkColor2 = '#86efac';
    } else if (attr === 'KINETIC') {
      flashColor = '#94a3b8'; sparkColor2 = '#e2e8f0';
    }

    // 플래시 링 (팽창하며 사라지는 원형 번쩍임)
    particles.push({
      x: wx, y: wy, vx: 0, vy: 0,
      radius: flashRadius * 0.28,
      alpha: 0.92,
      color: flashColor,
      lifetime: hitType === 'cannon' ? 0.38 : 0.22,
      age: 0,
      ptype: 'flash',
      flashRadius,
    });

    // 불꽃 파편
    for (let i = 0; i < sparkCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (70 + Math.random() * 150) * (flashRadius / 45);
      particles.push({
        x: wx, y: wy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 1.5 + Math.random() * 2.5,
        alpha: 1,
        color: Math.random() < 0.52 ? flashColor : sparkColor2,
        lifetime: 0.28 + Math.random() * 0.28,
        age: 0,
        ptype: 'spark',
      });
    }

    // 큰 폭발(cannon/nuke)일 때 연기 구름 추가
    if (hitType === 'cannon' || (splashR > 60)) {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 50;
        particles.push({
          x: wx, y: wy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          radius: 6 + Math.random() * 8,
          alpha: 0.55,
          color: '#6b7280',
          lifetime: 0.55 + Math.random() * 0.35,
          age: 0,
          ptype: 'spark',
        });
      }
    }
  }

  /** 파티클 업데이트 */
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.lifetime) { particles.splice(i, 1); continue; }
      if (p.ptype !== 'flash') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      p.alpha = 1 - p.age / p.lifetime;
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const { sx, sy } = player.worldToScreen(p.x, p.y, WORLD_W, WORLD_H);
      if (p.ptype === 'flash') {
        const progress = p.age / p.lifetime;
        const r = p.flashRadius * (0.25 + progress * 0.75);
        Renderer.drawExplosionFlash(sx, sy, r, p.color, p.alpha);
      } else {
        Renderer.drawParticle(sx, sy, p.radius, p.alpha, p.color);
      }
    }
  }

  /** 화면 중앙 좌표 */
  function screenCenter() {
    return { cx: Renderer.getWidth() / 2, cy: Renderer.getHeight() / 2 };
  }

  // ────────────────────────────── 초기화 ──────────────────────────────

  function init() {
    const canvas = document.getElementById('gameCanvas');
    Renderer.init(canvas);
    InputHandler.init();

    // 버전 표시
    document.getElementById('version-display').textContent = VERSION;

    // 버튼 이벤트
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-restart').addEventListener('click', restartGame);

    // 별 초기화
    initStars();
    window.addEventListener('resize', initStars);

    // 첫 루프 시작
    animFrameId = requestAnimationFrame(loop);
  }

  function startGame() {
    elOverlayStart.classList.add('hidden');

    // 엔티티 생성 / 초기화
    player = new Player(WORLD_W, WORLD_H);
    EnemyManager.init(WORLD_W, WORLD_H);
    WeaponSystem.init(WORLD_W, WORLD_H);
    TetrisGrid.init();
    SynergySystem.reset();
    StageManager.init(WORLD_W, WORLD_H);
    particles.length = 0;
    elapsedTime = 0;
    zoom = 1.0;
    _stageClearPending = false;
    _stageClearTimer   = 0;
    _craftSlotA = null; _craftSlotB = null; _craftRecipe = null;
    _craftList = []; _craftSelectIdx = 0;

    setState(STATE.PLAYING);
  }

  function restartGame() {
    elOverlayGameover.classList.add('hidden');
    startGame();
  }

  // ────────────────────────────── 상태 전환 ──────────────────────────────

  function setState(newState) {
    prevState = state;
    state     = newState;

    // DOM 오버레이 제어
    elOverlayPause.classList.toggle('hidden',    state !== STATE.PAUSED);
    elOverlayLevelup.classList.toggle('hidden',  state !== STATE.LEVELUP);
    elOverlayGameover.classList.toggle('hidden', state !== STATE.GAMEOVER);

    // 조립/레벨업/조합창 진입 시 인벤토리 닫기
    if (newState === STATE.BUILDING || newState === STATE.LEVELUP || newState === STATE.CRAFTING) inventoryOpen = false;

    // 휴식 오버레이: PLAYING이 아닌 상태(레벨업·조립·일시정지)로 전환 시 즉시 숨김
    // → 레벨업 카드나 모듈 조립창이 앞에 보여야 함
    // PLAYING으로 복귀 시 updateHUD()가 isResting 여부에 따라 다시 표시함
    if (state !== STATE.PLAYING) {
      elRestOverlay.classList.add('hidden');
    }
  }

  function togglePause() {
    if (state === STATE.PLAYING) setState(STATE.PAUSED);
    else if (state === STATE.PAUSED) setState(STATE.PLAYING);
  }

  /** 레벨업 팝업 표시 */
  function showLevelUp() {
    setState(STATE.LEVELUP);

    // 3개 랜덤 선택지 (중복 없이)
    const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
    const choices  = shuffled.slice(0, 3);

    elUpgradeChoices.innerHTML = '';
    for (const upg of choices) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="card-icon">${upg.icon}</div>
        <div class="card-name">${upg.name}</div>
        <div class="card-desc">${upg.desc}</div>
      `;
      card.addEventListener('click', () => {
        upg.apply(player);
        setState(STATE.PLAYING);
      });
      elUpgradeChoices.appendChild(card);
    }
  }

  /** 게임 오버 */
  function gameOver() {
    const stats = EnemyManager.getStats();
    const mins  = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const secs  = Math.floor(elapsedTime % 60).toString().padStart(2, '0');
    elGameoverStats.innerHTML =
      `생존 시간: ${mins}:${secs}<br/>처치 수: ${stats.totalKills}<br/>레벨: ${player.level}`;
    setState(STATE.GAMEOVER);
  }

  // ────────────────────────────── 게임 루프 ──────────────────────────────

  function loop(timestamp) {
    animFrameId = requestAnimationFrame(loop);

    const rawDt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    const dt = Math.min(rawDt, 0.1); // 100ms 캡 (탭 비활성화 복귀 방지)

    if (state === STATE.PLAYING) {
      update(dt);
    } else if (state === STATE.PAUSED) {
      if (InputHandler.consumePause()) { inventoryOpen = false; togglePause(); }
      if (InputHandler.consumeInventory()) inventoryOpen = !inventoryOpen;
    } else if (state === STATE.BUILDING) {
      updateBuilding(dt);
    } else if (state === STATE.STAGE_CLEAR) {
      updateStageClear(dt);
    } else if (state === STATE.CRAFTING) {
      updateCrafting(dt);
    }

    // 줌 부드럽게 갱신 (PLAYING/BUILDING 모두)
    if (player) {
      const targetZoom = Math.max(ZOOM_MIN, Math.min(1.0, ZOOM_BASE / player.hitboxRadius));
      zoom += (targetZoom - zoom) * Math.min(1, dt * 3);
      EnemyManager.setZoom(zoom);
      WeaponSystem.setZoom(zoom);
      TetrisGrid.setZoom(zoom);
    }

    render();
  }

  function update(dt) {
    elapsedTime += dt;
    TetrisGrid.updateFlash(dt);

    // 일시정지 토글
    if (InputHandler.consumePause()) { togglePause(); return; }

    // 인벤토리 토글 (I 키)
    if (InputHandler.consumeInventory()) { inventoryOpen = !inventoryOpen; }

    // PLAYING 중 W/S 플래그 소비 (조립 화면에서만 사용, 누적 방지)
    InputHandler.consumeSelectPrev();
    InputHandler.consumeSelectNext();

    // Q키: 조립 화면 열기
    if (InputHandler.consumeOpenAssembly()) {
      if (TetrisGrid.hasQueued()) TetrisGrid.nextModule();
      setState(STATE.BUILDING);
      return;
    }

    // C키: 무기 조합창 열기
    if (InputHandler.consumeOpenCrafting()) {
      _craftList = TetrisGrid.getCraftableWeapons();
      _craftSelectIdx = 0; _craftSlotA = null; _craftSlotB = null; _craftRecipe = null;
      setState(STATE.CRAFTING);
      return;
    }

    const { cx, cy } = screenCenter();

    // 플레이어 업데이트
    player.update(dt, InputHandler.state, cx, cy);

    // 클릭 소비 — PLAYING 상태에서만 포탄 발사 트리거
    const clicked = InputHandler.consumeClick();

    // 전투 업데이트
    const activeEnemies = EnemyManager.getActiveEnemies();
    WeaponSystem.update(dt, player, activeEnemies, clicked);
    const { levelUp } = EnemyManager.update(dt, player);

    // 스테이지 매니저 업데이트 (환경 피해, 유성)
    const { cx: scCx, cy: scCy } = screenCenter();
    StageManager.update(dt, player, { cx: scCx, cy: scCy }, WeaponSystem.getActiveProjectiles());

    // 피격 이벤트 → 폭발 이펙트 생성
    for (const ev of WeaponSystem.consumeHitEvents()) {
      spawnExplosion(ev.wx, ev.wy, ev.color, ev.type, ev.splashR, ev.attr);
    }

    // 소행성 피격/충돌 이벤트 → 폭발 이펙트
    for (const ev of StageManager.consumeMeteorHitEvents()) {
      const col = ev.size === 'LARGE' ? '#92400e' : ev.size === 'MEDIUM' ? '#b45309' : '#d97706';
      spawnExplosion(ev.wx, ev.wy, col, 'auto', ev.radius * 1.8, 'KINETIC');
    }

    // 파티클 & 별 스크롤
    updateParticles(dt);
    updateStars(dt);

    // 게임오버 체크
    if (player.isDead) { gameOver(); return; }

    // 스테이지 클리어 감지 (보스 처치 = 스테이지 클리어)
    if (!_stageClearPending && EnemyManager.isStageClear()) {
      _stageClearPending = true;
      _triggerStageClear();
      return;
    }

    // 레벨업: 항상 업그레이드 카드
    if (levelUp) {
      showLevelUp();
    }

    // HUD 갱신
    updateHUD();
  }

  /**
   * BUILDING 상태 업데이트 — 조립 화면 클릭 및 건너뛰기 처리
   * 적·투사체 업데이트는 일시정지됨
   */
  function updateBuilding(dt) {
    // W/S키: 대기 모듈 선택 변경
    if (InputHandler.consumeSelectPrev()) TetrisGrid.cyclePending(-1);
    if (InputHandler.consumeSelectNext()) TetrisGrid.cyclePending(+1);

    // R키: 모듈 회전 (90° 시계방향)
    if (InputHandler.consumeRotate()) {
      TetrisGrid.rotatePending();
    }
    // E키: 함체 슬롯 증설 (스크랩 소모)
    if (InputHandler.consumeExpand()) {
      const cost = TetrisGrid.getExpandCost();
      if (player && player.scrap >= cost) {
        player.scrap -= cost;
        TetrisGrid.expandHullSlots(TetrisGrid.getExpandAmount());
      }
    }
    // 스킵: Space
    if (InputHandler.consumeSkip()) {
      setState(STATE.PLAYING);
      return;
    }
    // X키: 마우스가 그리드 모듈 위 → 장착해제 / 아니면 대기 모듈 파괴+스크랩
    if (InputHandler.consumeScrap()) {
      const { cx, cy } = screenCenter();
      const mx = InputHandler.state.mouseX, my = InputHandler.state.mouseY;
      const gx = Math.round((mx - cx) / 22);
      const gy = Math.round((my - cy) / 22);
      const gridMap = TetrisGrid.getGrid();
      const cellKey = `${gx},${gy}`;
      if (gridMap.has(cellKey) && gridMap.get(cellKey) !== 'CORE') {
        // 그리드 위 모듈 → 장착 해제 (인벤토리로)
        TetrisGrid.unequipModule(gx, gy, player);
      } else {
        // 대기 모듈 파괴 → 스크랩 획득
        const gained = TetrisGrid.scrapPending();
        if (gained > 0) player.scrap += gained;
      }
    }
    // 클릭(mousedown): 드래그 시작 시도 → 아니면 일반 배치
    if (InputHandler.consumeClick()) {
      const { cx, cy } = screenCenter();
      const mx = InputHandler.state.mouseX, my = InputHandler.state.mouseY;
      const gx = Math.round((mx - cx) / 22);
      const gy = Math.round((my - cy) / 22);
      const startedDrag = TetrisGrid.tryStartDrag(gx, gy, player);
      if (!startedDrag) {
        const placed = TetrisGrid.handleClick(mx, my, cx, cy, player);
        if (placed) setState(STATE.PLAYING);
      }
    }

    // mouseup: 드래그 중이면 드롭 처리
    if (InputHandler.consumeMouseReleased()) {
      if (TetrisGrid.isDragging()) {
        const { cx, cy } = screenCenter();
        TetrisGrid.endDrag(
          InputHandler.state.mouseX,
          InputHandler.state.mouseY,
          cx, cy, player
        );
        // 드롭 후 배치할 모듈(pending)이 남아있으면 조립 UI 유지, 없으면 닫기
        if (!TetrisGrid.hasPending()) setState(STATE.PLAYING);
      }
    }
  }

  /** 스테이지 클리어 트리거 — 보상 지급 후 STAGE_CLEAR 상태로 전환 */
  function _triggerStageClear() {
    // 중복 트리거 방지: EnemyManager에 소비 플래그 세팅
    EnemyManager.consumeStageClear();

    // 보상: 스크랩 + 모듈 드랍
    const cfg = window.GameConfig ?? {};
    const scrapReward   = cfg.STAGE_CLEAR_SCRAP   ?? 80;
    const moduleReward  = cfg.STAGE_CLEAR_MODULES ?? 2;
    if (player) player.scrap += scrapReward;
    for (let i = 0; i < moduleReward; i++) {
      TetrisGrid.queueRandomModule();
    }
    _stageClearTimer = STAGE_CLEAR_SHOW;
    setState(STATE.STAGE_CLEAR);
  }

  /** 스테이지 클리어 연출 업데이트 */
  function updateStageClear(dt) {
    _stageClearTimer -= dt;
    if (_stageClearTimer <= 0) {
      // 다음 스테이지로
      const hasNext = StageManager.advanceStage();
      _stageClearPending = false;
      setState(STATE.PLAYING);
    }
    // ESC나 Space로 스킵
    if (InputHandler.consumeSkip() || InputHandler.consumePause()) {
      _stageClearTimer = 0;
    }
  }

  /** 무기 조합창 업데이트 */
  function updateCrafting(dt) {
    // ESC/Space/C → 닫기
    if (InputHandler.consumePause() || InputHandler.consumeSkip() || InputHandler.consumeOpenCrafting()) {
      setState(STATE.PLAYING);
      return;
    }
    // W/S: 조합 목록 선택
    if (InputHandler.consumeSelectPrev()) {
      if (_craftList.length > 0) {
        _craftSelectIdx = (_craftSelectIdx - 1 + _craftList.length) % _craftList.length;
        _craftSlotA = null; _craftSlotB = null; _craftRecipe = null;
      }
    }
    if (InputHandler.consumeSelectNext()) {
      if (_craftList.length > 0) {
        _craftSelectIdx = (_craftSelectIdx + 1) % _craftList.length;
        _craftSlotA = null; _craftSlotB = null; _craftRecipe = null;
      }
    }
    // Enter/클릭: 선택한 조합 실행
    if (InputHandler.consumeClick() && _craftList.length > 0) {
      const recipe = _craftList[_craftSelectIdx];
      if (recipe) {
        const ok = TetrisGrid.craftCombine(
          recipe.anchorGxA, recipe.anchorGyA,
          recipe.anchorGxB, recipe.anchorGyB,
          recipe.result, player
        );
        if (ok) {
          // 조합 성공 → 목록 갱신
          _craftList = TetrisGrid.getCraftableWeapons();
          _craftSelectIdx = Math.min(_craftSelectIdx, _craftList.length - 1);
        }
      }
    }
  }

  function updateHUD() {
    // HP 바
    const hpRatio = player.hp / player.maxHp;
    elHpBar.style.width  = `${hpRatio * 100}%`;
    elHpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;

    // XP 바
    const xpRatio = player.xp / player.xpToNext;
    elXpBar.style.width  = `${xpRatio * 100}%`;
    elXpText.textContent = `Lv.${player.level}`;

    // 타이머
    const mins = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(elapsedTime % 60).toString().padStart(2, '0');
    elTimer.textContent = `${mins}:${secs}`;

    // 킬, 웨이브
    const stats = EnemyManager.getStats();
    elKillCount.textContent = stats.totalKills;
    elWaveNum.textContent   = stats.waveNumber;
    elWaveKill.textContent  = `${stats.waveKills}/${stats.waveKillTarget}`;

    // 휴식 오버레이
    if (stats.isResting) {
      elRestOverlay.classList.remove('hidden');
      elRestTimer.textContent = Math.ceil(stats.restTimer);
      // 다음 웨이브가 보스 웨이브인지 확인
      const nextWave = stats.waveNumber + 1;
      if (elRestTitle) {
        if (nextWave % 5 === 0) {
          elRestTitle.textContent  = '⚠ 보스 웨이브 ⚠';
          elRestTitle.style.color  = '#ef4444';
        } else {
          elRestTitle.textContent  = '다음 웨이브 준비';
          elRestTitle.style.color  = '#93c5fd';
        }
      }
    } else {
      elRestOverlay.classList.add('hidden');
    }

    // 모듈 뱃지
    const qSize = TetrisGrid.getQueueSize();
    elModuleCount.textContent = qSize;
    elModuleBadge.classList.toggle('hidden', qSize === 0);

    // 스크랩 표시
    if (elScrapCount) elScrapCount.textContent = player ? player.scrap : 0;
  }

  /**
   * 시너지 HUD — 캔버스 우측 상단에 속성 슬롯과 활성 시너지 렌더
   * @param {CanvasRenderingContext2D} ctx
   */
  function _drawSynergyHUD(ctx) {
    const counts  = SynergySystem.getAttrCounts();
    const effects = SynergySystem.getActiveEffects();
    const icons   = SynergySystem.ATTR_ICONS;

    // 장착된 무기 속성이 하나도 없으면 표시 안 함
    const hasAny  = Object.values(counts).some(v => v > 0);
    if (!hasAny) return;

    const W  = Renderer.getWidth();
    const x0 = W - 16;
    let   y  = 52; // 타이머 아래

    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '12px monospace';

    // 속성 카운트 표시 (아이콘×개수)
    const attrParts = [];
    for (const attr of SynergySystem.ATTRIBUTES) {
      if (counts[attr] > 0) attrParts.push(`${icons[attr]}×${counts[attr]}`);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(attrParts.join('  '), x0, y);
    y += 16;

    // 활성 시너지 목록
    const totalMult = SynergySystem.getDamageMult();
    if (effects.length > 0) {
      for (const ef of effects) {
        ctx.fillStyle = ef.color;
        ctx.fillText(`${ef.name} ×${ef.mult.toFixed(2)}`, x0, y);
        y += 14;
      }
      // 총 배율
      ctx.fillStyle = '#86efac';
      ctx.fillText(`총 배율 ×${totalMult.toFixed(2)}`, x0, y);
    }

    ctx.restore();
  }

  function render() {
    Renderer.clear();

    // 별 배경
    Renderer.drawStars(stars);

    if (state === STATE.START) return;

    if (!player) return;

    const { cx, cy } = screenCenter();
    const ctx = Renderer.getCtx();

    // 환경 오버레이 (색조 배경)
    const stageInfo = StageManager.getStage();
    Renderer.drawHazardOverlay(stageInfo.hazard, stageInfo.bgTint);

    // ── 줌 transform 적용 (화면 중앙 기준)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);

    // ── 게임 엔티티 렌더
    EnemyManager.draw(player);
    WeaponSystem.draw(player);
    drawParticles();

    // 플레이어 (화면 중앙 고정)
    player.draw(cx, cy);

    ctx.restore();

    // 유성 렌더 — 월드 좌표 → 화면 좌표 변환 (적과 동일한 방식)
    if (stageInfo.hazard === 'METEORS') {
      for (const m of StageManager.getMeteors()) {
        if (!m.active) continue;
        const msx = cx + (m.x - player.x);
        const msy = cy + (m.y - player.y);
        Renderer.drawMeteor(msx, msy, m.radius, m.vx, m.vy, m.size);
      }
    }

    // 보스 HP 바 (화면 하단 UI)
    const boss = EnemyManager.getBoss();
    if (boss) {
      Renderer.drawBossHpBar(boss.type, boss.hp, boss.maxHp);
    }

    // 시너지 HUD
    if (state === STATE.PLAYING || state === STATE.PAUSED || state === STATE.BUILDING) {
      _drawSynergyHUD(ctx);
    }

    // 스테이지 HUD (좌측 하단)
    _drawStageHUD(ctx);

    // BUILDING: 조립 UI
    if (state === STATE.BUILDING) {
      TetrisGrid.drawOnCanvas(
        ctx, cx, cy,
        InputHandler.state.mouseX,
        InputHandler.state.mouseY,
        player
      );
    }

    // CRAFTING: 무기 조합창
    if (state === STATE.CRAFTING) {
      _drawCraftingUI(ctx);
    }

    // STAGE_CLEAR: 스테이지 클리어 연출
    if (state === STATE.STAGE_CLEAR) {
      _drawStageClearOverlay(ctx);
    }

    // 인벤토리 패널
    if (inventoryOpen && (state === STATE.PLAYING || state === STATE.PAUSED)) {
      TetrisGrid.drawInventory(ctx, Renderer.getWidth(), Renderer.getHeight());
    }
  }

  /** 스테이지 HUD — 좌측 하단에 스테이지 번호와 환경 위험 배지 표시 */
  function _drawStageHUD(ctx) {
    const stage = StageManager.getStage();
    if (!stage) return;
    const W = Renderer.getWidth(), H = Renderer.getHeight();
    const x = 14, y = H - 14;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';

    const HAZARD_COLORS = { NONE:'#64748b', METEORS:'#f97316', CRYO:'#38bdf8', HEAT:'#ef4444', RADIATION:'#4ade80' };
    const HAZARD_ICONS  = { NONE:'', METEORS:'☄ 유성대', CRYO:'❄ 극저온', HEAT:'🔥 고열', RADIATION:'☢ 방사선' };

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Stage ${stage.id}: ${stage.name}`, x, y - 14);
    if (stage.hazard !== 'NONE') {
      ctx.fillStyle = HAZARD_COLORS[stage.hazard] ?? '#94a3b8';
      ctx.fillText(HAZARD_ICONS[stage.hazard] ?? stage.hazard, x, y);
    }
    ctx.restore();
  }

  /** 스테이지 클리어 연출 — 화면 중앙 오버레이 */
  function _drawStageClearOverlay(ctx) {
    const W = Renderer.getWidth(), H = Renderer.getHeight();
    const stage = StageManager.getStage();
    const nextStageNum = StageManager.getStageNumber() + 1;

    ctx.save();
    // 어두운 반투명 오버레이
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    ctx.textAlign = 'center';

    // 클리어 텍스트
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('STAGE CLEAR', cx, cy - 60);

    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(stage.nameFull ?? `Stage ${stage.id}`, cx, cy - 20);

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#86efac';
    const cfg = window.GameConfig ?? {};
    ctx.fillText(`Scrap +${cfg.STAGE_CLEAR_SCRAP ?? 80}  /  Module +${cfg.STAGE_CLEAR_MODULES ?? 2}`, cx, cy + 18);

    if (!StageManager.isLastStage()) {
      const nextDef = StageManager.getStageDefs()[StageManager.getStageNumber()]; // 0-based next
      if (nextDef) {
        ctx.font = '14px "Segoe UI", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`다음 스테이지 → ${nextDef.name}`, cx, cy + 50);
        ctx.fillStyle = '#64748b';
        ctx.fillText(nextDef.desc, cx, cy + 72);
      }
    } else {
      ctx.font = '18px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('모든 스테이지 완주!', cx, cy + 50);
    }

    // 자동 전환 타이머
    const ratio = Math.max(0, _stageClearTimer / STAGE_CLEAR_SHOW);
    ctx.fillStyle = 'rgba(251,191,36,0.3)';
    ctx.fillRect(cx - 100, cy + 95, 200 * (1 - ratio), 6);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 100, cy + 95, 200, 6);

    ctx.restore();
  }

  /** 무기 조합창 UI — 캔버스 기반 */
  function _drawCraftingUI(ctx) {
    const W = Renderer.getWidth(), H = Renderer.getHeight();
    const boxW = 520, boxH = 380;
    const bx = (W - boxW) / 2, by = (H - boxH) / 2;

    ctx.save();
    // 배경
    ctx.fillStyle = 'rgba(2,6,23,0.92)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, boxW, boxH);

    // 제목
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('⚗ 무기 조합창', bx + boxW / 2, by + 30);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('W/S: 선택 변경   Enter/클릭: 조합 실행   ESC/Space: 닫기', bx + boxW / 2, by + 48);

    if (_craftList.length === 0) {
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('조합 가능한 무기 조합이 없습니다.', bx + boxW / 2, by + boxH / 2);
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('2개 이상의 무기를 장착하고 조합 레시피가 필요합니다.', bx + boxW / 2, by + boxH / 2 + 22);
    } else {
      const itemH = 60;
      const listY = by + 65;
      const visibleCount = Math.min(_craftList.length, 4);
      const startIdx = Math.max(0, _craftSelectIdx - 1);

      for (let vi = 0; vi < visibleCount; vi++) {
        const idx = startIdx + vi;
        if (idx >= _craftList.length) break;
        const recipe = _craftList[idx];
        const ry = listY + vi * (itemH + 4);
        const selected = idx === _craftSelectIdx;

        // 행 배경
        ctx.fillStyle = selected ? 'rgba(251,191,36,0.12)' : 'rgba(15,23,42,0.7)';
        ctx.fillRect(bx + 12, ry, boxW - 24, itemH);
        if (selected) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx + 12, ry, boxW - 24, itemH);
        }

        // 조합 정보
        ctx.textAlign = 'left';
        ctx.font = `bold 13px "Segoe UI", sans-serif`;
        ctx.fillStyle = selected ? '#fbbf24' : '#e2e8f0';
        ctx.fillText(`${recipe.keyA}  +  ${recipe.keyB}  →  ${recipe.name}`, bx + 20, ry + 20);

        ctx.font = '11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(recipe.desc, bx + 20, ry + 38);

        // 결과 아이콘
        ctx.textAlign = 'right';
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#4ade80';
        ctx.fillText('[Enter]', bx + boxW - 20, ry + 28);
      }
    }

    ctx.restore();
  }

  // ────────────────────────────── 엔트리 포인트 ──────────────────────────────

  // DOM 로드 완료 후 시작
  window.addEventListener('DOMContentLoaded', init);

  return { getState: () => state, getPlayer: () => player };
})();

window.Game = Game;
