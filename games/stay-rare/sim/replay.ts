import { chooseCard, createRun, step } from './run';
import { NEUTRAL_TRAITS, type Traits } from './traits';
import type { FamilyId, InputFrame, Milestone, RunState } from './types';

/** Everything needed to re-simulate a run: seed, family, your Friend's traits, quantized inputs per stepped tick, card choices in order. */
export type Recording = { seed: number; familyId: FamilyId; milestone: Milestone; traits?: Traits; inputs: number[]; choices: number[] };

export function quantizeAxis(v: number): number { return Math.max(-127, Math.min(127, Math.round(v * 127))); }

export function createRecorder(seed: number, familyId: FamilyId, milestone: Milestone, traits: Traits = NEUTRAL_TRAITS) {
  const rec: Recording = { seed, familyId, milestone, traits, inputs: [], choices: [] };
  return {
    rec,
    /** Quantize, record, and return exactly what the sim must receive. */
    input(frame: InputFrame): InputFrame {
      const qx = quantizeAxis(frame.dx), qy = quantizeAxis(frame.dy);
      rec.inputs.push(qx, qy);
      return { dx: qx / 127, dy: qy / 127 };
    },
    choice(index: number): void { rec.choices.push(index); },
  };
}

/** Future anti-cheat: a server can replay a recording and verify the claimed score. */
export function replayRun(rec: Recording): RunState {
  const state = createRun(rec.seed, rec.familyId, rec.milestone, rec.traits ?? NEUTRAL_TRAITS);
  let c = 0;
  for (let i = 0; i < rec.inputs.length; i += 2) {
    while (state.capsule) chooseCard(state, rec.choices[c++] ?? 0);
    step(state, { dx: rec.inputs[i] / 127, dy: rec.inputs[i + 1] / 127 });
  }
  return state;
}
