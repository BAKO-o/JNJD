/**
 * Renderer.js — Canvas 렌더링 헬퍼 모듈
 * 캔버스 컨텍스트를 관리하고, 자주 쓰는 draw 함수를 제공한다.
 * 외부 이미지 없이 Canvas 기본 API(arc, fillRect, beginPath 등)만 사용.
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
   * 적 기체 그리기 (붉은 마름모형)
   * @param {number} sx - 화면 X
   * @param {number} sy - 화면 Y
   * @param {number} angle - 이동 방향각
   * @param {number} radius - 적 반지름
   * @param {number} hpRatio - HP 비율 (0~1), 색상 변화에 사용
   */
  function drawEnemy(sx, sy, angle, radius, hpRatio = 1) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // HP에 따라 색상 변이: 빨강(건강) → 주황(위험)
    const r = 220;
    const g = Math.floor(30 + (1 - hpRatio) * 80);
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(0, -radius * 0.65);
    ctx.lineTo(-radius * 0.8, 0);
    ctx.lineTo(0, radius * 0.65);
    ctx.closePath();
    ctx.fillStyle = `rgb(${r},${g},30)`;
    ctx.fill();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
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
