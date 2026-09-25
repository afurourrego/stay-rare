import type { InputFrame } from '../sim/types';

export function joystickVector(ox: number, oy: number, px: number, py: number, radius = 60): InputFrame {
  let dx = (px - ox) / radius, dy = (py - oy) / radius;
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  return { dx, dy };
}

/** Drag anywhere on `el` (except buttons and [data-ui]) to steer; also works with a mouse. */
export function attachJoystick(el: HTMLElement) {
  let id: number | null = null, ox = 0, oy = 0, vec: InputFrame = { dx: 0, dy: 0 };
  const isUi = (t: EventTarget | null) => t instanceof Element && t.closest('button, [data-ui]') !== null;
  const down = (e: PointerEvent) => {
    if (id !== null || isUi(e.target)) return;
    id = e.pointerId; ox = e.clientX; oy = e.clientY; vec = { dx: 0, dy: 0 };
    el.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => { if (e.pointerId === id) vec = joystickVector(ox, oy, e.clientX, e.clientY); };
  const up = (e: PointerEvent) => { if (e.pointerId === id) { id = null; vec = { dx: 0, dy: 0 }; } };
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  return {
    vector: () => vec,
    active: () => id !== null,
    release: () => { id = null; vec = { dx: 0, dy: 0 }; },
    dispose: () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    },
  };
}
