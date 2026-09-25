import type { SpriteFacing } from '@rarefriends/friendsdk/sprites';
import { WORLD } from '../sim/content';

export const VIEW_W = 960;
export const VIEW_H = 640;

export function cameraFor(px: number, py: number): { x: number; y: number } {
  return {
    x: Math.min(WORLD.width - VIEW_W, Math.max(0, px - VIEW_W / 2)),
    y: Math.min(WORLD.height - VIEW_H, Math.max(0, py - VIEW_H / 2)),
  };
}

export function facingFromVector(fx: number, fy: number): SpriteFacing {
  return Math.abs(fx) >= Math.abs(fy) ? (fx < 0 ? 'left' : 'right') : (fy < 0 ? 'up' : 'down');
}
