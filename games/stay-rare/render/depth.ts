import { PLAYER } from '../sim/content';

/** Depth = the world y of something's feet; drawing in increasing depth lets you walk behind and in front of props. */
export const propDepth = (item: { y: number }) => item.y;
export const playerDepth = (p: { y: number }) => p.y + PLAYER.radius;
export const enemyDepth = (e: { y: number; radius: number }) => e.y + e.radius;

/** Stable sort by depth (ties keep insertion order). */
export function depthSort<T extends { depth: number }>(items: T[]): T[] {
  return items.map((item, i) => ({ item, i })).sort((a, b) => a.item.depth - b.item.depth || a.i - b.i).map(x => x.item);
}
/** Shots fly at body height, from the same centre as your Friend: they share its depth rule. */
export const shotDepth = (b: { y: number }) => b.y + PLAYER.radius;
