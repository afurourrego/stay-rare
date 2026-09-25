import { spriteFrame, type GenerationSprites, type SpriteFacing } from '@rarefriends/friendsdk/sprites';
import { eyeHoles } from './corrupt';
import { WHITE } from './palette';
import { measureTraits, type Traits } from '../sim/traits';

export const SPRITE_SCALE = 4;
export type FramePalette = Readonly<{ mask: string; halo: string | null; eyes: string | null }>;
/** Your Friend: its plain black silhouette with white eyes, as on rarefriends.com (no halo). */
export const CANONICAL: FramePalette = { mask: '#111111', halo: null, eyes: WHITE };
/** The Corruptor: your Friend, inverted. */
export const CORRUPTED: FramePalette = { mask: '#eeeeee', halo: '#111111', eyes: '#111111' };

/** 16×16 rows of '#'/'.' → (n+2)² grid: 'm' mask, 'e' enclosed hole (the eyes), 'h' halo (8-neighbour ring), '.' empty. */
export function haloGrid(rows: readonly string[]): string[] {
  const size = rows.length + 2, on = (x: number, y: number) => rows[y - 1]?.[x - 1] === '#';
  const eyes = eyeHoles(rows), w = rows[0]?.length ?? 0;
  return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
    if (on(x, y)) return 'm';
    if (eyes.has((y - 1) * w + (x - 1)) && x >= 1 && y >= 1 && x <= w && y <= rows.length) return 'e';
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (on(x + ox, y + oy)) return 'h';
    return '.';
  }).join(''));
}

/** Always through the SDK's spriteFrame so Colossus up/down uses the side fallback. */
export function resolveFrameRows(sprites: GenerationSprites, facing: SpriteFacing, walking: boolean, frame: number, side: 'left' | 'right'): readonly string[] {
  return spriteFrame(sprites, facing, walking, frame, side).frame.rows;
}

export function frameCanvas(rows: readonly string[], palette: FramePalette): HTMLCanvasElement {
  const grid = haloGrid(rows), canvas = document.createElement('canvas');
  canvas.width = canvas.height = grid.length;
  const g = canvas.getContext('2d')!;
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    const fill = ch === 'm' ? palette.mask : ch === 'h' ? palette.halo : ch === 'e' ? palette.eyes : null;
    if (!fill) return;
    g.fillStyle = fill;
    g.fillRect(x, y, 1, 1);
  }));
  return canvas;
}

/** Your Friend's traits, read from its canonical side sprite (the same frame for every family, Colossus included). */
export function friendTraits(sprites: GenerationSprites): Traits {
  return measureTraits(resolveFrameRows(sprites, 'right', false, 0, 'right'));
}

export type FriendFrames = { get(facing: SpriteFacing, walking: boolean, frame: number): HTMLCanvasElement };
export function prepareFriendFrames(sprites: GenerationSprites, palette: FramePalette = CANONICAL): FriendFrames {
  const cache = new Map<string, HTMLCanvasElement>();
  let side: 'left' | 'right' = 'right';
  return {
    get(facing, walking, frame) {
      if (facing === 'left' || facing === 'right') side = facing;
      const resolved = spriteFrame(sprites, facing, walking, frame, side);
      const key = `${resolved.resolvedFacing}-${walking}-${frame}`;
      let canvas = cache.get(key);
      if (!canvas) { canvas = frameCanvas(resolved.frame.rows, palette); cache.set(key, canvas); }
      return canvas;
    },
  };
}
