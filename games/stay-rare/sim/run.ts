import { applyCard, rollCapsule } from './capsule';
import { removeDead } from './combat';
import { CONTENT_MILESTONE, WORLD, startingWeapon } from './content';
import { runDirector } from './director';
import { updateEnemies } from './enemies';
import { collectGems, movePlayer } from './player';
import { breakablesFor, collectPatches } from './props';
import { obstaclesFor } from './layout';
import { createRng } from './rng';
import { NEUTRAL_TRAITS, type Traits } from './traits';
import { computeStats } from './stats';
import type { FamilyId, InputFrame, Milestone, RunState } from './types';
import { fireWeapons, updateBeams, updateMines, updateProjectiles } from './weapons';

export function createRun(seed: number, familyId: FamilyId, milestone: Milestone = CONTENT_MILESTONE, traits: Traits = NEUTRAL_TRAITS): RunState {
  if (!Number.isInteger(familyId) || familyId < 0 || familyId > 8) throw new RangeError('Unknown family.');
  const state: RunState = {
    seed: seed >>> 0, familyId, milestone, rng: createRng(seed),
    tick: 0, cycle: 0, phase: 'wave', phaseTick: 0, spawnAcc: 0, bossesDefeated: 0,
    player: { x: WORLD.width / 2, y: WORLD.height / 2, hp: 0, facingX: 1, facingY: 0, moving: false, invuln: 0 },
    weapons: [{ id: startingWeapon(familyId, milestone), level: 1, cd: 0, evolved: false, volley: 0 }], passives: [],
    xp: 0, level: 1, pendingLevels: 0, capsule: null, over: false,
    enemies: [], projectiles: [], gems: [], mines: [], walls: [], effects: [], obstacles: obstaclesFor(seed >>> 0), breakables: [], broken: [], patches: [], traits, events: [], nextId: 1, orbitAngle: 0,
  };
  state.breakables = breakablesFor(state.seed, state.obstacles);
  state.player.hp = computeStats(state).maxHp;
  return state;
}

function openCapsule(state: RunState): void {
  state.pendingLevels--;
  state.capsule = rollCapsule(state);
  state.events.push({ type: 'capsule', x: state.player.x, y: state.player.y });
}

/** One 1/60 s tick. No-op while a capsule is open or the run is over. */
export function step(state: RunState, input: InputFrame): void {
  if (state.over || state.capsule) return;
  state.events.length = 0;
  const stats = computeStats(state);
  state.tick++;
  state.phaseTick++;
  movePlayer(state, input, stats);
  runDirector(state);
  updateEnemies(state, stats);
  fireWeapons(state, stats);
  updateProjectiles(state, stats);
  updateMines(state, stats);
  updateBeams(state, stats);
  for (const w of state.walls) w.ttl--;
  for (const f of state.effects) f.ttl--;
  collectGems(state, stats);
  collectPatches(state, stats);
  removeDead(state, stats);
  if (state.player.hp <= 0) { state.player.hp = 0; state.over = true; return; }
  if (state.pendingLevels > 0) openCapsule(state);
}

export function chooseCard(state: RunState, index: number): void {
  const card = state.capsule?.[index];
  if (!card) return;
  applyCard(state, card);
  state.capsule = null;
  if (state.pendingLevels > 0) openCapsule(state);
}

/** `[ End run ]` in the pause menu: counts as a death. */
export function endRun(state: RunState): void { state.over = true; state.capsule = null; }
