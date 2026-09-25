import type { GameEvent } from '../sim/types';
import { INK, SIGNAL } from './palette';

/** Presentation-only celebrations (render side; Math.random is fine here). Positions are world coordinates. */
export type Ring = { x: number; y: number; t: number; max: number };
export type Confetti = { x: number; y: number; vx: number; vy: number; life: number; color: string };
export type Banner = { text: string; t: number };
export type Label = { text: string; x: number; y: number; t: number };

const LABEL_FRAMES = 40, MAX_CONFETTI = 300, RING_FRAMES = 24, BANNER_FRAMES = 75, CONFETTI_FRAMES = 60;

/** How far (low-res px) a +HP label has risen; it stays put under reduced motion. */
export function labelRise(t: number, reduced: boolean): number { return reduced ? 0 : (LABEL_FRAMES - t) >> 1; }

export class Fx {
  rings: Ring[] = [];
  confetti: Confetti[] = [];
  banner: Banner | null = null;
  labels: Label[] = [];

  fromEvents(events: readonly GameEvent[], reduced: boolean): void {
    for (const e of events) {
      if (e.type === 'heal') { // a health patch: small ring and a rising +HP
        this.labels.push({ text: '+HP', x: e.x, y: e.y, t: LABEL_FRAMES });
        if (!reduced) this.rings.push({ x: e.x, y: e.y, t: RING_FRAMES, max: 40 });
        continue;
      }
      if (e.type !== 'levelUp' && e.type !== 'bossDown') continue;
      this.banner = { text: e.type === 'levelUp' ? 'LEVEL UP!' : 'BOSS DOWN!', t: BANNER_FRAMES };
      if (reduced) continue;
      this.rings.push({ x: e.x, y: e.y, t: RING_FRAMES, max: e.type === 'bossDown' ? 140 : 90 });
      for (let i = 0; i < 28; i++) {
        const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4;
        this.confetti.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, life: CONFETTI_FRAMES, color: i % 3 === 0 ? INK : SIGNAL });
      }
    }
    if (this.confetti.length > MAX_CONFETTI) this.confetti.splice(0, this.confetti.length - MAX_CONFETTI);
  }

  update(): void {
    for (const r of this.rings) r.t--;
    for (const c of this.confetti) { c.x += c.vx; c.y += c.vy; c.vy += 0.25; c.vx *= 0.97; c.life--; }
    for (const l of this.labels) l.t--;
    this.labels = this.labels.filter(l => l.t > 0);
    this.rings = this.rings.filter(r => r.t > 0);
    this.confetti = this.confetti.filter(c => c.life > 0);
    if (this.banner && --this.banner.t <= 0) this.banner = null;
  }
}
