import { describe, expect, test } from 'vitest';
import { spawnEnemy } from '../../games/stay-rare/sim/spawn';
import { computeStats } from '../../games/stay-rare/sim/stats';
import type { RunState, WeaponId } from '../../games/stay-rare/sim/types';
import { FIRE, distToSegment, updateBeams, updateMines, updateProjectiles } from '../../games/stay-rare/sim/weapons';
import { FAMILY, freshRun } from '../helpers/state';

const arm = (s: RunState, id: WeaponId, level = 1) => { s.weapons = [{ id, level, cd: 0, evolved: false, volley: 0 }]; return s.weapons[0]; };

describe('milestone 2 weapons', () => {
  test('Drift Mines drops mines only while moving, max 3 at level 1', () => {
    const s = freshRun(FAMILY.hoverer, 2), w = arm(s, 'driftMines'), st = computeStats(s);
    expect(FIRE.driftMines(s, w, st)).toBe(false);
    s.player.moving = true;
    for (let i = 0; i < 5; i++) FIRE.driftMines(s, w, st);
    expect(s.mines).toHaveLength(3);
  });
  test('a mine explodes when a glitch touches it', () => {
    const s = freshRun(FAMILY.hoverer, 2), st = computeStats(s);
    s.mines.push({ x: 500, y: 500, ttl: 600, damage: 20, radius: 40 });
    const near = spawnEnemy(s, 'block', 510, 500), splash = spawnEnemy(s, 'block', 540, 500);
    updateMines(s, st);
    expect(near.hp).toBeLessThan(60); expect(splash.hp).toBeLessThan(60);
    expect(s.mines[0].ttl).toBe(0);
  });
  test('Quake Stamp damages and pushes glitches (not bosses) away', () => {
    const s = freshRun(FAMILY.colossus, 2), w = arm(s, 'quakeStamp');
    const e = spawnEnemy(s, 'block', s.player.x + 80, s.player.y);
    FIRE.quakeStamp(s, w, computeStats(s));
    expect(e.hp).toBeLessThan(60); expect(e.x).toBeCloseTo(s.player.x + 120);
  });
  test('Glitter Bounce bounces to a second glitch', () => {
    const s = freshRun(FAMILY.sparkling, 2), w = arm(s, 'glitterBounce'), st = computeStats(s);
    const a = spawnEnemy(s, 'block', s.player.x + 100, s.player.y), b = spawnEnemy(s, 'block', s.player.x + 100, s.player.y + 150);
    FIRE.glitterBounce(s, w, st);
    for (let i = 0; i < 60; i++) updateProjectiles(s, st);
    expect(a.hp).toBeLessThan(60); expect(b.hp).toBeLessThan(60);
  });
  test('Void Beam pierces every glitch on its line for 1 s', () => {
    const s = freshRun(FAMILY.hollow, 2), w = arm(s, 'voidBeam'), st = computeStats(s);
    const line = [100, 200, 300].map(dx => spawnEnemy(s, 'block', s.player.x + dx, s.player.y));
    const off = spawnEnemy(s, 'block', s.player.x + 100, s.player.y + 100);
    FIRE.voidBeam(s, w, st);
    for (let i = 0; i < 60; i++) { updateBeams(s, st); for (const f of s.effects) f.ttl--; }
    expect(line.every(e => e.hp < 60)).toBe(true); expect(off.hp).toBe(60);
  });
  test('Glitter Bounce shots are tagged for their pixel sparkle', () => {
    const s = freshRun(FAMILY.sparkling, 2), w = arm(s, 'glitterBounce');
    spawnEnemy(s, 'block', s.player.x + 100, s.player.y);
    FIRE.glitterBounce(s, w, computeStats(s));
    expect(s.projectiles[0].weapon).toBe('glitterBounce');
  });
  test('scenery stops the Void Beam: a glitch behind a prop is safe, and a crate on the line wears down', () => {
    const s = freshRun(FAMILY.hollow, 2), w = arm(s, 'voidBeam'), st = computeStats(s);
    s.obstacles = [{ id: 7, x: s.player.x + 150, y: s.player.y, r: 20 }];
    s.breakables = [{ id: 7, obstacle: s.obstacles[0], hp: 1e6 }];
    const before = spawnEnemy(s, 'block', s.player.x + 100, s.player.y), behind = spawnEnemy(s, 'block', s.player.x + 250, s.player.y);
    FIRE.voidBeam(s, w, st);
    for (let i = 0; i < 60; i++) { updateBeams(s, st); for (const f of s.effects) f.ttl--; }
    expect(before.hp).toBeLessThan(60); expect(behind.hp).toBe(60);
    expect(s.breakables[0].hp).toBeLessThan(1e6);
    const beam = s.effects.find(f => f.kind === 'beam')!;
    expect(beam.reach).toBeCloseTo(130, 0); // player centre to the prop's edge
  });
  test('Quake Stamp breaks crates in reach', () => {
    const s = freshRun(FAMILY.colossus, 2), w = arm(s, 'quakeStamp');
    s.obstacles = [{ id: 3, x: s.player.x + 60, y: s.player.y, r: 18 }];
    s.breakables = [{ id: 3, obstacle: s.obstacles[0], hp: 1 }];
    FIRE.quakeStamp(s, w, computeStats(s));
    expect(s.broken).toEqual([3]);
  });
  test('Void Beam aims at the nearest glitch when it fires (even while you face away), then holds its line', () => {
    const s = freshRun(FAMILY.hollow, 2), w = arm(s, 'voidBeam'), st = computeStats(s);
    s.player.facingX = -1; s.player.facingY = 0;
    const e = spawnEnemy(s, 'block', s.player.x + 120, s.player.y);
    FIRE.voidBeam(s, w, st);
    updateBeams(s, st);
    expect(s.effects.find(f => f.kind === 'beam')!.angle).toBeCloseTo(0);
    e.x = s.player.x; e.y = s.player.y + 120;
    updateBeams(s, st);
    expect(s.effects.find(f => f.kind === 'beam')!.angle).toBeCloseTo(0);
  });
    test('distToSegment', () => {
    expect(distToSegment(5, 3, 0, 0, 10, 0)).toBe(3);
    expect(distToSegment(-4, 3, 0, 0, 10, 0)).toBe(5);
  });
});
