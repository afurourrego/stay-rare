import { TICK_HZ, type Obstacle } from './types';

export function clampToWorld(v: number, r: number, max: number): number { return Math.min(max - r, Math.max(r, v)); }

/** Move `e` toward `target` at `speed` px/s for one tick. */
export function chase(e: { x: number; y: number }, target: { x: number; y: number }, speed: number): void {
  const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy) || 1;
  e.x += dx / d * speed / TICK_HZ;
  e.y += dy / d * speed / TICK_HZ;
}

const CELL = 128, MAX_MOVER_RADIUS = 48; // largest boss radius
/** Static obstacle buckets, built once per obstacle list (obstacles never change during a run). */
const buckets = new WeakMap<readonly Obstacle[], Map<number, Obstacle[]>>();
function bucketsFor(obstacles: readonly Obstacle[]): Map<number, Obstacle[]> {
  let map = buckets.get(obstacles);
  if (map) return map;
  map = new Map();
  for (const o of obstacles) {
    const reach = o.r + MAX_MOVER_RADIUS; // any mover whose centre is in these cells can touch the obstacle
    for (let cx = Math.floor((o.x - reach) / CELL); cx <= Math.floor((o.x + reach) / CELL); cx++)
      for (let cy = Math.floor((o.y - reach) / CELL); cy <= Math.floor((o.y + reach) / CELL); cy++) {
        const k = cx * 4096 + cy, list = map.get(k);
        if (list) list.push(o); else map.set(k, [o]);
      }
  }
  buckets.set(obstacles, map);
  return map;
}

/** Push a circle out of every obstacle it overlaps (two passes for corners); keeps the tangential motion, so movers slide. */
export function pushOut(p: { x: number; y: number }, r: number, obstacles: readonly Obstacle[]): void {
  if (!obstacles.length) return;
  const map = bucketsFor(obstacles);
  for (let pass = 0; pass < 2; pass++) {
    const near = map.get(Math.floor(p.x / CELL) * 4096 + Math.floor(p.y / CELL));
    if (!near) return;
    for (const o of near) {
      const min = o.r + r, dx = p.x - o.x, dy = p.y - o.y, d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      if (d2 === 0) { p.x = o.x + min; continue; }
      const k = min / Math.sqrt(d2);
      p.x = o.x + dx * k; p.y = o.y + dy * k;
    }
  }
}

/** The obstacle a circle overlaps, if any (shots stop on solid scenery). */
export function obstacleAt(p: { x: number; y: number }, r: number, obstacles: readonly Obstacle[]): Obstacle | null {
  if (!obstacles.length) return null;
  const near = bucketsFor(obstacles).get(Math.floor(p.x / CELL) * 4096 + Math.floor(p.y / CELL));
  return near?.find(o => (p.x - o.x) ** 2 + (p.y - o.y) ** 2 < (o.r + r) ** 2) ?? null;
}
