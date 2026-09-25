import { describe, expect, test } from 'vitest';
import { decodeRows } from '../../games/stay-rare/render/corrupt';
import { ENEMY_FRIENDS } from '../../games/stay-rare/render/enemyFriends';
import { replayRun } from '../../games/stay-rare/sim/replay';
import { createRun } from '../../games/stay-rare/sim/run';
import { computeStats } from '../../games/stay-rare/sim/stats';
import { NEUTRAL_TRAITS, TRAIT_LIMITS, describeTraits, measureTraits, traitMods } from '../../games/stay-rare/sim/traits';

const blob = (w: number, h: number) => Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => x < w && y < h ? '#' : '.').join(''));

describe('your Friend is unique: traits read from its own on-chain pixels', () => {
  test('bulk counts the silhouette, symmetry mirrors it about its own centre, eyes are the enclosed holes', () => {
    expect(measureTraits(blob(8, 8))).toEqual({ bulk: 64, symmetry: 1, eyes: 0 });
    const face = blob(6, 6).map((r, y) => y === 2 ? r.slice(0, 2) + '.' + r.slice(3) : r); // one eye pixel at (2, 2)
    const t = measureTraits(face);
    expect(t.bulk).toBe(35); expect(t.eyes).toBe(1); expect(t.symmetry).toBeLessThan(1);
    const lopsided = ['#...............', '##..............', '####............', ...Array(13).fill('.'.repeat(16))]; // 4 of 7 mirror
    expect(measureTraits(lopsided).symmetry).toBeLessThan(0.7);
  });
  test('the neutral Friend changes nothing (the balance suite plays with it)', () => {
    const base = createRun(1, 0, 2), neutral = createRun(1, 0, 2, NEUTRAL_TRAITS);
    expect(computeStats(neutral)).toEqual(computeStats(base));
    expect(traitMods(NEUTRAL_TRAITS)).toEqual({ hp: 1, speed: 1, crit: 0, cooldown: 1, pickup: 1 });
  });
  test('trade-offs, not free power: heavy = tougher but slower; symmetric = crits, lopsided = faster weapons; eyes = reach', () => {
    const heavy = traitMods({ bulk: 130, symmetry: 0.72, eyes: 0 }), light = traitMods({ bulk: 30, symmetry: 0.72, eyes: 0 });
    expect(heavy.hp).toBeCloseTo(1 + TRAIT_LIMITS.hp); expect(heavy.speed).toBeCloseTo(1 - TRAIT_LIMITS.speed);
    expect(light.hp).toBeCloseTo(1 - TRAIT_LIMITS.hp); expect(light.speed).toBeCloseTo(1 + TRAIT_LIMITS.speed);
    const sym = traitMods({ bulk: 58, symmetry: 1, eyes: 0 }), lop = traitMods({ bulk: 58, symmetry: 0.3, eyes: 0 });
    expect(sym.crit).toBeCloseTo(TRAIT_LIMITS.crit); expect(sym.cooldown).toBe(1);
    expect(lop.crit).toBe(0); expect(lop.cooldown).toBeCloseTo(1 - TRAIT_LIMITS.cooldown);
    expect(traitMods({ bulk: 58, symmetry: 0.72, eyes: 9 }).pickup).toBeCloseTo(1 + TRAIT_LIMITS.pickup);
  });
  test('real Friends really differ, and every effect stays inside its limits', () => {
    const all = ENEMY_FRIENDS.map(f => traitMods(measureTraits(decodeRows(f.right[0]))));
    expect(new Set(all.map(m => JSON.stringify(m))).size).toBeGreaterThan(20);
    for (const m of all) {
      expect(Math.abs(m.hp - 1)).toBeLessThanOrEqual(TRAIT_LIMITS.hp + 1e-9);
      expect(Math.abs(m.speed - 1)).toBeLessThanOrEqual(TRAIT_LIMITS.speed + 1e-9);
      expect(m.crit).toBeLessThanOrEqual(TRAIT_LIMITS.crit + 1e-9);
      expect(1 - m.cooldown).toBeLessThanOrEqual(TRAIT_LIMITS.cooldown + 1e-9);
      expect(m.pickup - 1).toBeLessThanOrEqual(TRAIT_LIMITS.pickup + 1e-9);
    }
  });
  test('the run applies them and a replay keeps them', () => {
    const traits = { bulk: 130, symmetry: 1, eyes: 4 }, s = createRun(7, 0, 2, traits), st = computeStats(s), base = computeStats(createRun(7, 0, 2));
    expect(st.maxHp).toBeGreaterThan(base.maxHp); expect(st.speed).toBeLessThan(base.speed);
    expect(st.crit).toBeGreaterThan(base.crit); expect(st.pickup).toBeGreaterThan(base.pickup);
    expect(s.player.hp).toBe(st.maxHp);
    const replay = replayRun({ seed: 7, familyId: 0, milestone: 2, traits, inputs: [0, 0, 0, 0], choices: [] });
    expect(computeStats(replay)).toEqual(st);
  });
  test('the title shows each trait with its effect in plain words', () => {
    expect(describeTraits({ bulk: 130, symmetry: 1, eyes: 4 })).toEqual([
      'Bulk 130 px: +8% HP, −6% speed', 'Symmetry 100%: +5% crit', 'Eyes 4 px: +20% pickup',
    ]);
    expect(describeTraits({ bulk: 58, symmetry: 0.3, eyes: 0 })).toEqual([
      'Bulk 58 px: balanced', 'Symmetry 30%: −4% cooldown', 'Eyes 0 px: no bonus',
    ]);
  });
});
