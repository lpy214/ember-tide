// Keyboard and mouse state, read fresh each frame. The game is played with
// WASD or arrows to move, Space or Shift to dash, mouse to steer and aim,
// P to pause, M to mute, Enter to start, R to restart, 1-3 to pick upgrades.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    mouseSeen: false,
    pressed: new Set(),
    /** True once for the frame the key went down. */
    wasPressed(code) {
      return input.pressed.has(code);
    },
  };

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!keys.has(event.code)) input.pressed.add(event.code);
    keys.add(event.code);
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * 720;
    input.mouseSeen = true;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    input.mouseDown = true;
    input.pressed.add('Mouse');
  }
  function onMouseUp() {
    input.mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  input.axis = function axis() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  };

  input.endFrame = function endFrame() {
    input.pressed.clear();
  };

  return input;
}
