import { WORLD } from './content';
import { createRng, nextFloat, nextInt } from './rng';
import type { Obstacle } from './types';

/** Scenery layout (shared by the sim for collision and the renderer for art). Deterministic by run seed. */
export const SDK_DECOR = ['tree', 'rock', 'flower', 'reeds', 'crate', 'bench', 'planter', 'terminal', 'tank', 'antenna', 'crystal', 'vent', 'solar', 'dish'] as const;
export const OWN_DECOR = ['grass', 'tuft', 'pebble'] as const;
export const DECOR_TYPES = [...SDK_DECOR, ...OWN_DECOR] as const;
export type DecorType = typeof DECOR_TYPES[number];
export type DecorItem = Readonly<{ type: DecorType; x: number; y: number }>;

const WEIGHTS: readonly [DecorType, number][] = [
  ['grass', 22], ['tuft', 14], ['tree', 14], ['rock', 9], ['flower', 9], ['pebble', 6], ['reeds', 5], ['crystal', 4],
  ['crate', 3], ['bench', 2], ['planter', 2], ['terminal', 3], ['tank', 2], ['antenna', 2], ['vent', 1], ['solar', 1], ['dish', 1],
];
const TOTAL = WEIGHTS.reduce((s, [, w]) => s + w, 0);
const CELL = 150, CLEAR = 280; // open clearing around the start: nothing to hide behind while idle

/** Deterministic scenery for a run, sorted by y so taller props overlap correctly. */
export function decorLayout(seed: number): DecorItem[] {
  const rng = createRng((seed ^ 0xdec0) >>> 0), items: DecorItem[] = [];
  for (let cy = 0; cy < Math.ceil(WORLD.height / CELL); cy++) for (let cx = 0; cx < Math.ceil(WORLD.width / CELL); cx++) {
    const n = nextFloat(rng) < 0.6 ? 1 + (nextFloat(rng) < 0.3 ? 1 : 0) : 0;
    for (let k = 0; k < n; k++) {
      let r = nextFloat(rng) * TOTAL, type: DecorType = 'grass';
      for (const [t, w] of WEIGHTS) { r -= w; if (r < 0) { type = t; break; } }
      const x = cx * CELL + 20 + nextFloat(rng) * (CELL - 40), y = cy * CELL + 20 + nextFloat(rng) * (CELL - 40);
      if (x < 60 || y < 60 || x > WORLD.width - 60 || y > WORLD.height - 60) continue;
      if (Math.hypot(x - WORLD.width / 2, y - WORLD.height / 2) < CLEAR) continue;
      items.push({ type, x: Math.round(x), y: Math.round(y) });
    }
  }
  return items.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** 2–3 meandering dirt paths from one world edge to the opposite one. */
export function pathPolylines(seed: number): { x: number; y: number }[][] {
  const rng = createRng((seed ^ 0x9a7) >>> 0), count = 2 + nextInt(rng, 2), out: { x: number; y: number }[][] = [];
  for (let i = 0; i < count; i++) {
    const horizontal = i % 2 === 0, steps = 10, line: { x: number; y: number }[] = [];
    let drift = (0.2 + nextFloat(rng) * 0.6) * (horizontal ? WORLD.height : WORLD.width);
    for (let s = 0; s <= steps; s++) {
      drift = Math.min((horizontal ? WORLD.height : WORLD.width) - 80, Math.max(80, drift + (nextFloat(rng) - 0.5) * 260));
      const along = s / steps * (horizontal ? WORLD.width : WORLD.height);
      line.push(horizontal ? { x: along, y: drift } : { x: drift, y: along });
    }
    out.push(line);
  }
  return out;
}

/** Solid props and their collision radius at the base (world px). Flowers, reeds and ground details are walk-through. */
export const SOLID: Readonly<Partial<Record<DecorType, number>>> = {
  tree: 14, rock: 16, crate: 18, bench: 18, planter: 16, terminal: 18, tank: 24, antenna: 12, crystal: 18, vent: 18, solar: 18, dish: 20,
};

/** Solid props that break (hit points): shots and area weapons wear them down; they may drop a health patch. */
export const BREAKABLE: Readonly<Partial<Record<DecorType, number>>> = { crate: 30, terminal: 45 };

/** Collision circles for the run's solid scenery (same layout the renderer draws); `id` is the decor index. */
export function obstaclesFor(seed: number): Obstacle[] {
  return decorLayout(seed).flatMap((i, id) => {
    const r = SOLID[i.type];
    return r ? [{ x: i.x, y: i.y - r / 2, r, id }] : [];
  });
}
