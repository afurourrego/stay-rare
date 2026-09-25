/** Pixel-art primitives: every effect is plotted pixel by pixel on the half-resolution canvas. */
export const PIXEL = 2;
export type Pt = [number, number];

/** World coordinate → low-res pixel, relative to the camera. */
export const toLow = (v: number, cam: number) => Math.round((v - cam) / PIXEL);

/** Midpoint circle outline, unique points. */
export function circlePoints(r: number): Pt[] {
  r = Math.round(r);
  if (r <= 0) return [[0, 0]];
  const seen = new Set<string>(), out: Pt[] = [];
  const add = (x: number, y: number) => { const k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); out.push([x, y]); } };
  let x = r, y = 0, d = 1 - r;
  while (y <= x) {
    for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) add(a, b);
    y++;
    if (d < 0) d += 2 * y + 1; else { x--; d += 2 * (y - x) + 1; }
  }
  return out;
}

/** Bresenham line including both ends. */
export function linePoints(x0: number, y0: number, x1: number, y1: number): Pt[] {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const out: Pt[] = [], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Circle points whose angle lies within [a0, a1] (radians, a0 < a1, span ≤ 2π). */
export function arcPoints(r: number, a0: number, a1: number): Pt[] {
  const mid = (a0 + a1) / 2, half = (a1 - a0) / 2;
  return circlePoints(r).filter(([x, y]) => {
    let d = Math.atan2(y, x) - mid;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d) <= half + 1e-9;
  });
}

/** Plot points as size×size squares; `every` > 1 dots the outline. */
export function plot(ctx: CanvasRenderingContext2D, pts: readonly Pt[], ox: number, oy: number, color: string, size = 1, every = 1): void {
  ctx.fillStyle = color;
  const off = Math.floor(size / 2);
  pts.forEach(([x, y], i) => { if (i % every === 0) ctx.fillRect(ox + x - off, oy + y - off, size, size); });
}

/**
 * Snap the camera to the low-res grid once, then project everything with the same offset, so scenery (blitted from
 * the baked ground) and sprites never drift apart by half a pixel when the camera moves diagonally.
 */
export function projector(cam: { x: number; y: number }) {
  const groundX = Math.round(cam.x / PIXEL), groundY = Math.round(cam.y / PIXEL);
  return { groundX, groundY, X: (wx: number) => Math.round(wx / PIXEL) - groundX, Y: (wy: number) => Math.round(wy / PIXEL) - groundY };
}

/** Checkerboard-dithered ellipse (w×h pixels) centred on (0, 0): 1-bit pixel-art shadows. */
export function shadowPixels(w: number, h: number): Pt[] {
  const rx = w / 2, ry = h / 2, out: Pt[] = [];
  if (rx < 0.5 || ry < 0.5) return out;
  for (let y = -Math.floor(ry); y <= Math.floor(ry); y++) for (let x = -Math.floor(rx); x <= Math.floor(rx); x++) {
    if ((x / rx) ** 2 + (y / ry) ** 2 <= 1 && (x + y) % 2 === 0) out.push([x, y]);
  }
  return out;
}

/** Largest whole multiple of the 480×320 art that fits (every art pixel an exact square block); below 1× it shrinks to fit. */
export function integerScale(w: number, h: number): number {
  const raw = Math.min(w / (960 / PIXEL), h / (640 / PIXEL));
  // up to 2% short still counts (the host frame's border): the stage crops a pixel per edge instead of halving the art
  return raw >= 0.98 ? Math.max(1, Math.floor(raw + 0.02)) : raw;
}
