import { describe, expect, test } from 'vitest';
import { Fx, labelRise } from '../../games/stay-rare/render/fx';

const levelUp = [{ type: 'levelUp' as const, x: 100, y: 200 }];

describe('level-up celebration', () => {
  test('a level-up spawns a burst ring, confetti and a LEVEL UP banner', () => {
    const fx = new Fx();
    fx.fromEvents(levelUp, false);
    expect(fx.rings).toHaveLength(1);
    expect(fx.confetti.length).toBeGreaterThanOrEqual(24);
    expect(fx.banner?.text).toBe('LEVEL UP!');
  });
  test('reduced motion: only the banner, no ring or confetti', () => {
    const fx = new Fx();
    fx.fromEvents(levelUp, true);
    expect([fx.rings.length, fx.confetti.length]).toEqual([0, 0]);
    expect(fx.banner).not.toBeNull();
  });
  test('everything fades out within ~1.5 s of frames', () => {
    const fx = new Fx();
    fx.fromEvents(levelUp, false);
    for (let i = 0; i < 90; i++) fx.update();
    expect([fx.rings.length, fx.confetti.length, fx.banner]).toEqual([0, 0, null]);
  });
  test('confetti is capped and uses only rarefriends colours', () => {
    const fx = new Fx();
    for (let i = 0; i < 20; i++) fx.fromEvents(levelUp, false);
    expect(fx.confetti.length).toBeLessThanOrEqual(300);
    expect(new Set(fx.confetti.map(c => c.color))).toEqual(new Set(['#ccff00', '#111111']));
  });
  test('boss defeat also celebrates', () => {
    const fx = new Fx();
    fx.fromEvents([{ type: 'bossDown', x: 0, y: 0 }], false);
    expect(fx.banner?.text).toBe('BOSS DOWN!');
  });
});

describe('healing', () => {
  test('a patch pops a small ring and a rising +HP label; reduced motion keeps only the label', () => {
    const fx = new Fx();
    fx.fromEvents([{ type: 'heal', x: 5, y: 5 }], false);
    expect(fx.rings).toHaveLength(1); expect(fx.rings[0].max).toBeLessThan(90);
    expect(fx.labels).toHaveLength(1); expect(fx.labels[0].text).toBe('+HP');
    expect(fx.banner).toBeNull();
    const still = new Fx(); still.fromEvents([{ type: 'heal', x: 5, y: 5 }], true);
    expect([still.rings.length, still.labels.length]).toEqual([0, 1]);
    for (let i = 0; i < 60; i++) fx.update();
    expect([fx.rings.length, fx.labels.length]).toEqual([0, 0]);
  });
});

test('the +HP label rises, but stays put under reduced motion', () => {
  expect(labelRise(40, false)).toBe(0); expect(labelRise(10, false)).toBeGreaterThan(10);
  expect(labelRise(10, true)).toBe(0);
});
