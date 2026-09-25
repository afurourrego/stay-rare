import type { WeaponId } from '../sim/types';
import { linePoints } from './pixel';

/** Pixel shapes of projectiles, centred on (0, 0) and oriented by `angle`: '#' ink, 'y' signal, 'p' paper, 'g' grey. */
export type ShotPixel = { x: number; y: number; c: '#' | 'y' | 'p' | 'g' };

function stamp(out: ShotPixel[], x: number, y: number, c: ShotPixel['c']) { out.push({ x: Math.round(x), y: Math.round(y), c }); }
function outlined(core: [number, number][], fill: ShotPixel['c']): ShotPixel[] {
  const key = (x: number, y: number) => `${x},${y}`, set = new Set(core.map(([x, y]) => key(x, y))), out: ShotPixel[] = [];
  for (const [x, y] of core) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!set.has(key(x + dx, y + dy))) { stamp(out, x + dx, y + dy, '#'); }
  for (const [x, y] of core) stamp(out, x, y, fill);
  return out;
}
const disc = (r: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) if (x * x + y * y <= r * r + 0.3) pts.push([x, y]);
  return pts;
};

export function shotPixels(weapon: WeaponId | undefined, angle: number, child = false): ShotPixel[] {
  const cx = Math.cos(angle), cy = Math.sin(angle);
  switch (weapon) {
    case 'boneBolt': { // a little bone: a stick with a knob at each end
      const stick = linePoints(-cx * 3, -cy * 3, cx * 3, cy * 3);
      const out = outlined([...stick, ...[1, -1].flatMap(s => [[Math.round(cx * 3 * s + cy), Math.round(cy * 3 * s - cx)], [Math.round(cx * 3 * s - cy), Math.round(cy * 3 * s + cx)]] as [number, number][])], 'p');
      return out;
    }
    case 'offsetShot': { // an arrow: grey fletching, ink shaft, signal head in front
      const out: ShotPixel[] = [];
      for (const [x, y] of linePoints(-cx * 3, -cy * 3, cx * 2, cy * 2)) stamp(out, x, y, '#');
      stamp(out, -cx * 3 + cy, -cy * 3 - cx, 'g'); stamp(out, -cx * 3 - cy, -cy * 3 + cx, 'g');
      for (const [x, y] of [[3, 0], [2, 1], [2, -1]]) stamp(out, cx * x - cy * y, cy * x + cx * y, 'y');
      return out;
    }
    case 'splitCell': { // a cell with a nucleus; children are smaller
      const out = outlined(disc(child ? 1 : 2), 'y');
      stamp(out, 0, 0, 'p');
      return out;
    }
    case 'glitterBounce': return outlined([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]], 'y');
    default: return outlined([[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], 'y');
  }
}
