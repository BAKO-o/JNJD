/**
 * InputHandler.js — 입력 관리 모듈
 * WASD 키보드 상태, 마우스 위치·방향각을 추적한다.
 * 다른 모듈은 InputHandler.state 객체를 읽기만 한다 (폴링 방식).
 */

const InputHandler = (() => {
  // 현재 입력 상태 스냅샷
  const state = {
    up: false,     // W
    down: false,   // S
    left: false,   // A
    right: false,  // D
    mouseX: 0,     // 화면 기준 마우스 X
    mouseY: 0,     // 화면 기준 마우스 Y
    mouseAngle: 0, // 플레이어→마우스 방향각 (라디안), Game에서 매 프레임 갱신
    pause: false,  // ESC 또는 P (한 프레임만 true — 폴링 후 리셋)
  };

  // 키 코드 → state 필드 매핑
  const KEY_MAP = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
  };

  function onKeyDown(e) {
    if (e.repeat) return; // 키 반복 이벤트 무시
    if (KEY_MAP[e.code]) state[KEY_MAP[e.code]] = true;
    if (e.code === 'Escape' || e.code === 'KeyP') state.pause = true;
  }

  function onKeyUp(e) {
    if (KEY_MAP[e.code]) state[KEY_MAP[e.code]] = false;
  }

  function onMouseMove(e) {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
  }

  /** 초기화: 이벤트 리스너 등록 */
  function init() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
  }

  /** 일시정지 플래그를 소비하고 반환 (한 프레임에 한 번만 true) */
  function consumePause() {
    const v = state.pause;
    state.pause = false;
    return v;
  }

  return { init, state, consumePause };
})();

// ES Module 방식으로 전역 접근 허용
window.InputHandler = InputHandler;
