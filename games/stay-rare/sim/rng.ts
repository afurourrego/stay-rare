import type { Rng } from './types';

/** mulberry32 with its state in a plain object so a run stays JSON-serializable. Game chance only, never RF. */
export function createRng(seed: number): Rng { return { s: seed >>> 0 }; }

export function nextU32(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function nextFloat(r: Rng): number { return nextU32(r) / 4_294_967_296; }
export function nextInt(r: Rng, n: number): number { return Math.floor(nextFloat(r) * n); }

/** FNV-1a 32-bit, for deriving a seed from a string (e.g. the UTC day). */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
