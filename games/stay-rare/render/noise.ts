import { createRng, nextFloat } from '../sim/rng';

export function noisePixels(seed: number, size: number, density = 0.5): boolean[] {
  const rng = createRng(seed);
  return Array.from({ length: size * size }, () => nextFloat(rng) < density);
}

/** 1-bit static tiles for glitches; drawn scaled with smoothing off. */
export function noiseTiles(count: number, size: number): HTMLCanvasElement[] {
  return Array.from({ length: count }, (_, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d')!, pixels = noisePixels(1000 + i, size);
    g.fillStyle = '#eeeeee';
    pixels.forEach((on, k) => { if (on) g.fillRect(k % size, Math.floor(k / size), 1, 1); });
    return canvas;
  });
}
