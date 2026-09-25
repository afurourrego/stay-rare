import { describe, expect, test } from 'vitest';
import { DIRECTOR } from '../../games/stay-rare/sim/content';
import { damageEnemy, removeDead } from '../../games/stay-rare/sim/combat';
import { availableKinds, bossForCycle, runDirector, spawnRate } from '../../games/stay-rare/sim/director';
import { updateEnemies } from '../../games/stay-rare/sim/enemies';
import { spawnBossEnemy, spawnEnemy } from '../../games/stay-rare/sim/spawn';
import { computeStats } from '../../games/stay-rare/sim/stats';
import type { RunState } from '../../games/stay-rare/sim/types';
import { freshRun } from '../helpers/state';

const kinds = (s: RunState) => availableKinds(s).map(k => k.kind);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const run = (s: RunState, n: number) => { const stats = computeStats(s); for (let i = 0; i < n; i++) updateEnemies(s, stats); };

describe('director', () => {
  test('spawn rate grows within a wave and per cycle', () => {
    expect(spawnRate(0, 0)).toBeCloseTo(1.6);
    expect(spawnRate(0, 75)).toBeCloseTo(3.2);
    expect(spawnRate(2, 0)).toBeCloseTo(2.72);
  });
  test('enemy kinds unlock by cycle, second and milestone', () => {
    const s = freshRun();
    expect(kinds(s)).toEqual(['mote']);
    s.phaseTick = 30 * 60; expect(kinds(s)).toEqual(['mote', 'swarm']);
    s.cycle = 1; s.phaseTick = 0; expect(kinds(s)).toEqual(['mote', 'swarm', 'block']);
    s.phaseTick = 20 * 60; expect(kinds(s)).toEqual(['mote', 'swarm', 'block', 'scanline']);
    s.cycle = 2; expect(kinds(s)).not.toContain('splitter');
    const m2 = freshRun(0, 2); m2.cycle = 2; expect(kinds(m2)).toEqual(['mote', 'swarm', 'block', 'scanline', 'splitter', 'blinker']);
  });
  test('a 75 s wave spawns about ∫rate units, then one boss appears', () => {
    const s = freshRun();
    for (let i = 0; i < 75 * 60; i++) { s.phaseTick++; runDirector(s); }
    expect(s.phase).toBe('boss');
    expect(s.enemies.filter(e => e.boss)).toHaveLength(1);
    const regular = s.enemies.filter(e => !e.boss).length;
    expect(regular).toBeGreaterThanOrEqual(180);
    expect(regular).toBeLessThanOrEqual(DIRECTOR.maxEnemies);
  });
  test('never spawns regular glitches past the cap', () => {
    const s = freshRun();
    for (let i = 0; i < DIRECTOR.maxEnemies; i++) spawnEnemy(s, 'mote', 100, 100);
    for (let i = 0; i < 600; i++) { s.phaseTick++; runDirector(s); }
    expect(s.enemies).toHaveLength(DIRECTOR.maxEnemies);
  });
  test('bosses rotate by cycle; The Corruptor only in milestone 2', () => {
    expect([0, 1, 2, 3].map(c => bossForCycle(c, 1))).toEqual(['bigStatic', 'brokenGlyph', 'deadPixelGrid', 'bigStatic']);
    expect(bossForCycle(3, 2)).toBe('corruptor');
  });
});

describe('spawning and scaling', () => {
  test('enemy HP and damage scale per cycle; bosses by their own rate', () => {
    const s = freshRun(); s.cycle = 2;
    const mote = spawnEnemy(s, 'mote', 100, 100);
    expect([mote.hp, mote.damage]).toEqual([22, 13.5]);
    expect(spawnBossEnemy(s, 'bigStatic', 200, 200).hp).toBe(900);
  });
});

describe('enemy behavior', () => {
  test('a mote chases at 70 px/s', () => {
    const s = freshRun(); const e = spawnEnemy(s, 'mote', s.player.x + 500, s.player.y);
    run(s, 60);
    expect(dist(e, s.player)).toBeCloseTo(430, 3);
  });
  test('contact damage respects invulnerability', () => {
    const s = freshRun(); spawnEnemy(s, 'mote', s.player.x, s.player.y);
    run(s, 2);
    expect(s.player.hp).toBe(91);
  });
  test('a scanline keeps its distance and shoots', () => {
    const s = freshRun(); s.player.hp = 1e9; const e = spawnEnemy(s, 'scanline', s.player.x + 500, s.player.y);
    run(s, 600);
    expect(dist(e, s.player)).toBeGreaterThan(190);
    expect(dist(e, s.player)).toBeLessThan(250);
    expect(s.projectiles.some(p => p.hostile)).toBe(true);
  });
  test('overlapping glitches are pushed apart', () => {
    const s = freshRun(); const a = spawnEnemy(s, 'mote', 400, 400), b = spawnEnemy(s, 'mote', 401, 400);
    run(s, 1);
    expect(dist(a, b)).toBeGreaterThan(23.9);
  });
});

describe('bosses', () => {
  test('Big Static telegraphs, then charges at 420 px/s', () => {
    const s = freshRun(); s.player.hp = 1e9; const e = spawnBossEnemy(s, 'bigStatic', s.player.x + 450, s.player.y);
    run(s, 180);
    expect(e.mode).toBe(1);
    expect(s.effects.some(f => f.kind === 'telegraph')).toBe(true);
    run(s, 36);
    expect(e.mode).toBe(2);
    const x = e.x; run(s, 1);
    expect(x - e.x).toBeCloseTo(7, 3);
  });
  test('Broken Glyph fires a ring of 12 bullets every 2 s', () => {
    const s = freshRun(); s.player.hp = 1e9; spawnBossEnemy(s, 'brokenGlyph', s.player.x + 450, s.player.y);
    run(s, 120);
    expect(s.projectiles.filter(p => p.hostile)).toHaveLength(12);
  });
  test('Dead Pixel Grid summons 8 motes and raises 2 walls', () => {
    const s = freshRun(); s.player.hp = 1e9; spawnBossEnemy(s, 'deadPixelGrid', s.player.x + 450, s.player.y);
    run(s, 300);
    expect(s.enemies.filter(e => e.kind === 'mote')).toHaveLength(8);
    run(s, 60);
    expect(s.walls).toHaveLength(2);
  });
});

describe('kills', () => {
  test('a killed glitch drops its XP gem and a kill event', () => {
    const s = freshRun(), stats = computeStats(s), e = spawnEnemy(s, 'block', 500, 500);
    damageEnemy(s, e, 1000, stats); removeDead(s, stats);
    expect(s.enemies).toHaveLength(0);
    expect(s.gems).toEqual([{ x: 500, y: 500, value: 5 }]);
    expect(s.events.map(ev => ev.type)).toContain('kill');
  });
  test('crits double damage', () => {
    const s = freshRun(), e = spawnEnemy(s, 'block', 500, 500);
    damageEnemy(s, e, 10, { ...computeStats(s), crit: 1 });
    expect(e.hp).toBe(40);
  });
  test('killing the boss scores it, levels you up, heals 30% and starts the next wave', () => {
    const s = freshRun(), stats = computeStats(s);
    s.phase = 'boss'; s.player.hp = 50;
    const boss = spawnBossEnemy(s, 'bigStatic', 500, 500);
    damageEnemy(s, boss, 1e6, stats); removeDead(s, stats);
    expect([s.bossesDefeated, s.cycle, s.phase, s.phaseTick, s.level, s.pendingLevels]).toEqual([1, 1, 'wave', 0, 2, 1]);
    expect(s.player.hp).toBe(80);
  });
});
