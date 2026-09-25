export const BG_CELL = 64;

function hash(x: number, y: number): number {
  let h = (Math.imul(x, 374_761_393) + Math.imul(y, 668_265_263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Deterministic dither blotch for a background cell: 0 = none, 1–3 = size (~12% of cells). */
export function blotchAt(cx: number, cy: number): number {
  const h = hash(cx, cy);
  return h % 100 < 12 ? 1 + ((h >>> 8) % 3) : 0;
}

/** Lattice points (every BG_CELL px) covering the view, one cell of margin on each side. */
export function crossesInView(cam: { x: number; y: number }, w: number, h: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const x0 = Math.floor(cam.x / BG_CELL) * BG_CELL, y0 = Math.floor(cam.y / BG_CELL) * BG_CELL;
  for (let x = x0; x <= cam.x + w + BG_CELL; x += BG_CELL) for (let y = y0; y <= cam.y + h + BG_CELL; y += BG_CELL) out.push({ x, y });
  return out;
}
