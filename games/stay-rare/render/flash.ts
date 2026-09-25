/** Presentation-only hit feedback: an enemy whose HP dropped since the last frame flashes for 3 frames. */
export class HitFlash {
  private hp = new Map<number, number>();
  private until = new Map<number, number>();
  private frame = 0;
  /** Reduced motion: no white flash, no impact star. */
  still = false;

  observe(enemies: readonly { id: number; hp: number }[]): void {
    this.frame++;
    const seen = new Set<number>();
    for (const e of enemies) {
      seen.add(e.id);
      const prev = this.hp.get(e.id);
      if (prev !== undefined && e.hp < prev) this.until.set(e.id, this.frame + 3);
      this.hp.set(e.id, e.hp);
    }
    for (const id of [...this.hp.keys()]) if (!seen.has(id)) { this.hp.delete(id); this.until.delete(id); }
  }

  isFlashing(id: number): boolean { return !this.still && (this.until.get(id) ?? 0) > this.frame; }
  /** Impact animation stage: 3 on the hit frame, then 2, 1; 0 when done. */
  stage(id: number): number { return this.still ? 0 : Math.max(0, (this.until.get(id) ?? 0) - this.frame); }
}

/** Your Friend blinks while invulnerable (hidden every other 8 ticks); reduced motion keeps it on screen. */
export function blinkHidden(invuln: number, tick: number, reduced: boolean): boolean {
  return !reduced && invuln > 0 && Math.floor(tick / 8) % 2 === 0;
}
