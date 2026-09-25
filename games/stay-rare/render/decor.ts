import { loadSvg } from '@rarefriends/friendsdk/assets';
import { renderProp } from '@rarefriends/friendsdk/world';
import { WORLD } from '../sim/content';
import { OWN_DECOR, SDK_DECOR, decorLayout, pathPolylines, type DecorType } from '../sim/layout';
import { BG_CELL, blotchAt } from './background';
import { INK, INK30, PAPER, SIGNAL } from './palette';
import { PIXEL, linePoints } from './pixel';

export { DECOR_TYPES, OWN_DECOR, SDK_DECOR, decorLayout, pathPolylines, type DecorItem, type DecorType } from '../sim/layout';

/** SDK prop art is monochrome vector with signal green: reduce each pixel to ink / signal / paper / empty. */
export function quantizePixel(r: number, g: number, b: number, a: number): '#' | 'y' | 'p' | '.' {
  if (a < 128) return '.';
  if (g > 180 && b < 110 && r > 120) return 'y';
  return 0.299 * r + 0.587 * g + 0.114 * b < 200 ? '#' : 'p';
}

/** Low-res pixel height of each SDK prop (the art is cropped to its bounding box first). */
const PROP_SIZE: Readonly<Record<(typeof SDK_DECOR)[number], number>> = {
  tree: 58, rock: 18, flower: 16, reeds: 24, crate: 22, bench: 20, planter: 26, terminal: 38, tank: 40, antenna: 54, crystal: 38, vent: 22, solar: 26, dish: 42,
};

/** Rasterize SDK props: crop to the art's bounding box, scale to pixel size, requantize to 1-bit (official scenery as pixel art). */
export async function rasterizeProps(): Promise<Map<DecorType, HTMLCanvasElement>> {
  const out = new Map<DecorType, HTMLCanvasElement>();
  await Promise.all(SDK_DECOR.map(async type => {
    const image = await loadSvg(renderProp(type)), full = document.createElement('canvas');
    full.width = full.height = 240;
    const f = full.getContext('2d', { willReadFrequently: true })!;
    f.drawImage(image, 0, 0, 240, 240);
    const alpha = f.getImageData(0, 0, 240, 240).data;
    let x0 = 240, y0 = 240, x1 = 0, y1 = 0;
    for (let i = 0; i < 240 * 240; i++) if (alpha[i * 4 + 3] > 20) { const x = i % 240, y = (i / 240) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 <= x0 || y1 <= y0) return;
    const h = PROP_SIZE[type as (typeof SDK_DECOR)[number]], w = Math.max(4, Math.round((x1 - x0 + 1) * h / (y1 - y0 + 1)));
    const small = document.createElement('canvas');
    small.width = w; small.height = h;
    const s = small.getContext('2d', { willReadFrequently: true })!;
    s.imageSmoothingQuality = 'high';
    s.drawImage(full, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, w, h);
    const data = s.getImageData(0, 0, w, h).data, dst = document.createElement('canvas');
    dst.width = w; dst.height = h;
    const d = dst.getContext('2d')!;
    for (let i = 0; i < w * h; i++) {
      const c = quantizePixel(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]);
      if (c === '.') continue;
      d.fillStyle = c === '#' ? INK : c === 'y' ? SIGNAL : PAPER;
      d.fillRect(i % w, (i / w) | 0, 1, 1);
    }
    out.set(type, dst);
  }));
  return out;
}

const OWN: Readonly<Record<(typeof OWN_DECOR)[number], readonly string[]>> = {
  grass: ['..#...#..', '.#.#.#.#.', '#...#...#'],
  tuft: ['.#.#.', '#.#.#', '.###.'],
  pebble: ['.##.', '#..#', '.##.'],
};

/**
 * Bake the flat ground once (world-size, low-res): paper, dither blotches, cross lattice, dirt paths, grass details.
 * The frame then blits the visible window; dither stays world-anchored.
 */
export function bakeGround(seed: number): HTMLCanvasElement {
  const W = WORLD.width / PIXEL, H = WORLD.height / PIXEL, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const dither = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = INK30;
    for (let yy = y; yy < y + h; yy++) for (let xx = x + ((x + yy) & 1); xx < x + w; xx += 2) g.fillRect(xx, yy, 1, 1);
  };
  const cell = BG_CELL / PIXEL;
  for (let cy = 0; cy * cell < H; cy++) for (let cx = 0; cx * cell < W; cx++) {
    const size = blotchAt(cx, cy), x = cx * cell, y = cy * cell;
    if (size) dither(x + 4, y + 4, 6 + size * 5, 4 + size * 3);
    g.fillStyle = INK30; g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5);
  }
  // Dirt paths: a dithered band with dotted ink edges.
  for (const line of pathPolylines(seed)) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    for (const [x, y] of linePoints(a.x / PIXEL, a.y / PIXEL, b.x / PIXEL, b.y / PIXEL)) {
      dither(x - 7, y - 7, 14, 14);
      if ((x + y) % 5 === 0) { g.fillStyle = INK; g.fillRect(x - 8, y - 8, 1, 1); g.fillRect(x + 7, y + 7, 1, 1); }
    }
  }
  g.fillStyle = INK30; dither(0, 0, 12, H); dither(0, 0, W, 12); dither(W - 12, 0, 12, H); dither(0, H - 12, W, 12);
  g.fillStyle = INK; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2); g.fillRect(0, 0, 2, H); g.fillRect(W - 2, 0, 2, H);
  for (const item of decorLayout(seed)) {
    const x = Math.round(item.x / PIXEL), y = Math.round(item.y / PIXEL);
    if (item.type in OWN) {
      const rows = OWN[item.type as (typeof OWN_DECOR)[number]];
      rows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch === '#') { g.fillStyle = item.type === 'pebble' ? INK : INK; g.fillRect(x + dx - (row.length >> 1), y + dy - rows.length, 1, 1); } }));
      continue;
    }
  }
  return c;
}

/** Draw one rasterized SDK prop with its base (feet) at low-res (x, y). Props are depth-sorted with the characters. */
export function drawProp(g: CanvasRenderingContext2D, art: HTMLCanvasElement, x: number, y: number): void {
  g.drawImage(art, x - (art.width >> 1), y - art.height + 2);
}
