import { describe, expect, test } from 'vitest';
import { BG_CELL, blotchAt, crossesInView } from '../../games/stay-rare/render/background';
import { HitFlash, blinkHidden } from '../../games/stay-rare/render/flash';

describe('reduced motion: no flashing', () => {
  test('hits neither flash white nor pop the impact star', () => {
    const f = new HitFlash(); f.still = true;
    f.observe([{ id: 1, hp: 10 }]); f.observe([{ id: 1, hp: 6 }]);
    expect(f.isFlashing(1)).toBe(false); expect(f.stage(1)).toBe(0);
  });
  test('your Friend blinks while invulnerable, except under reduced motion', () => {
    const hidden = (reduced: boolean) => Array.from({ length: 32 }, (_, t) => blinkHidden(30, t, reduced));
    expect(hidden(false)).toContain(true); expect(hidden(false)).toContain(false);
    expect(hidden(true)).not.toContain(true);
    expect(blinkHidden(0, 0, false)).toBe(false);
  });
});

describe('hit flash', () => {
  test('flashes for 3 frames when HP drops, and forgets removed enemies', () => {
    const f = new HitFlash();
    f.observe([{ id: 1, hp: 10 }]);
    expect(f.isFlashing(1)).toBe(false);
    f.observe([{ id: 1, hp: 6 }]);
    expect(f.isFlashing(1)).toBe(true);
    f.observe([{ id: 1, hp: 6 }]); f.observe([{ id: 1, hp: 6 }]);
    expect(f.isFlashing(1)).toBe(true);
    f.observe([{ id: 1, hp: 6 }]);
    expect(f.isFlashing(1)).toBe(false);
    f.observe([]);
    f.observe([{ id: 1, hp: 3 }]);
    expect(f.isFlashing(1)).toBe(false);
  });
});

describe('hit impact stages', () => {
  test('a hit plays a 3-frame impact: stage 3, 2, 1, then 0', () => {
    const f = new HitFlash();
    f.observe([{ id: 1, hp: 10 }]); f.observe([{ id: 1, hp: 5 }]);
    const stages = [f.stage(1)];
    for (let i = 0; i < 3; i++) { f.observe([{ id: 1, hp: 5 }]); stages.push(f.stage(1)); }
    expect(stages).toEqual([3, 2, 1, 0]);
  });
});

describe('background', () => {
  test('blotches are deterministic and cover roughly 12% of cells', () => {
    expect(blotchAt(3, 7)).toBe(blotchAt(3, 7));
    let n = 0;
    for (let x = 0; x < 50; x++) for (let y = 0; y < 40; y++) if (blotchAt(x, y)) n++;
    expect(n / 2000).toBeGreaterThan(0.08); expect(n / 2000).toBeLessThan(0.16);
  });
  test('crosses sit on the 64 px lattice covering the view', () => {
    const pts = crossesInView({ x: 10, y: 20 }, 960, 640);
    expect(pts.every(p => p.x % BG_CELL === 0 && p.y % BG_CELL === 0)).toBe(true);
    expect(pts.some(p => p.x <= 10) && pts.some(p => p.x >= 970) && pts.some(p => p.y <= 20) && pts.some(p => p.y >= 660)).toBe(true);
  });
});
