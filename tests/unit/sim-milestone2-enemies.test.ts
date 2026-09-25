import { describe, expect, test } from 'vitest';
import { damageEnemy, removeDead } from '../../games/stay-rare/sim/combat';
import { updateEnemies } from '../../games/stay-rare/sim/enemies';
import { spawnBossEnemy, spawnEnemy } from '../../games/stay-rare/sim/spawn';
import { computeStats } from '../../games/stay-rare/sim/stats';
import type { RunState } from '../../games/stay-rare/sim/types';
import { freshRun } from '../helpers/state';

const run = (s: RunState, n: number) => { const st = computeStats(s); for (let i = 0; i < n; i++) updateEnemies(s, st); };
const hostile = (s: RunState) => s.projectiles.filter(p => p.hostile).length;

describe('milestone 2 glitches', () => {
  test('a Splitter splits into 2 motes when it dies', () => {
    const s = freshRun(0, 2), st = computeStats(s), e = spawnEnemy(s, 'splitter', 500, 500);
    damageEnemy(s, e, 1e6, st); removeDead(s, st);
    expect(s.enemies.map(x => x.kind)).toEqual(['mote', 'mote']);
  });
  test('a Blinker teleports within 160 px of you every 3 s', () => {
    const s = freshRun(0, 2); s.player.hp = 1e9;
    const e = spawnEnemy(s, 'blinker', s.player.x + 900, s.player.y);
    run(s, 180);
    expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeLessThanOrEqual(160 + 1e-6);
  });
});

describe('The Corruptor', () => {
  test('phase 1 (> 66%): chases, no bullets', () => {
    const s = freshRun(0, 2); s.player.hp = 1e9;
    spawnBossEnemy(s, 'corruptor', s.player.x + 450, s.player.y);
    run(s, 120);
    expect(hostile(s)).toBe(0);
  });
  test('phase 2 (33–66%): 3-bullet fan every second', () => {
    const s = freshRun(0, 2); s.player.hp = 1e9;
    const e = spawnBossEnemy(s, 'corruptor', s.player.x + 260, s.player.y); e.hp = e.maxHp * 0.5;
    run(s, 60);
    expect(hostile(s)).toBe(3);
  });
  test('phase 3 (< 33%): faster and fires every 40 ticks', () => {
    const s = freshRun(0, 2); s.player.hp = 1e9;
    const e = spawnBossEnemy(s, 'corruptor', s.player.x + 450, s.player.y); e.hp = e.maxHp * 0.2;
    const d0 = e.x - s.player.x; run(s, 40);
    expect(hostile(s)).toBe(3);
    expect(d0 - (e.x - s.player.x)).toBeCloseTo(90 * 1.33 * 40 / 60, 0);
  });
});
