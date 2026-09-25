import type { InputFrame } from '../sim/types';

const LEFT = ['ArrowLeft', 'KeyA'], RIGHT = ['ArrowRight', 'KeyD'], UP = ['ArrowUp', 'KeyW'], DOWN = ['ArrowDown', 'KeyS'];
export const MOVE_CODES: ReadonlySet<string> = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN]);

export function axisFromKeys(keys: ReadonlySet<string>): InputFrame {
  const has = (codes: string[]) => codes.some(c => keys.has(c));
  return { dx: (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0), dy: (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0) };
}

export type KeyboardHandlers = { onPause(): void; onMute(): void; onChoose(index: number): void };
export function attachKeyboard(target: Window, handlers: KeyboardHandlers) {
  const keys = new Set<string>();
  const down = (e: KeyboardEvent) => {
    if (MOVE_CODES.has(e.code)) { keys.add(e.code); e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'KeyP' || e.code === 'Escape') handlers.onPause();
    else if (e.code === 'KeyM') handlers.onMute();
    else if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') handlers.onChoose(Number(e.code.slice(5)) - 1);
  };
  const up = (e: KeyboardEvent) => { keys.delete(e.code); };
  target.addEventListener('keydown', down as EventListener);
  target.addEventListener('keyup', up as EventListener);
  return {
    keys,
    /** On blur or hidden tab: drop held keys so the Friend does not drift. */
    release: () => keys.clear(),
    dispose: () => { target.removeEventListener('keydown', down as EventListener); target.removeEventListener('keyup', up as EventListener); keys.clear(); },
  };
}
