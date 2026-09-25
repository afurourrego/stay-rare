import { useEffect, useRef } from 'react';
import type { GenerationSprites } from '@rarefriends/friendsdk/sprites';
import { prepareFriendFrames } from '../render/sprites';

export function FriendPortrait({ sprites, reducedMotion, scale = 8 }: { sprites: GenerationSprites; reducedMotion: boolean; scale?: number }) {
  const px = 18 * scale;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const frames = prepareFriendFrames(sprites), ctx = ref.current!.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let frame = 0, last = -Infinity, handle = 0;
    const draw = (t: number) => {
      if (t - last > 160) { last = t; ctx.clearRect(0, 0, px, px); ctx.drawImage(frames.get('down', false, frame), 0, 0, px, px); frame = (frame + 1) % 8; }
      if (!reducedMotion) handle = requestAnimationFrame(draw);
    };
    handle = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(handle);
  }, [sprites, reducedMotion, px]);
  return <canvas ref={ref} width={px} height={px} className="sr-portrait" role="img" aria-label={`${sprites.familyName} Friend #${sprites.tokenId}`} />;
}
