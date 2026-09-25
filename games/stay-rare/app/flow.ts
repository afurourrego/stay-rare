import type { ChestResult } from '../economy/run';
import type { Score } from '../sim/types';

export type Screen =
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'title' }
  | { name: 'starting' }
  | { name: 'run'; playId: bigint }
  | { name: 'results'; playId: bigint; score: Score; build: string[] }
  | { name: 'chest'; playId: bigint; result: ChestResult | null; score: Score | null; build: string[] };

export type FlowAction =
  | { type: 'reset' } | { type: 'loaded' } | { type: 'failed'; message: string }
  | { type: 'start' } | { type: 'started'; playId: bigint } | { type: 'startFailed' }
  | { type: 'ended'; score: Score; build: string[] } | { type: 'toChest' } | { type: 'resumeChest'; playId: bigint }
  | { type: 'opened'; result: ChestResult } | { type: 'done' };

/** Screen state machine. Actions that do not apply to the current screen return it unchanged. */
export function flow(state: Screen, action: FlowAction): Screen {
  switch (action.type) {
    case 'reset': return { name: 'loading' };
    case 'failed': return { name: 'error', message: action.message };
    case 'loaded': return state.name === 'loading' || state.name === 'error' ? { name: 'title' } : state;
    case 'start': return state.name === 'title' ? { name: 'starting' } : state;
    case 'started': return state.name === 'starting' ? { name: 'run', playId: action.playId } : state;
    case 'startFailed': return state.name === 'starting' ? { name: 'title' } : state;
    case 'ended': return state.name === 'run' ? { name: 'results', playId: state.playId, score: action.score, build: action.build } : state;
    case 'toChest': return state.name === 'results' ? { name: 'chest', playId: state.playId, result: null, score: state.score, build: state.build } : state;
    case 'resumeChest': return state.name === 'title' ? { name: 'chest', playId: action.playId, result: null, score: null, build: [] } : state;
    case 'opened': return state.name === 'chest' ? { ...state, result: action.result } : state;
    case 'done': return state.name === 'chest' && state.result && state.result.kind !== 'sealing' ? { name: 'title' } : state;
  }
}
