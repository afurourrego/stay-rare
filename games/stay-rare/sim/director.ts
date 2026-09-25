import { BOSSES, BOSS_REWARD, BOSS_ROTATION, DIRECTOR, xpToNext } from './content';
import { gainXp } from './player';
import { nextFloat } from './rng';
import { spawnBossEnemy, spawnEnemy } from './spawn';
import type { Stats } from './stats';
import { TICK_HZ, type BossKind, type EnemyKind, type Milestone, type RunState } from './types';

/** Regular spawns per second: 1.5 · (1 + 0.35c) · (1 + s/75). */
export function spawnRate(cycle: number, second: number): number {
  return DIRECTOR.baseRate * (1 + DIRECTOR.cycleRate * cycle) * (1 + second / DIRECTOR.waveSeconds);
}

export function availableKinds(state: RunState): { kind: EnemyKind; weight: number }[] {
  const s = state.phaseTick / TICK_HZ, c = state.cycle;
  const list: { kind: EnemyKind; weight: number }[] = [{ kind: 'mote', weight: 6 }];
  if (c >= 1 || s >= DIRECTOR.swarmFromSecond) list.push({ kind: 'swarm', weight: 2 });
  if (c >= 1) list.push({ kind: 'block', weight: 1.5 });
  if (c >= 2 || (c === 1 && s >= DIRECTOR.scanlineFromSecond)) list.push({ kind: 'scanline', weight: 1.2 });
  if (state.milestone >= 2 && c >= 2) list.push({ kind: 'splitter', weight: 1.2 }, { kind: 'blinker', weight: 1 });
  return list;
}

export function bossForCycle(cycle: number, milestone: Milestone): BossKind {
  const list = BOSS_ROTATION.filter(b => BOSSES[b].milestone <= milestone);
  return list[cycle % list.length];
}

function ringPoint(state: RunState, distance: number) {
  const a = nextFloat(state.rng) * Math.PI * 2;
  return { x: state.player.x + Math.cos(a) * distance, y: state.player.y + Math.sin(a) * distance };
}

function pickKind(state: RunState): EnemyKind {
  const list = availableKinds(state), total = list.reduce((sum, k) => sum + k.weight, 0);
  let r = nextFloat(state.rng) * total;
  for (const k of list) { r -= k.weight; if (r < 0) return k.kind; }
  return list[list.length - 1].kind;
}

function spawnUnit(state: RunState): void {
  const kind = pickKind(state), at = ringPoint(state, DIRECTOR.spawnDistance);
  if (kind !== 'swarm') { spawnEnemy(state, kind, at.x, at.y); return; }
  for (let i = 0; i < DIRECTOR.swarmSize && state.enemies.length < DIRECTOR.maxEnemies; i++) {
    spawnEnemy(state, 'swarm', at.x + (i % 3) * 14, at.y + Math.floor(i / 3) * 14);
  }
}

/** Runs once per tick after `phaseTick` was incremented: wave → boss phase, and regular spawns. */
export function runDirector(state: RunState): void {
  if (state.phase === 'wave' && state.phaseTick >= DIRECTOR.waveSeconds * TICK_HZ) {
    state.phase = 'boss';
    const at = ringPoint(state, DIRECTOR.bossDistance);
    const boss = spawnBossEnemy(state, bossForCycle(state.cycle, state.milestone), at.x, at.y);
    state.events.push({ type: 'bossSpawn', x: boss.x, y: boss.y });
  }
  const second = Math.min(state.phaseTick / TICK_HZ, DIRECTOR.waveSeconds);
  const rate = spawnRate(state.cycle, second) * (state.phase === 'boss' ? DIRECTOR.bossPhaseRate : 1);
  state.spawnAcc += rate / TICK_HZ;
  while (state.spawnAcc >= 1) {
    state.spawnAcc -= 1;
    if (state.enemies.length < DIRECTOR.maxEnemies) spawnUnit(state);
  }
}

/** XP cache (exactly one level), 30% heal, next cycle's wave. */
export function onBossDefeated(state: RunState, stats: Stats): void {
  state.bossesDefeated++;
  state.xp = Math.max(state.xp, xpToNext(state.level));
  gainXp(state, 0);
  state.player.hp = Math.min(stats.maxHp, state.player.hp + stats.maxHp * BOSS_REWARD.healFraction);
  state.cycle++;
  state.phase = 'wave';
  state.phaseTick = 0;
  state.spawnAcc = 0;
  state.walls.length = 0;
}
