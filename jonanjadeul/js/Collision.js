/**
 * Collision.js — 충돌 판정 유틸리티 모듈
 * Circle-Circle 충돌이 핵심이며, wraparound 맵에 대응한다.
 */

const Collision = (() => {

  /**
   * 두 원의 충돌 여부 (일반 평면)
   * @param {number} ax, ay - 원 A 중심
   * @param {number} ar - 원 A 반지름
   * @param {number} bx, by - 원 B 중심
   * @param {number} br - 원 B 반지름
   * @returns {boolean}
   */
  function circleCircle(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    const distSq = dx * dx + dy * dy;
    const radSum = ar + br;
    return distSq <= radSum * radSum;
  }

  /**
   * Wraparound 맵을 고려한 두 엔티티의 최단 거리 (제곱)
   * 맵 경계를 넘는 경우에도 올바른 거리를 계산한다.
   * @param {number} ax, ay - 엔티티 A 좌표
   * @param {number} bx, by - 엔티티 B 좌표
   * @param {number} worldW - 맵 너비
   * @param {number} worldH - 맵 높이
   * @returns {number} 최단 거리 제곱
   */
  function wrappedDistSq(ax, ay, bx, by, worldW, worldH) {
    let dx = Math.abs(ax - bx);
    let dy = Math.abs(ay - by);
    // 반바퀴 이상이면 반대 방향이 더 짧다
    if (dx > worldW * 0.5) dx = worldW - dx;
    if (dy > worldH * 0.5) dy = worldH - dy;
    return dx * dx + dy * dy;
  }

  /**
   * Wraparound 맵을 고려한 두 원의 충돌 여부
   */
  function circleCircleWrapped(ax, ay, ar, bx, by, br, worldW, worldH) {
    const distSq = wrappedDistSq(ax, ay, bx, by, worldW, worldH);
    const radSum = ar + br;
    return distSq <= radSum * radSum;
  }

  /**
   * 두 엔티티 간 Wraparound 방향벡터 (정규화 전, dx dy 반환)
   * 이동 AI·추적에서 "어느 방향으로 가야 하는가"를 계산할 때 사용.
   */
  function wrappedDelta(ax, ay, bx, by, worldW, worldH) {
    let dx = bx - ax;
    let dy = by - ay;
    if (dx >  worldW * 0.5) dx -= worldW;
    if (dx < -worldW * 0.5) dx += worldW;
    if (dy >  worldH * 0.5) dy -= worldH;
    if (dy < -worldH * 0.5) dy += worldH;
    return { dx, dy };
  }

  return { circleCircle, wrappedDistSq, circleCircleWrapped, wrappedDelta };
})();

window.Collision = Collision;
