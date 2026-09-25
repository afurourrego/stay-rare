import { PATCH } from './content';
import { BREAKABLE, decorLayout } from './layout';
import { nextFloat } from './rng';
import type { Stats } from './stats';
import type { Breakable, Obstacle, RunState } from './types';

/** The run's breakable props (crates, terminals), each tied to its collision circle. */
export function breakablesFor(seed: number, obstacles: readonly Obstacle[]): Breakable[] {
  const layout = decorLayout(seed);
  return obstacles.flatMap(o => {
    const hp = o.id === undefined ? undefined : BREAKABLE[layout[o.id].type];
    return hp ? [{ id: o.id!, obstacle: o, hp }] : [];
  });
}

/** Wear a prop down; at 0 it breaks: its obstacle is removed, the renderer is told, and it may drop a health patch. */
export function damageProp(state: RunState, prop: Breakable, damage: number): void {
  if (prop.hp <= 0) return;
  prop.hp -= damage;
  if (prop.hp > 0) return;
  const o = prop.obstacle;
  state.breakables = state.breakables.filter(p => p !== prop);
  state.obstacles = state.obstacles.filter(x => x !== o);
  state.broken.push(prop.id);
  state.events.push({ type: 'break', x: o.x, y: o.y });
  if (nextFloat(state.rng) < PATCH.dropChance) state.patches.push({ x: o.x, y: o.y });
}

/** Area weapons (pulse, wave, orbit) wear down every breakable prop they overlap. */
export function damagePropsInArea(state: RunState, x: number, y: number, radius: number, damage: number, filter?: (t: { x: number; y: number }) => boolean): void {
  for (const prop of [...state.breakables]) {
    const o = prop.obstacle, r = radius + o.r;
    if ((o.x - x) ** 2 + (o.y - y) ** 2 <= r * r && (!filter || filter(o))) damageProp(state, prop, damage);
  }
}

/** Walk over a patch to heal a fraction of max HP (capped). */
export function collectPatches(state: RunState, stats: Stats): void {
  const p = state.player;
  for (let i = state.patches.length - 1; i >= 0; i--) {
    const patch = state.patches[i];
    if ((patch.x - p.x) ** 2 + (patch.y - p.y) ** 2 > PATCH.reach ** 2) continue;
    p.hp = Math.min(stats.maxHp, p.hp + stats.maxHp * PATCH.heal);
    state.patches.splice(i, 1);
    state.events.push({ type: 'heal', x: patch.x, y: patch.y });
  }
}
