import { RF } from '@rarefriends/friendsdk/game';
import type { DailyPoolView } from '../economy/dailyPool';
import { PASSIVES, WEAPONS, WEAPON_MAX_LEVEL, PASSIVE_MAX_LEVEL } from '../sim/content';
import { TICK_HZ, type Card, type PassiveId, type RunState, type Score, type WeaponId } from '../sim/types';

/** Up to 4 decimals, truncated; thousands separators. */
export function rf(v: bigint): string {
  const whole = v / RF, frac = (v % RF).toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
  return `${whole.toLocaleString('en-US')}${frac ? `.${frac}` : ''} RF`;
}
export function formatTime(ticks: number): string {
  const s = Math.floor(ticks / TICK_HZ);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function formatScore(s: Score): string { return `${s.bosses} boss${s.bosses === 1 ? '' : 'es'} · ${formatTime(s.ticks)}`; }
export function formatCountdown(ms: number): string {
  const m = Math.floor(ms / 60_000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

const plural = (n: number, word: string) => `+${n} ${word}${n === 1 ? '' : 's'}`;
export function cardText(card: Card, state: RunState): { title: string; detail: string } {
  if (card.kind === 'heal') return { title: 'Patch', detail: '+20 HP' };
  if (card.kind === 'evolution') {
    const w = WEAPONS[card.id as WeaponId];
    return { title: w.evolvedName, detail: `Evolves ${w.name}: double damage, faster` };
  }
  if (card.kind === 'weapon') {
    const w = WEAPONS[card.id as WeaponId], cur = state.weapons.find(s => s.id === card.id)?.level;
    return cur === undefined
      ? { title: w.name, detail: `New · Lv ${Math.min(WEAPON_MAX_LEVEL, card.levels)} · ${w.description}` }
      : { title: w.name, detail: `${plural(card.levels, 'level')} (Lv ${cur} → ${Math.min(WEAPON_MAX_LEVEL, cur + card.levels)})` };
  }
  const p = PASSIVES[card.id as PassiveId], cur = state.passives.find(s => s.id === card.id)?.level;
  return cur === undefined
    ? { title: p.name, detail: `New · Lv ${Math.min(PASSIVE_MAX_LEVEL, card.levels)} · ${p.description}` }
    : { title: p.name, detail: `${plural(card.levels, 'level')} (Lv ${cur} → ${Math.min(PASSIVE_MAX_LEVEL, cur + card.levels)})` };
}

export function buildSummary(state: RunState): string[] {
  return [
    ...state.weapons.map(w => `${w.evolved ? WEAPONS[w.id].evolvedName : WEAPONS[w.id].name} Lv ${w.level}`),
    ...state.passives.map(p => `${PASSIVES[p.id].name} Lv ${p.level}`),
  ];
}

export function rankLine(view: DailyPoolView): string {
  if (view.yourRank === null) return 'Play a run to enter today’s pool.';
  if (view.yourRank <= 10) return `You are #${view.yourRank}: ${rf(view.yourPayout)} if the day ended now.`;
  return `You are #${view.yourRank}. The top 10 get paid.`;
}
