import { describe, expect, test } from 'vitest';
import { DECOR_TYPES, decorLayout, pathPolylines, quantizePixel } from '../../games/stay-rare/render/decor';
import { WORLD } from '../../games/stay-rare/sim/content';

describe('decor layout', () => {
  test('deterministic per seed, different across seeds', () => {
    expect(decorLayout(7)).toEqual(decorLayout(7));
    expect(decorLayout(7)).not.toEqual(decorLayout(8));
  });
  test('fills the map with a mix of SDK props and pixel ground details, sorted by depth', () => {
    const items = decorLayout(3);
    expect(items.length).toBeGreaterThan(120);
    expect(items.length).toBeLessThan(600);
    const types = new Set(items.map(i => i.type));
    for (const t of ['tree', 'rock', 'flower', 'grass', 'terminal']) expect(types.has(t as never), t).toBe(true);
    expect(items.every(i => (DECOR_TYPES as readonly string[]).includes(i.type))).toBe(true);
    expect(items.every((it, k) => k === 0 || items[k - 1].y <= it.y)).toBe(true);
  });
  test('stays inside the world and keeps the start area clear', () => {
    for (const it of decorLayout(11)) {
      expect(it.x > 40 && it.x < WORLD.width - 40 && it.y > 40 && it.y < WORLD.height - 40).toBe(true);
      expect(Math.hypot(it.x - WORLD.width / 2, it.y - WORLD.height / 2)).toBeGreaterThan(260);
    }
  });
  test('two or three winding dirt paths cross the map', () => {
    const paths = pathPolylines(5);
    expect(paths.length).toBeGreaterThanOrEqual(2); expect(paths.length).toBeLessThanOrEqual(3);
    for (const line of paths) { expect(line.length).toBeGreaterThan(6); expect(line.every(p => p.x >= 0 && p.x <= WORLD.width && p.y >= 0 && p.y <= WORLD.height)).toBe(true); }
  });
});

describe('1-bit quantization of SDK prop art', () => {
  test('dark → ink, bright green → signal, light → paper, transparent → empty', () => {
    expect(quantizePixel(0, 0, 0, 255)).toBe('#');
    expect(quantizePixel(204, 255, 0, 255)).toBe('y');
    expect(quantizePixel(255, 255, 255, 255)).toBe('p');
    expect(quantizePixel(120, 120, 120, 255)).toBe('#');
    expect(quantizePixel(0, 0, 0, 40)).toBe('.');
  });
});
