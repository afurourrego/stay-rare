import { useEffect, useRef } from 'react';
import { CHEST_H, CHEST_T, CHEST_W, chestCues, chestFrame, chestPixels, closedFrame, revealCues, type ChestCue, type ChestInk, type ChestKind } from '../render/chestAnim';
import { INK, INK30, PAPER, SIGNAL } from '../render/palette';

const COLOR: Record<ChestInk, string> = { ink: INK, paper: PAPER, ink30: INK30, signal: SIGNAL };

type Props = { kind: ChestKind | null; reducedMotion: boolean; onReveal(): void; onCue(cue: ChestCue): void };
/**
 * The chest, frame by frame on a 48×44 canvas shown at an integer scale: it rattles while the draw settles
 * (kind = null), then plays the opening timeline once the prize is known. Reduced motion paints the last frame.
 */
export function ChestCanvas({ kind, reducedMotion, onReveal, onCue }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onReveal, onCue });
  cb.current = { onReveal, onCue };
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    let raf = 0, last = -1, lastT = -Infinity, revealed = false;
    const start = performance.now();
    const paint = (now: number) => {
      const t = now - start;
      const f = kind ? chestFrame(t, kind, reducedMotion) : closedFrame(t, reducedMotion);
      if (kind && !reducedMotion) chestCues(lastT, t, kind).forEach(c => cb.current.onCue(c));
      lastT = t;
      if (kind && !revealed && (reducedMotion || t >= CHEST_T.open)) {
        revealed = true; cb.current.onReveal();
        if (reducedMotion) revealCues(kind).forEach(c => cb.current.onCue(c));
      }
      const tick = Math.floor(t / 33); // ~30 fps is plenty for stepped pixel animation
      if (tick !== last) {
        last = tick;
        ctx.clearRect(0, 0, CHEST_W, CHEST_H);
        for (const p of chestPixels(f, kind ?? 'poolEntry')) { ctx.fillStyle = COLOR[p.c]; ctx.fillRect(p.x, p.y, 1, 1); }
      }
      if (!reducedMotion) raf = requestAnimationFrame(paint);
    };
    paint(start);
    return () => cancelAnimationFrame(raf);
  }, [kind, reducedMotion]);
  return <canvas ref={canvas} className="sr-chest-canvas" width={CHEST_W} height={CHEST_H} aria-hidden="true" />;
}
