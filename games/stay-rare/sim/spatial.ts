const CELL = 64;
const key = (cx: number, cy: number) => cx * 4096 + cy;
export type Grid = Readonly<{ cells: Map<number, number[]> }>;

/** Uniform grid of point indices; rebuilt whenever positions change. */
export function buildGrid(points: readonly { x: number; y: number }[]): Grid {
  const cells = new Map<number, number[]>();
  points.forEach((p, i) => {
    const k = key(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
    const list = cells.get(k);
    if (list) list.push(i); else cells.set(k, [i]);
  });
  return { cells };
}

/** Indices of points in cells overlapping the square around (x, y); callers do the exact distance test. */
export function queryGrid(grid: Grid, x: number, y: number, radius: number, out: number[] = []): number[] {
  out.length = 0;
  const x0 = Math.floor((x - radius) / CELL), x1 = Math.floor((x + radius) / CELL);
  const y0 = Math.floor((y - radius) / CELL), y1 = Math.floor((y + radius) / CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const list = grid.cells.get(key(cx, cy));
    if (list) for (const i of list) out.push(i);
  }
  return out;
}
