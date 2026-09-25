import { describe, expect, test } from 'vitest';
import { createRecorder, quantizeAxis, replayRun } from '../../games/stay-rare/sim/replay';
import { chooseCard, createRun, step } from '../../games/stay-rare/sim/run';
import { score } from '../../games/stay-rare/sim/score';
import type { FamilyId, RunState } from '../../games/stay-rare/sim/types';
import { botChoice, fleeInput } from '../helpers/bots';
import { FAMILY } from '../helpers/state';

function recordedRun(seed: number, familyId: FamilyId, ticks: number) {
  const state = createRun(seed, familyId, 1), recorder = createRecorder(seed, familyId, 1);
  while (!state.over && state.tick < ticks) {
    if (state.capsule) { const i = botChoice(state.capsule); recorder.choice(i); chooseCard(state, i); continue; }
    step(state, recorder.input(fleeInput(state)));
  }
  return { state, rec: recorder.rec };
}
const snapshot = (s: RunState) => JSON.stringify({ ...s, events: [] });

describe('determinism', () => {
  test('quantizeAxis maps [-1, 1] to integers in [-127, 127]', () => {
    expect([-2, -1, 0, 0.5, 1].map(quantizeAxis)).toEqual([-127, -127, 0, 64, 127]);
  });
  test('replaying a recording reproduces the run exactly', () => {
    const { state, rec } = recordedRun(77, FAMILY.skeleton, 3000);
    const replayed = replayRun(rec);
    expect(score(replayed)).toEqual(score(state));
    expect(snapshot(replayed)).toBe(snapshot(state));
  });
  test('different seeds diverge', () => {
    expect(snapshot(recordedRun(1, FAMILY.mask, 600).state)).not.toBe(snapshot(recordedRun(2, FAMILY.mask, 600).state));
  });
});

describe('robustness', () => {
  test('a long late-cycle run keeps caps and finite positions', () => {
    const s = createRun(9, FAMILY.family, 2);
    s.cycle = 12; s.player.hp = 1e12;
    for (let i = 0; i < 3000; i++) { if (s.capsule) chooseCard(s, 0); step(s, { dx: Math.sin(i / 50), dy: Math.cos(i / 70) }); }
    expect(s.enemies.length).toBeLessThanOrEqual(401);
    expect(s.gems.length).toBeLessThanOrEqual(600);
    const coords = [s.player, ...s.enemies, ...s.projectiles, ...s.gems].flatMap(o => [o.x, o.y]);
    expect(coords.every(Number.isFinite)).toBe(true);
  });
});
