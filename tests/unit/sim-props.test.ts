import { describe, expect, test } from 'vitest';
import { PATCH } from '../../games/stay-rare/sim/content';
import { BREAKABLE, decorLayout } from '../../games/stay-rare/sim/layout';
import { collectPatches, damageProp } from '../../games/stay-rare/sim/props';
import { spawnProjectile } from '../../games/stay-rare/sim/spawn';
import { computeStats } from '../../games/stay-rare/sim/stats';
import type { RunState } from '../../games/stay-rare/sim/types';
import { FIRE, updateProjectiles } from '../../games/stay-rare/sim/weapons';
import { freshRun } from '../helpers/state';

/** One crate right next to the player (replaces the run's scenery). */
function withCrate(s: RunState, dx: number, hp = 20) {
  const obstacle = { id: 999, x: s.player.x + dx, y: s.player.y, r: 18 };
  s.obstacles = [obstacle];
  s.breakables = [{ id: 999, obstacle, hp }];
  return obstacle;
}

describe('breakable props', () => {
  test('crates and terminals in the layout are breakable, each tied to its obstacle', () => {
    const s = freshRun(0, 1, 21), layout = decorLayout(21);
    expect(Object.keys(BREAKABLE).sort()).toEqual(['crate', 'terminal']);
    expect(s.breakables.length).toBeGreaterThan(3);
    for (const b of s.breakables) {
      expect(s.obstacles).toContain(b.obstacle);
      expect(layout[b.id].type in BREAKABLE).toBe(true);
      expect(b.hp).toBe(BREAKABLE[layout[b.id].type as keyof typeof BREAKABLE]);
    }
    expect(s.broken).toEqual([]); expect(s.patches).toEqual([]);
  });
  test('shots chip a crate and break it: the obstacle is gone and the renderer learns which prop broke', () => {
    const s = freshRun(0, 1, 21), st = computeStats(s);
    withCrate(s, 80, 15);
    for (let i = 0; i < 2; i++) spawnProjectile(s, { hostile: false, x: s.player.x + i * 30, y: s.player.y, vx: 6, vy: 0, damage: 10, radius: 6, ttl: 90, pierce: 0, split: 0, bounces: 0 });
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) { s.events = []; updateProjectiles(s, st); seen.push(...s.events.map(e => e.type)); }
    expect(seen.filter(t => t === 'block')).toHaveLength(2);
    expect(seen.filter(t => t === 'break')).toHaveLength(1);
    expect(s.obstacles).toHaveLength(0); expect(s.breakables).toHaveLength(0);
    expect(s.broken).toEqual([999]);
  });
  test('area weapons break props too (every family can)', () => {
    const s = freshRun(0, 1, 21), st = computeStats(s);
    withCrate(s, 40, 1);
    s.weapons = [{ id: 'signalPulse', level: 1, cd: 0, evolved: false, volley: 0 }];
    FIRE.signalPulse(s, s.weapons[0], st);
    expect(s.broken).toEqual([999]);
  });
  test('a broken prop drops a patch about half the time (seeded)', () => {
    let drops = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = freshRun(0, 1, seed); withCrate(s, 80, 1);
      damageProp(s, s.breakables[0], 5);
      drops += s.patches.length;
    }
    expect(drops).toBeGreaterThan(18); expect(drops).toBeLessThan(42);
  });
  test('walking over a patch heals a quarter of max HP, capped', () => {
    const s = freshRun(0, 1, 21), st = computeStats(s);
    s.player.hp = 10; s.patches = [{ x: s.player.x + 5, y: s.player.y }];
    collectPatches(s, st);
    expect(s.player.hp).toBeCloseTo(10 + st.maxHp * PATCH.heal);
    expect(s.patches).toHaveLength(0);
    expect(s.events.some(e => e.type === 'heal')).toBe(true);
    s.player.hp = st.maxHp - 1; s.patches = [{ x: s.player.x, y: s.player.y }];
    collectPatches(s, st);
    expect(s.player.hp).toBe(st.maxHp);
  });
  test('a patch out of reach stays on the ground', () => {
    const s = freshRun(0, 1, 21), st = computeStats(s);
    s.player.hp = 10; s.patches = [{ x: s.player.x + 200, y: s.player.y }];
    collectPatches(s, st);
    expect(s.patches).toHaveLength(1); expect(s.player.hp).toBe(10);
  });
});
