/**
 * Game.js — 메인 게임 루프 & 상태머신 오케스트레이터
 *
 * 상태: START → PLAYING ↔ PAUSED → LEVELUP → PLAYING → GAMEOVER
 *
 * 의존 모듈 (window 전역으로 노출됨):
 *   InputHandler, Renderer, Collision, Player, EnemyManager, WeaponSystem
 */

'use strict';

const VERSION = 'v0.6.0'; // 웨이브 킬 목표, 물리 모듈 드랍, 10종 무기 모듈

// ── 맵 설정 (화면 크기와 무관한 고정 월드 크기)
const WORLD_W = 3200;
const WORLD_H = 1800;

// ── 상태 열거
const STATE = {
  START:    'START',
  PLAYING:  'PLAYING',
  PAUSED:   'PAUSED',
  LEVELUP:  'LEVELUP',
  BUILDING: 'BUILDING', // Phase 3: 테트리스 모듈 조립
  GAMEOVER: 'GAMEOVER',
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

  // ── 엔티티
  let player = null;

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

  const elOverlayPause    = document.getElementById('overlay-pause');
  const elOverlayLevelup  = document.getElementById('overlay-levelup');
  const elOverlayGameover = document.getElementById('overlay-gameover');
  const elOverlayStart    = document.getElementById('overlay-start');
  const elGameoverStats   = document.getElementById('gameover-stats');
  const elUpgradeChoices  = document.getElementById('upgrade-choices');
  const elModuleBadge     = document.getElementById('module-badge');
  const elModuleCount     = document.getElementById('module-count');

  // ── 업그레이드 선택지 정의 (Phase 4 확장 예정)
  const UPGRADE_POOL = [
    {
      id: 'song_firepower', icon: '🔫', name: '송: 화력 증가',
      desc: '무기 데미지 +25%',
      apply: (p) => { p.damageMult += 0.25; }
    },
    {
      id: 'song_hull', icon: '🛡️', name: '송: 선체 강화',
      desc: '최대 HP +40',
      apply: (p) => { p.maxHp += 40; p.hp = Math.min(p.hp + 40, p.maxHp); }
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
      id: 'hak_heal', icon: '💉', name: '학: 긴급 수리',
      desc: 'HP +30 즉시 회복',
      apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + 30); }
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
      });
    }
  }

  /** 파티클 업데이트 & 렌더링 */
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.lifetime) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - p.age / p.lifetime;
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const { sx, sy } = player.worldToScreen(p.x, p.y, WORLD_W, WORLD_H);
      Renderer.drawParticle(sx, sy, p.radius, p.alpha, p.color);
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
    particles.length = 0;
    elapsedTime = 0;

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

    // DOM 오버레이 제어 (BUILDING은 캔버스 기반이므로 DOM 불필요)
    elOverlayPause.classList.toggle('hidden',    state !== STATE.PAUSED);
    elOverlayLevelup.classList.toggle('hidden',  state !== STATE.LEVELUP);
    elOverlayGameover.classList.toggle('hidden', state !== STATE.GAMEOVER);
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
    } else if (state === STATE.BUILDING) {
      updateBuilding();
    }

    render();
  }

  function update(dt) {
    elapsedTime += dt;

    // 일시정지 토글
    if (InputHandler.consumePause()) { togglePause(); return; }

    // Q키: 보유 모듈 있을 때 조립 화면 열기
    if (InputHandler.consumeOpenAssembly()) {
      if (TetrisGrid.hasQueued()) {
        TetrisGrid.nextModule();
        setState(STATE.BUILDING);
      }
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

    // 파티클 & 별 스크롤
    updateParticles(dt);
    updateStars(dt);

    // 게임오버 체크
    if (player.isDead) { gameOver(); return; }

    // 레벨업: 항상 업그레이드 카드 (모듈은 적 처치로 확률 드랍)
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
  function updateBuilding() {
    // 스킵: Space
    if (InputHandler.consumeSkip()) {
      setState(STATE.PLAYING);
      return;
    }
    // 클릭: 유효 슬롯에 배치 시도
    if (InputHandler.consumeClick()) {
      const { cx, cy } = screenCenter();
      const placed = TetrisGrid.handleClick(
        InputHandler.state.mouseX,
        InputHandler.state.mouseY,
        cx, cy, player
      );
      if (placed) setState(STATE.PLAYING);
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
    } else {
      elRestOverlay.classList.add('hidden');
    }

    // 모듈 뱃지
    const qSize = TetrisGrid.getQueueSize();
    elModuleCount.textContent = qSize;
    elModuleBadge.classList.toggle('hidden', qSize === 0);
  }

  function render() {
    Renderer.clear();

    // 별 배경
    Renderer.drawStars(stars);

    if (state === STATE.START) return; // 게임 시작 전 캔버스는 빈 우주

    if (!player) return;

    const { cx, cy } = screenCenter();

    // ── 게임 엔티티 렌더 (플레이어 중심 기준)
    EnemyManager.draw(player);
    WeaponSystem.draw(player);
    drawParticles();

    // 플레이어 (화면 중앙 고정)
    player.draw(cx, cy);

    // BUILDING: 조립 UI를 게임 화면 위에 오버레이로 그린다
    if (state === STATE.BUILDING) {
      TetrisGrid.drawOnCanvas(
        Renderer.getCtx(), cx, cy,
        InputHandler.state.mouseX,
        InputHandler.state.mouseY
      );
    }
  }

  // ────────────────────────────── 엔트리 포인트 ──────────────────────────────

  // DOM 로드 완료 후 시작
  window.addEventListener('DOMContentLoaded', init);

  return { getState: () => state, getPlayer: () => player };
})();

window.Game = Game;
