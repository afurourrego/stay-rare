import { describe, expect, test } from 'vitest';
import { depthSort, enemyDepth, playerDepth, propDepth, shotDepth } from '../../games/stay-rare/render/depth';

describe('depth sorting (walk in front of / behind props)', () => {
  test('things are drawn from the top of the map down, by where their feet are', () => {
    const order = depthSort([{ id: 'c', depth: 30 }, { id: 'a', depth: 10 }, { id: 'b', depth: 20 }]).map(d => d.id);
    expect(order).toEqual(['a', 'b', 'c']);
  });
  test('above a tree base you are drawn first (the tree covers you); below it you are drawn over the tree', () => {
    const tree = propDepth({ y: 500 });
    expect(playerDepth({ y: 470 })).toBeLessThan(tree);
    expect(playerDepth({ y: 500 })).toBeGreaterThan(tree);
  });
  test('shots fly at body height: behind a tree top they are hidden like you, in front they cover it', () => {
    const tree = propDepth({ y: 500 });
    expect(shotDepth({ y: 470 })).toBe(playerDepth({ y: 470 }));
    expect(shotDepth({ y: 470 })).toBeLessThan(tree);
    expect(shotDepth({ y: 500 })).toBeGreaterThan(tree);
  });
  test('enemies use their feet too, and ties keep insertion order', () => {
    expect(enemyDepth({ y: 100, radius: 12 })).toBe(112);
    const order = depthSort([{ id: 'x', depth: 5 }, { id: 'y', depth: 5 }]).map(d => d.id);
    expect(order).toEqual(['x', 'y']);
  });
});
