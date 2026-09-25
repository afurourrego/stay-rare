import { describe, expect, test } from 'vitest';
import { WORLD, familyInfo, startingWeapon, xpToNext } from '../../games/stay-rare/sim/content';
import { collectGems, gainXp, hurtPlayer, movePlayer } from '../../games/stay-rare/sim/player';
import { createRng, hashString, nextFloat, nextInt, nextU32 } from '../../games/stay-rare/sim/rng';
import { createRun } from '../../games/stay-rare/sim/run';
import { compareScore } from '../../games/stay-rare/sim/score';
import { buildGrid, queryGrid } from '../../games/stay-rare/sim/spatial';
import { computeStats } from '../../games/stay-rare/sim/stats';
import type { FamilyId } from '../../games/stay-rare/sim/types';
import { FAMILY, freshRun } from '../helpers/state';

const ticks = (n: number, fn: () => void) => { for (let i = 0; i < n; i++) fn(); };

describe('rng', () => {
  test('same seed, same sequence; different seed, different sequence', () => {
    const a = createRng(42), b = createRng(42), c = createRng(43);
    const seqA = [nextU32(a), nextU32(a), nextU32(a)];
    expect([nextU32(b), nextU32(b), nextU32(b)]).toEqual(seqA);
    expect([nextU32(c), nextU32(c), nextU32(c)]).not.toEqual(seqA);
  });
  test('nextFloat is in [0, 1) and nextInt in [0, n)', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const f = nextFloat(r), n = nextInt(r, 5);
      expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThan(1);
      expect(Number.isInteger(n) && n >= 0 && n < 5).toBe(true);
    }
  });
  test('hashString is FNV-1a 32', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
  });
});

describe('content', () => {
  test('xpToNext follows 5 + 4n + floor(n²/2)', () => {
    expect([1, 2, 5, 10].map(xpToNext)).toEqual([9, 15, 37, 95]);
  });
  test('rare families start with Signal Pulse until milestone 2', () => {
    expect(startingWeapon(FAMILY.skeleton, 1)).toBe('boneBolt');
    expect(startingWeapon(FAMILY.hoverer, 1)).toBe('signalPulse');
    expect(startingWeapon(FAMILY.hoverer, 2)).toBe('driftMines');
    expect(familyInfo(FAMILY.mask, 1)).toEqual({ name: 'Mask', weaponName: 'Mask Wave', weaponDescription: 'Sweeps a cone toward the nearest glitch', passive: '−7% cooldown' });
  });
});

describe('createRun and stats', () => {
  test('starts centered with full HP and the family weapon', () => {
    const s = freshRun(FAMILY.skeleton);
    expect([s.player.x, s.player.y]).toEqual([WORLD.width / 2, WORLD.height / 2]);
    expect(s.player.hp).toBe(100);
    expect(s.weapons.map(w => [w.id, w.level])).toEqual([['boneBolt', 1]]);
    expect(freshRun(FAMILY.colossus).player.hp).toBeCloseTo(140);
  });
  test('rejects unknown families', () => {
    expect(() => createRun(1, 9 as FamilyId)).toThrow(RangeError);
  });
  test('family passives change stats', () => {
    const st = (f: FamilyId) => computeStats(freshRun(f));
    expect(st(FAMILY.skeleton).damageMul).toBeCloseTo(1.1);
    expect(st(FAMILY.mask).cooldownMul).toBeCloseTo(0.93);
    expect(st(FAMILY.family).xpMul).toBeCloseTo(1.35);
    expect(st(FAMILY.cellular).regen).toBe(0.2);
    expect(st(FAMILY.asymmetry).crit).toBeCloseTo(0.15);
    expect(st(FAMILY.hoverer).speed).toBeCloseTo(180);
    expect(st(FAMILY.colossus).speed).toBeCloseTo(135);
    expect(st(FAMILY.sparkling).areaMul).toBeCloseTo(1.1);
    expect(st(FAMILY.hollow).invulnTicks).toBe(60);
  });
  test('passive levels stack with the family', () => {
    const s = freshRun(FAMILY.mask);
    s.passives.push({ id: 'overclock', level: 2 }, { id: 'thickOutline', level: 3 });
    expect(computeStats(s).cooldownMul).toBeCloseTo(0.93 * 0.88);
    expect(computeStats(s).maxHp).toBe(160);
  });
});

describe('movement', () => {
  test('moves at stats.speed px/s and normalizes diagonals', () => {
    const s = freshRun(), stats = computeStats(s), x0 = s.player.x, y0 = s.player.y;
    ticks(60, () => movePlayer(s, { dx: 1, dy: 0 }, stats));
    expect(s.player.x - x0).toBeCloseTo(150, 5);
    const d = freshRun(); ticks(60, () => movePlayer(d, { dx: 1, dy: 1 }, stats));
    expect(Math.hypot(d.player.x - x0, d.player.y - y0)).toBeCloseTo(150, 5);
  });
  test('stays inside the world', () => {
    const s = freshRun(), stats = computeStats(s);
    ticks(60 * 60, () => movePlayer(s, { dx: -1, dy: -1 }, stats));
    expect([s.player.x, s.player.y]).toEqual([16, 16]);
  });
  test('facing follows movement and survives no input', () => {
    const s = freshRun(), stats = computeStats(s);
    movePlayer(s, { dx: 0, dy: -1 }, stats);
    movePlayer(s, { dx: 0, dy: 0 }, stats);
    expect([s.player.facingX, s.player.facingY, s.player.moving]).toEqual([0, -1, false]);
  });
  test('walls block movement', () => {
    const s = freshRun(), stats = computeStats(s), x0 = s.player.x;
    s.walls.push({ x: x0 + 40, y: s.player.y - 100, w: 24, h: 200, ttl: 999 });
    ticks(60, () => movePlayer(s, { dx: 1, dy: 0 }, stats));
    expect(s.player.x).toBeLessThanOrEqual(x0 + 40 - 16 + 0.001);
  });
});

describe('damage and XP', () => {
  test('invulnerability gates repeated hits', () => {
    const s = freshRun(), stats = computeStats(s);
    hurtPlayer(s, 8, stats); hurtPlayer(s, 8, stats);
    expect(s.player.hp).toBe(92);
    ticks(30, () => movePlayer(s, { dx: 0, dy: 0 }, stats));
    hurtPlayer(s, 8, stats);
    expect(s.player.hp).toBe(84);
  });
  test('gainXp levels up and queues capsules', () => {
    const s = freshRun();
    gainXp(s, 9);
    expect([s.level, s.pendingLevels, s.xp]).toEqual([2, 1, 0]);
    gainXp(s, 15 + 21);
    expect([s.level, s.pendingLevels, s.xp]).toEqual([4, 3, 0]);
  });
  test('gems inside pickup range are pulled in and collected with the XP bonus', () => {
    const s = freshRun(FAMILY.family), stats = computeStats(s);
    s.gems.push({ x: s.player.x + 40, y: s.player.y, value: 5 }, { x: s.player.x + 400, y: s.player.y, value: 5 });
    ticks(10, () => collectGems(s, stats));
    expect(s.gems).toHaveLength(1);
    expect(s.xp).toBeCloseTo(6.75);
  });
});

describe('score and grid', () => {
  test('bosses first, then ticks', () => {
    expect(compareScore({ bosses: 2, ticks: 10 }, { bosses: 1, ticks: 99999 })).toBeGreaterThan(0);
    expect(compareScore({ bosses: 1, ticks: 10 }, { bosses: 1, ticks: 20 })).toBeLessThan(0);
  });
  test('queryGrid returns points in nearby cells only', () => {
    const grid = buildGrid([{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 1000, y: 1000 }]);
    expect(queryGrid(grid, 20, 20, 90).sort()).toEqual([0, 1]);
  });
});
