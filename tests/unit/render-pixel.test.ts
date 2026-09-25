import { describe, expect, test } from 'vitest';
import { arcPoints, circlePoints, linePoints, toLow } from '../../games/stay-rare/render/pixel';

const key = (p: readonly number[]) => p.join(',');

describe('pixel primitives', () => {
  test('midpoint circle: radius 0 is one pixel; outline is symmetric, unique and on the radius', () => {
    expect(circlePoints(0)).toEqual([[0, 0]]);
    const pts = circlePoints(6), set = new Set(pts.map(key));
    expect(set.size).toBe(pts.length);
    for (const [x, y] of [[6, 0], [0, 6], [-6, 0], [0, -6]]) expect(set.has(key([x, y]))).toBe(true);
    for (const [x, y] of pts) { expect(Math.abs(Math.hypot(x, y) - 6)).toBeLessThan(1); expect(set.has(key([-x, y])) && set.has(key([x, -y]))).toBe(true); }
  });
  test('Bresenham line: includes both ends and steps at most one pixel per axis', () => {
    const pts = linePoints(0, 0, 7, 3);
    expect(pts[0]).toEqual([0, 0]); expect(pts[pts.length - 1]).toEqual([7, 3]);
    expect(pts).toHaveLength(8);
    for (let i = 1; i < pts.length; i++) { expect(Math.abs(pts[i][0] - pts[i - 1][0])).toBeLessThanOrEqual(1); expect(Math.abs(pts[i][1] - pts[i - 1][1])).toBeLessThanOrEqual(1); }
    expect(linePoints(3, 3, 3, 3)).toEqual([[3, 3]]);
  });
  test('arc keeps only circle points inside the angle range', () => {
    const arc = arcPoints(8, -Math.PI / 4, Math.PI / 4);
    expect(arc.length).toBeGreaterThan(3);
    expect(arc.every(([x, y]) => x > 0 && Math.abs(Math.atan2(y, x)) <= Math.PI / 4 + 1e-9)).toBe(true);
    expect(arc.some(([x, y]) => x === 8 && y === 0)).toBe(true);
  });
  test('world → low-res pixel coordinates round to integers at half scale', () => {
    expect(toLow(101, 100)).toBe(1); expect(toLow(100, 100)).toBe(0); expect(toLow(1234.6, 0)).toBe(617);
  });
});

import { projector } from '../../games/stay-rare/render/pixel';
describe('camera snapping (no swimming scenery when moving diagonally)', () => {
  test('a static prop stays locked to the ground for any fractional camera position', () => {
    const prop = { x: 1234.4, y: 987.6 };
    for (let i = 0; i < 200; i++) {
      const cam = { x: 700 + i * 1.77, y: 500 + i * 1.77 }, pr = projector(cam);
      // screen position of the prop minus the ground's blit offset must never change
      expect(pr.X(prop.x) + pr.groundX).toBe(Math.round(prop.x / 2));
      expect(pr.Y(prop.y) + pr.groundY).toBe(Math.round(prop.y / 2));
    }
  });
});

import { shadowPixels } from '../../games/stay-rare/render/pixel';
describe('pixel shadows', () => {
  test('a dithered ellipse: inside its bounds, checkerboard, symmetric', () => {
    const pts = shadowPixels(20, 6);
    expect(pts.length).toBeGreaterThan(20);
    expect(pts.every(([x, y]) => Math.abs(x) <= 10 && Math.abs(y) <= 3 && (x + y) % 2 === 0)).toBe(true);
    const set = new Set(pts.map(p => p.join(',')));
    expect(pts.every(([x, y]) => set.has(`${-x},${y}`) || (-x + y) % 2 !== 0)).toBe(true);
    expect(shadowPixels(0, 0)).toEqual([]);
  });
});

import { integerScale } from '../../games/stay-rare/render/pixel';
describe('integer scaling (true pixel art)', () => {
  test('the 480×320 art is shown at the largest whole multiple that fits', () => {
    expect(integerScale(960, 640)).toBe(2);
    expect(integerScale(1366, 911)).toBe(2);
    expect(integerScale(1920, 1280)).toBe(4);
    expect(integerScale(1500, 1300)).toBe(3);
    // the SDK frame's 1 px border leaves 958×638 inside a 960×640 frame: still 2× (1 px cropped per edge), not half size
    expect(integerScale(958, 638)).toBe(2);
    expect(integerScale(940, 626)).toBe(1); // a real shortfall (> 2%) still steps down
    // smaller than 1× (phones): no whole multiple fits, so it shrinks proportionally
    expect(integerScale(358, 238)).toBeCloseTo(238 / 320);
    expect(integerScale(200, 100)).toBeCloseTo(100 / 320);
  });
});
