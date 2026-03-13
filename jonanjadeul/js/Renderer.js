/**
 * Renderer.js — Canvas 렌더링 헬퍼 모듈
 * 캔버스 컨텍스트를 관리하고, 자주 쓰는 draw 함수를 제공한다.
 * 외부 이미지 없이 Canvas 기본 API(arc, fillRect, beginPath 등)만 사용.
 * v0.5.0: drawEnemy() 10종 타입별 모양 분기 추가.
 */

const Renderer = (() => {
  let canvas, ctx;

  /** 초기화: canvas 엘리먼트를 받아 컨텍스트 설정 */
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  /** 캔버스를 뷰포트 크기에 맞게 조정 */
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /** 매 프레임 시작 시 배경 클리어 */
  function clear() {
    ctx.fillStyle = '#00020c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /** 별 배경: Game에서 stars 배열을 넘기면 그린다 */
  function drawStars(stars) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const s of stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillRect(s.sx, s.sy, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * 플레이어 함선 그리기
   * @param {number} sx - 화면 X
   * @param {number} sy - 화면 Y
   * @param {number} angle - 회전각 (라디안)
   * @param {number} radius - 함선 반지름
   * @param {boolean} shieldActive - 방어막 표시 여부 (Phase 4)
   */
  function drawPlayer(sx, sy, angle, radius, shieldActive = false) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // 기체 본체 — 파란 삼각형
    ctx.beginPath();
    ctx.moveTo(radius, 0);            // 앞부분 (마우스 방향)
    ctx.lineTo(-radius * 0.6, -radius * 0.7);
    ctx.lineTo(-radius * 0.35, 0);
    ctx.lineTo(-radius * 0.6, radius * 0.7);
    ctx.closePath();
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#74b9ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 조종석 하이라이트
    ctx.beginPath();
    ctx.arc(radius * 0.2, 0, radius * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#93c5fd';
    ctx.fill();

    // 엔진 불꽃 (항상 표시)
    ctx.beginPath();
    ctx.moveTo(-radius * 0.35, -radius * 0.3);
    ctx.lineTo(-radius * 0.7 - Math.random() * radius * 0.3, 0);
    ctx.lineTo(-radius * 0.35, radius * 0.3);
    ctx.fillStyle = 'rgba(251,191,36,0.7)';
    ctx.fill();

    // 방어막 원 (Phase 4 시각화용)
    if (shieldActive) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(96,165,250,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 적 그리기 — 타입별 10가지 형태
   * @param {number} sx, sy - 화면 좌표
   * @param {number} angle - 이동 방향각
   * @param {number} radius - 적 반지름
   * @param {number} hpRatio - HP 비율 (0~1)
   * @param {string} type - 적 타입 키
   * @param {number} shadeAlpha - SHADE 타입 투명도 (0~1)
   */
  function drawEnemy(sx, sy, angle, radius, hpRatio = 1, type = 'RAIDER', shadeAlpha = 1) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    switch (type) {
      case 'RAIDER':     _drawRaider(radius, hpRatio);          break;
      case 'JUGGERNAUT': _drawJuggernaut(radius, hpRatio);      break;
      case 'SWARM':      _drawSwarm(radius, hpRatio);            break;
      case 'LANCER':     _drawLancer(radius, hpRatio);           break;
      case 'ANCHOR':     _drawAnchor(radius, hpRatio);           break;
      case 'ZIGZAGGER':  _drawZigzagger(radius, hpRatio);        break;
      case 'DASHER':     _drawDasher(radius, hpRatio);           break;
      case 'SHADE':      _drawShade(radius, hpRatio, shadeAlpha);break;
      case 'BOMBER':     _drawBomber(radius, hpRatio);           break;
      case 'SPLITTER':   _drawSplitter(radius, hpRatio);         break;
      default:           _drawRaider(radius, hpRatio);           break;
    }

    ctx.restore();
  }

  // ── 공통 헬퍼: HP로 색상 강도 조정 ──────────────────
  function _hpFlicker(hpRatio) {
    // HP가 낮을수록 약간 밝게 (위험 시 주의 강조)
    return hpRatio > 0.3 ? 1 : 0.85 + Math.sin(Date.now() * 0.01) * 0.15;
  }

  // ── 1. RAIDER (약탈자) — 붉은 마름모 ──────────────────
  function _drawRaider(r, hp) {
    const rg = Math.floor(30 + (1 - hp) * 80);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(0, -r * 0.65);
    ctx.lineTo(-r * 0.8, 0);
    ctx.lineTo(0, r * 0.65);
    ctx.closePath();
    ctx.fillStyle = `rgb(220,${rg},30)`;
    ctx.fill();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── 2. JUGGERNAUT (중장갑함) — 짙은 회색 육각형 ─────────
  function _drawJuggernaut(r, hp) {
    const bright = Math.floor(80 + (1 - hp) * 40);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
      else         ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = `rgb(${bright},${bright},${bright + 10})`;
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 장갑판 표시선
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.4); ctx.lineTo(r * 0.4, 0);
    ctx.moveTo(-r * 0.4, r * 0.4);  ctx.lineTo(r * 0.4, 0);
    ctx.strokeStyle = 'rgba(150,180,200,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── 3. SWARM (군집체) — 작은 청록 삼각형 ─────────────────
  function _drawSwarm(r, hp) {
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.8, -r * 0.8);
    ctx.lineTo(-r * 0.8, r * 0.8);
    ctx.closePath();
    ctx.fillStyle = hp > 0.5 ? '#22d3ee' : '#67e8f9';
    ctx.fill();
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // ── 4. LANCER (돌격창) — 주황 세장형 화살촉 ─────────────
  function _drawLancer(r, hp) {
    const g = Math.floor(100 + (1 - hp) * 50);
    ctx.beginPath();
    ctx.moveTo(r * 1.8, 0);
    ctx.lineTo(-r * 0.5, -r * 0.4);
    ctx.lineTo(-r * 0.7, 0);
    ctx.lineTo(-r * 0.5, r * 0.4);
    ctx.closePath();
    ctx.fillStyle = `rgb(240,${g},20)`;
    ctx.fill();
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── 5. ANCHOR (방파제) — 매우 큰 암적색 사각형 ───────────
  function _drawAnchor(r, hp) {
    const dark = Math.floor(60 + (1 - hp) * 30);
    const half = r * 0.85;
    ctx.fillStyle = `rgb(${dark + 30},${dark},${dark})`;
    ctx.fillRect(-half, -half, half * 2, half * 2);
    // 십자 보강재
    ctx.strokeStyle = `rgba(180,50,50,0.6)`;
    ctx.lineWidth = 3;
    ctx.strokeRect(-half, -half, half * 2, half * 2);
    ctx.beginPath();
    ctx.moveTo(0, -half); ctx.lineTo(0, half);
    ctx.moveTo(-half, 0); ctx.lineTo(half, 0);
    ctx.strokeStyle = 'rgba(160,30,30,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ── 6. ZIGZAGGER (지그재그) — 노란 번개 모양 ─────────────
  function _drawZigzagger(r, hp) {
    const b = Math.floor(50 + (1 - hp) * 40);
    ctx.beginPath();
    // 번개볼트형 폴리곤
    ctx.moveTo(r * 0.6, -r);
    ctx.lineTo(-r * 0.1, -r * 0.1);
    ctx.lineTo(r * 0.5, -r * 0.1);
    ctx.lineTo(-r * 0.6, r);
    ctx.lineTo(r * 0.1, r * 0.1);
    ctx.lineTo(-r * 0.5, r * 0.1);
    ctx.closePath();
    ctx.fillStyle = `rgb(234,${179 + b},8)`;
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── 7. DASHER (돌진형) — 마젠타 유선형 ───────────────────
  function _drawDasher(r, hp) {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.lineTo(-r * 0.3, -r * 0.55);
    ctx.lineTo(-r * 0.9, -r * 0.2);
    ctx.lineTo(-r * 0.9, r * 0.2);
    ctx.lineTo(-r * 0.3, r * 0.55);
    ctx.closePath();
    ctx.fillStyle = `rgba(217,70,239,${pulse})`;
    ctx.fill();
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 속도선
    ctx.strokeStyle = 'rgba(240,171,252,0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.15 * i);
      ctx.lineTo(-r * 0.4 - r * 0.4 * (i / 3), -r * 0.15 * i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.15 * i);
      ctx.lineTo(-r * 0.4 - r * 0.4 * (i / 3), r * 0.15 * i);
      ctx.stroke();
    }
  }

  // ── 8. SHADE (암영체) — 반투명 남색 유령 ─────────────────
  function _drawShade(r, hp, shadeAlpha) {
    ctx.globalAlpha = shadeAlpha;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r * 0.2, -r * 0.9);
    ctx.lineTo(-r * 0.6, -r * 0.7);
    ctx.lineTo(-r * 0.9, 0);
    ctx.lineTo(-r * 0.6, r * 0.7);
    ctx.lineTo(r * 0.2, r * 0.9);
    ctx.closePath();
    ctx.fillStyle = `rgba(67,56,202,0.9)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(165,180,252,0.7)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    // 중심 글로우
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(165,180,252,0.4)';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── 9. BOMBER (자폭체) — 주황 원형 + 링 ─────────────────
  function _drawBomber(r, hp) {
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.005);
    // 외부 글로우 링
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251,146,60,${pulse * 0.25})`;
    ctx.fill();
    // 본체 원
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const g = Math.floor(80 + (1 - hp) * 30);
    ctx.fillStyle = `rgb(239,${g},30)`;
    ctx.fill();
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 십자 퓨즈 표시
    ctx.strokeStyle = 'rgba(255,200,100,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0);
    ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5);
    ctx.stroke();
  }

  // ── 10. SPLITTER (분열체) — 초록 분열 마름모 ─────────────
  function _drawSplitter(r, hp) {
    const g = Math.floor(150 + (1 - hp) * 50);
    // 외부 마름모
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(0, -r * 0.8);
    ctx.lineTo(-r * 0.9, 0);
    ctx.lineTo(0, r * 0.8);
    ctx.closePath();
    ctx.fillStyle = `rgb(20,${g},40)`;
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 분열 균열선 (중앙 대각)
    ctx.strokeStyle = 'rgba(74,222,128,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.8, 0);
    ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6);
    ctx.stroke();
    // 내부 소형 마름모 (분열될 것임을 암시)
    ctx.beginPath();
    ctx.moveTo(r * 0.35, 0);
    ctx.lineTo(0, -r * 0.3);
    ctx.lineTo(-r * 0.35, 0);
    ctx.lineTo(0, r * 0.3);
    ctx.closePath();
    ctx.fillStyle = 'rgba(134,239,172,0.5)';
    ctx.fill();
  }

  /**
   * 투사체 그리기 (작은 빛나는 원)
   * @param {number} sx - 화면 X
   * @param {number} sy - 화면 Y
   * @param {number} radius - 투사체 반지름
   * @param {string} color - 색상 (기본: 노란빛)
   */
  function drawProjectile(sx, sy, radius, color = '#fde68a') {
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // 글로우 효과
    ctx.beginPath();
    ctx.arc(sx, sy, radius * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(253,230,138,0.22)';
    ctx.fill();
  }

  /**
   * XP 젬 그리기 (작은 다이아몬드)
   * @param {number} sx - 화면 X
   * @param {number} sy - 화면 Y
   */
  function drawXpGem(sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fillStyle = '#34d399';
    ctx.fill();
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 포탄 그리기 (크고 주황빛 나는 원)
   * @param {number} sx - 화면 X
   * @param {number} sy - 화면 Y
   * @param {number} radius - 포탄 반지름
   */
  function drawCannonball(sx, sy, radius) {
    // 핵심 원
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fb923c';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 글로우
    ctx.beginPath();
    ctx.arc(sx, sy, radius * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,146,60,0.2)';
    ctx.fill();
  }

  /**
   * 파티클(폭발) 그리기
   * @param {object} p - particle {sx, sy, radius, alpha, color}
   */
  function drawParticle(sx, sy, radius, alpha, color) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** 컨텍스트 직접 접근용 getter */
  function getCtx() { return ctx; }
  function getCanvas() { return canvas; }
  function getWidth() { return canvas.width; }
  function getHeight() { return canvas.height; }

  return {
    init, clear, drawStars,
    drawPlayer, drawEnemy,
    drawProjectile, drawCannonball, drawXpGem, drawParticle,
    getCtx, getCanvas, getWidth, getHeight,
  };
})();

window.Renderer = Renderer;
