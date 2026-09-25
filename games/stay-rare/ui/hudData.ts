import { BOSSES, xpToNext } from '../sim/content';
import { computeStats } from '../sim/stats';
import type { RunState } from '../sim/types';
import { formatTime } from './format';

export type HudData = Readonly<{ hp: number; maxHp: number; xpPct: number; level: number; bosses: number; time: string; phase: string }>;

export function hudData(state: RunState): HudData {
  const boss = state.enemies.find(e => e.boss);
  return {
    hp: Math.ceil(state.player.hp), maxHp: Math.round(computeStats(state).maxHp),
    xpPct: Math.min(100, Math.floor(state.xp / xpToNext(state.level) * 100)), level: state.level,
    bosses: state.bossesDefeated, time: formatTime(state.tick),
    phase: boss ? `Boss · ${BOSSES[boss.boss!].name}` : `Wave ${state.cycle + 1}`,
  };
}
/** HUD re-renders only when this changes (a few times per second at most). */
export const hudKey = (h: HudData) => `${h.hp}|${h.maxHp}|${h.xpPct}|${h.level}|${h.bosses}|${h.time}|${h.phase}`;
