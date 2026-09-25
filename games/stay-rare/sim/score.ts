import type { RunState, Score } from './types';

export function score(state: Pick<RunState, 'bossesDefeated' | 'tick'>): Score { return { bosses: state.bossesDefeated, ticks: state.tick }; }
/** Positive when `a` is better. */
export function compareScore(a: Score, b: Score): number { return a.bosses - b.bosses || a.ticks - b.ticks; }
