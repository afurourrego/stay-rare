/**
 * Your Friend is unique: three traits read from its own on-chain side sprite (16×16, '#' = pixel), each a trade-off.
 * Pure and deterministic (the sim and a replay use the same numbers).
 */
export type Traits = Readonly<{ bulk: number; symmetry: number; eyes: number }>;
export type TraitMods = Readonly<{ hp: number; speed: number; crit: number; cooldown: number; pickup: number }>;

/** A Friend with these traits changes nothing: the balance suite and tests without art use it. */
export const NEUTRAL_TRAITS: Traits = { bulk: 58, symmetry: 0.72, eyes: 0 };
/** Largest effect of each trait (fractions). */
export const TRAIT_LIMITS = { hp: 0.08, speed: 0.06, crit: 0.05, cooldown: 0.04, pickup: 0.2 } as const;
/** Calibrated on 28 real Friends: bulk 37–130 px (median ~58), symmetry 46–94% (median ~72%), eyes 0–4 px. */
const BULK_SPAN = 22, SYMMETRY_SPAN = 0.2, PICKUP_PER_EYE = 0.05;

/** Eyes = enclosed holes (not reachable from the sprite border) of at most 4 pixels. Returns indices y * width + x. */
export function eyeHoles(rows: readonly string[]): Set<number> {
  const h = rows.length, w = rows[0]?.length ?? 0, outside = new Set<number>(), stack: number[] = [];
  const open = (x: number, y: number) => rows[y][x] !== '#';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && open(x, y)) { outside.add(y * w + x); stack.push(y * w + x); }
  const flood = (seen: Set<number>, list: number[]) => {
    while (list.length) {
      const i = list.pop()!, x = i % w, y = Math.floor(i / w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(j) || !open(nx, ny)) continue;
        seen.add(j); list.push(j);
      }
    }
  };
  flood(outside, stack);
  const eyes = new Set<number>(), done = new Set<number>(outside);
  for (let i = 0; i < w * h; i++) {
    if (done.has(i) || !open(i % w, Math.floor(i / w))) continue;
    const region = new Set<number>([i]); flood(region, [i]);
    region.forEach(j => done.add(j));
    if (region.size <= 4) region.forEach(j => eyes.add(j));
  }
  return eyes;
}

export function measureTraits(rows: readonly string[]): Traits {
  let bulk = 0, minX = Infinity, maxX = -Infinity;
  rows.forEach(row => [...row].forEach((c, x) => { if (c === '#') { bulk++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); } }));
  if (!bulk) return { bulk: 0, symmetry: 0, eyes: 0 };
  let mirrored = 0; // pixels whose mirror about the silhouette's own centre column is also a pixel
  rows.forEach(row => [...row].forEach((c, x) => { if (c === '#' && row[minX + maxX - x] === '#') mirrored++; }));
  return { bulk, symmetry: mirrored / bulk, eyes: eyeHoles(rows).size };
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
export function traitMods(t: Traits): TraitMods {
  const b = clamp1((t.bulk - NEUTRAL_TRAITS.bulk) / BULK_SPAN), s = clamp1((t.symmetry - NEUTRAL_TRAITS.symmetry) / SYMMETRY_SPAN);
  return {
    hp: 1 + TRAIT_LIMITS.hp * b, speed: 1 - TRAIT_LIMITS.speed * b, // heavy: tougher but slower; light: quick but fragile
    crit: s > 0 ? TRAIT_LIMITS.crit * s : 0, cooldown: s < 0 ? 1 + TRAIT_LIMITS.cooldown * s : 1, // symmetric: crits; lopsided: faster weapons
    pickup: 1 + Math.min(TRAIT_LIMITS.pickup, PICKUP_PER_EYE * t.eyes), // bigger eyes: gems from farther away
  };
}

const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;
/** Plain-words lines for the title card. */
export function describeTraits(t: Traits): string[] {
  const m = traitMods(t), dh = m.hp - 1;
  const bulk = Math.round(dh * 100) === 0 ? 'balanced' : `${dh > 0 ? '+' : '−'}${pct(dh)} HP, ${dh > 0 ? '−' : '+'}${pct(m.speed - 1)} speed`;
  const sym = m.crit > 0.005 ? `+${pct(m.crit)} crit` : m.cooldown < 0.995 ? `−${pct(1 - m.cooldown)} cooldown` : 'balanced';
  const eyes = m.pickup > 1.005 ? `+${pct(m.pickup - 1)} pickup` : 'no bonus';
  return [`Bulk ${t.bulk} px: ${bulk}`, `Symmetry ${Math.round(t.symmetry * 100)}%: ${sym}`, `Eyes ${t.eyes} px: ${eyes}`];
}
