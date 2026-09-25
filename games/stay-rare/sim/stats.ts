import { FAMILIES, PASSIVES, PLAYER } from './content';
import { traitMods } from './traits';
import type { PassiveId, RunState } from './types';

export type Stats = Readonly<{
  maxHp: number; speed: number; pickup: number; damageMul: number; cooldownMul: number; areaMul: number;
  crit: number; regen: number; invulnTicks: number; xpMul: number;
}>;

export function computeStats(state: Pick<RunState, 'familyId' | 'passives' | 'traits'>): Stats {
  const m = FAMILIES[state.familyId].mods, t = traitMods(state.traits);
  const lv = (id: PassiveId) => state.passives.find(p => p.id === id)?.level ?? 0;
  return {
    maxHp: PLAYER.hp * (m.hp ?? 1) * t.hp + PASSIVES.thickOutline.perLevel * lv('thickOutline'),
    speed: PLAYER.speed * (m.speed ?? 1) * t.speed * (1 + PASSIVES.swiftPixel.perLevel * lv('swiftPixel')),
    pickup: PLAYER.pickup * t.pickup * (1 + PASSIVES.magnet.perLevel * lv('magnet')),
    damageMul: (m.damage ?? 1) * (1 + PASSIVES.sharpEdge.perLevel * lv('sharpEdge')),
    cooldownMul: (m.cooldown ?? 1) * t.cooldown * (1 - PASSIVES.overclock.perLevel * lv('overclock')),
    areaMul: (m.area ?? 1) * (1 + PASSIVES.wideFrame.perLevel * lv('wideFrame')),
    crit: PLAYER.crit + (m.crit ?? 0) + t.crit,
    regen: m.regen ?? 0,
    invulnTicks: m.invulnTicks ?? PLAYER.invulnTicks,
    xpMul: m.xp ?? 1,
  };
}
