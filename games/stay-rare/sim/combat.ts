import { DIRECTOR, MAX_GEMS, PLAYER } from './content';
import { onBossDefeated } from './director';
import { nextFloat } from './rng';
import { spawnEnemy } from './spawn';
import type { Stats } from './stats';
import type { Enemy, RunState } from './types';

export function damageEnemy(state: RunState, e: Enemy, base: number, stats: Stats): void {
  if (e.hp <= 0) return;
  const crit = nextFloat(state.rng) < stats.crit;
  e.hp -= crit ? base * PLAYER.critMul : base;
  state.events.push({ type: 'hit', x: e.x, y: e.y });
}

/** Up to `count` living enemies closest to (x, y) within `maxDist`, nearest first. */
export function nearestEnemies(state: RunState, x: number, y: number, count: number, maxDist: number, exclude?: readonly number[]): Enemy[] {
  const best: { e: Enemy; d: number }[] = [], max2 = maxDist * maxDist;
  for (const e of state.enemies) {
    if (e.hp <= 0 || exclude?.includes(e.id)) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d > max2) continue;
    if (best.length < count) best.push({ e, d });
    else if (d < best[best.length - 1].d) best[best.length - 1] = { e, d };
    else continue;
    best.sort((a, b) => a.d - b.d);
  }
  return best.map(b => b.e);
}

export function dropGem(state: RunState, x: number, y: number, value: number): void {
  if (state.gems.length >= MAX_GEMS) { state.gems[state.gems.length - 1].value += value; return; }
  state.gems.push({ x, y, value });
}

export function compact<T>(list: T[], keep: (item: T) => boolean): void {
  let w = 0;
  for (const item of list) if (keep(item)) list[w++] = item;
  list.length = w;
}

/** Removes dead enemies (dropping gems, splitting Splitters, resolving bosses) and expired entities. */
export function removeDead(state: RunState, stats: Stats): void {
  const deaths = state.enemies.filter(e => e.hp <= 0);
  compact(state.enemies, e => e.hp > 0);
  for (const e of deaths) {
    state.events.push({ type: e.boss ? 'bossDown' : 'kill', x: e.x, y: e.y });
    if (e.boss) { onBossDefeated(state, stats); continue; }
    dropGem(state, e.x, e.y, e.xp);
    if (e.kind === 'splitter') for (const side of [-1, 1]) {
      if (state.enemies.length < DIRECTOR.maxEnemies) spawnEnemy(state, 'mote', e.x + side * 14, e.y);
    }
  }
  compact(state.projectiles, p => p.ttl > 0);
  compact(state.effects, f => f.ttl > 0);
  compact(state.walls, w => w.ttl > 0);
  compact(state.mines, m => m.ttl > 0);
}
