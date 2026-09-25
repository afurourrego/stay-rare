import { decodeSpriteBitmap } from '@rarefriends/friendsdk/sprites';
import { createRng, nextFloat, nextInt } from '../sim/rng';
import type { EnemyKind } from '../sim/types';
import { ENEMY_FRIENDS, type EnemyFriend } from './enemyFriends';
import { eyeHoles } from '../sim/traits';
export { eyeHoles } from '../sim/traits';
import { INK, INK30, RED, SIGNAL } from './palette';

export function decodeRows(hex: string): string[] { return [...decodeSpriteBitmap(BigInt(`0x${hex}`)).rows]; }

/** Same Friend for the whole life of an enemy. */
export function pickEnemyFriend(enemyId: number): EnemyFriend { return ENEMY_FRIENDS[enemyId % ENEMY_FRIENDS.length]; }

/** Integer scale on the half-resolution canvas (Friend pixel → low-res pixels), by glitch type. */
export function enemyScale(kind: EnemyKind | 'boss'): number {
  switch (kind) {
    case 'swarm': return 1;
    case 'block': return 3;
    case 'boss': return 4;
    default: return 2;
  }
}


/**
 * The static corrupts a Friend: rows slide sideways, pixels drop out, noise ('n') clings to the edges.
 * `strength` 0 = untouched; scanline glitches also lose every third row. Deterministic by `phase`.
 */
export function corruptRows(rows: readonly string[], phase: number, strength: number, scanline: boolean): string[] {
  const rng = createRng(0x51a7 + phase * 131 + Math.round(strength * 1000));
  let out = rows.map(r => r.split(''));
  if (strength > 0) {
    out = out.map(row => {
      if (nextFloat(rng) >= strength * 0.3) return row;
      const shift = (nextInt(rng, 2) + 1) * (nextFloat(rng) < 0.5 ? -1 : 1);
      return row.map((_, x) => row[x - shift] ?? '.');
    });
    out = out.map(row => row.map(c => (c === '#' && nextFloat(rng) < strength * 0.12 ? '.' : c)));
  }
  // Red eyes: marked after the slices move (a broken row makes an eye flicker) and before the static spreads.
  const eyes = eyeHoles(out.map(r => r.join('')));
  out = out.map((row, y) => row.map((c, x) => (eyes.has(y * row.length + x) ? 'e' : c)));
  if (strength > 0) {
    const on = (x: number, y: number) => out[y]?.[x] === '#';
    out = out.map((row, y) => row.map((c, x) => (c === '.' && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) && nextFloat(rng) < strength * 0.25 ? 'n' : c)));
  }
  if (scanline) out = out.map((row, y) => (y % 3 === 1 ? row.map(() => '.') : row));
  return out.map(r => r.join(''));
}

export type EnemySprites = { get(friend: EnemyFriend, side: 'left' | 'right', frame: number, kind: EnemyKind | 'boss', flash: boolean): HTMLCanvasElement };
const STRENGTH: Partial<Record<EnemyKind | 'boss', number>> = { block: 0.75, boss: 0.85, swarm: 0.35, blinker: 0.7 };

/** 16×16 canvases: ink Friend + grey static; hit flash = signal fill with ink edge. Cached per friend/frame/phase. */
export function createEnemySprites(): EnemySprites {
  const cache = new Map<string, HTMLCanvasElement>();
  return {
    get(friend, side, frame, kind, flash) {
      const phase = frame % 4, key = `${friend.tokenId}:${side}:${frame}:${kind}:${flash}`;
      let canvas = cache.get(key);
      if (canvas) return canvas;
      const rows = corruptRows(decodeRows(friend[side][frame % 8]), phase, STRENGTH[kind] ?? 0.45, kind === 'scanline');
      canvas = document.createElement('canvas');
      canvas.width = canvas.height = 16;
      const g = canvas.getContext('2d')!;
      rows.forEach((row, y) => [...row].forEach((c, x) => {
        if (c === '.') return;
        const edge = c === '#' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => rows[y + dy]?.[x + dx] !== '#');
        g.fillStyle = c === 'e' ? RED : c === 'n' ? INK30 : flash ? (edge ? INK : SIGNAL) : INK;
        g.fillRect(x, y, 1, 1);
      }));
      if (cache.size > 2000) cache.clear();
      cache.set(key, canvas);
      return canvas;
    },
  };
}
