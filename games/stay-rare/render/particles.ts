import type { GameEvent } from '../sim/types';

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number };
const MAX = 600;

/** Presentation only (Math.random is fine here; never used by the sim). */
export class Particles {
  list: Particle[] = [];
  fromEvents(events: readonly GameEvent[], reduced: boolean): void {
    for (const e of events) {
      if (e.type === 'block' || e.type === 'break') { // a shot chips the scenery; a broken prop bursts into debris
        const big = e.type === 'break';
        for (let i = 0; i < (reduced ? 1 : big ? 12 : 4); i++) {
          const a = Math.random() * Math.PI * 2, s = (big ? 1.4 : 0.8) + Math.random();
          this.list.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: big ? 18 : 10, size: big ? 2 + (i % 2) * 2 : 2 });
        }
        continue;
      }
      if (e.type !== 'kill' && e.type !== 'bossDown') continue;
      const n = reduced ? 1 : e.type === 'bossDown' ? 30 : 8;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2;
        this.list.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 18, size: e.type === 'bossDown' ? 6 : 2 + Math.floor(Math.random() * 3) });
      }
    }
    if (this.list.length > MAX) this.list.splice(0, this.list.length - MAX);
  }
  update(): void {
    for (const p of this.list) { p.x += p.vx; p.y += p.vy; p.life--; }
    this.list = this.list.filter(p => p.life > 0);
  }
}
