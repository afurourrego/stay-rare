import { WORLD } from '../../games/stay-rare/sim/content';
import { chooseCard, createRun, step } from '../../games/stay-rare/sim/run';
import { NEUTRAL_TRAITS, type Traits } from '../../games/stay-rare/sim/traits';
import type { Card, FamilyId, InputFrame, Milestone, RunState } from '../../games/stay-rare/sim/types';

const DANGER = 60;
/**
 * A cautious human-like player: dodge glitches that get within 60 px (inverse-square, bullets count double),
 * otherwise walk to the nearest gem within 350 px, otherwise circle slowly; always keep off the world edge.
 */
export function fleeInput(state: RunState): InputFrame {
  const p = state.player;
  let dx = 0, dy = 0;
  const repel = (x: number, y: number, weight: number) => {
    const ex = p.x - x, ey = p.y - y, d2 = ex * ex + ey * ey;
    if (d2 > DANGER * DANGER || d2 === 0) return;
    dx += ex / d2 * weight; dy += ey / d2 * weight;
  };
  for (const e of state.enemies) repel(e.x, e.y, e.boss ? 3 : 1);
  for (const b of state.projectiles) if (b.hostile) repel(b.x, b.y, 2);
  if (dx === 0 && dy === 0) {
    let best: { x: number; y: number } | null = null, bestD = 350 * 350;
    for (const g of state.gems) { const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2; if (d < bestD) { bestD = d; best = g; } }
    if (best) { const l = Math.hypot(best.x - p.x, best.y - p.y) || 1; dx = (best.x - p.x) / l; dy = (best.y - p.y) / l; }
    else { dx = Math.cos(state.tick / 120); dy = Math.sin(state.tick / 120); }
  } else { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
  const margin = 300;
  if (p.x < margin) dx += 1; if (p.x > WORLD.width - margin) dx -= 1;
  if (p.y < margin) dy += 1; if (p.y > WORLD.height - margin) dy -= 1;
  const len = Math.hypot(dx, dy);
  return len > 0 ? { dx: dx / len, dy: dy / len } : { dx: 0, dy: 0 };
}

/** Evolution > weapon > passive > heal; ties go to more levels. */
export function botChoice(cards: readonly Card[]): number {
  const rank = (c: Card) => c.kind === 'evolution' ? 0 : c.kind === 'weapon' ? 1 : c.kind === 'passive' ? 2 : 3;
  let best = 0;
  cards.forEach((c, i) => { if (rank(c) < rank(cards[best]) || (rank(c) === rank(cards[best]) && c.levels > cards[best].levels)) best = i; });
  return best;
}

export function playBot(seed: number, familyId: FamilyId, milestone: Milestone, policy: 'idle' | 'flee', maxTicks: number, stop?: (s: RunState) => boolean, traits: Traits = NEUTRAL_TRAITS): RunState {
  const state = createRun(seed, familyId, milestone, traits);
  while (!state.over && state.tick < maxTicks && !stop?.(state)) {
    if (state.capsule) { chooseCard(state, botChoice(state.capsule)); continue; }
    step(state, policy === 'idle' ? { dx: 0, dy: 0 } : fleeInput(state));
  }
  return state;
}
