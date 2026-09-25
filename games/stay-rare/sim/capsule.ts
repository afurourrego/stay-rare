import { CAPSULE, PASSIVES, PASSIVE_MAX_LEVEL, PLAYER, WEAPONS, WEAPON_MAX_LEVEL } from './content';
import { nextInt } from './rng';
import { computeStats } from './stats';
import { PASSIVE_IDS, WEAPON_IDS, type Card, type PassiveId, type Rarity, type Rng, type RunState, type WeaponId } from './types';

export const RARITY_LEVELS: Readonly<Record<Rarity, number>> = { common: 1, rare: 2, legendary: 3 };

export function rollRarity(rng: Rng): Rarity {
  const r = nextInt(rng, 100);
  return r < CAPSULE.commonPct ? 'common' : r < CAPSULE.commonPct + CAPSULE.rarePct ? 'rare' : 'legendary';
}

type Item = { kind: 'weapon' | 'passive'; id: WeaponId | PassiveId; isNew: boolean };
/** Stable order (owned first, then catalog order) so rolls are deterministic. */
export function eligibleItems(state: RunState): Item[] {
  const items: Item[] = [];
  for (const w of state.weapons) if (w.level < WEAPON_MAX_LEVEL) items.push({ kind: 'weapon', id: w.id, isNew: false });
  for (const p of state.passives) if (p.level < PASSIVE_MAX_LEVEL) items.push({ kind: 'passive', id: p.id, isNew: false });
  if (state.weapons.length < PLAYER.maxWeapons) for (const id of WEAPON_IDS) {
    if (WEAPONS[id].milestone <= state.milestone && !state.weapons.some(w => w.id === id)) items.push({ kind: 'weapon', id, isNew: true });
  }
  if (state.passives.length < PLAYER.maxPassives) for (const id of PASSIVE_IDS) {
    if (!state.passives.some(p => p.id === id)) items.push({ kind: 'passive', id, isNew: true });
  }
  return items;
}

/** Milestone 2: a max-level weapon whose paired passive you own. */
export function evolutionReady(state: RunState): WeaponId | null {
  if (state.milestone < 2) return null;
  const slot = state.weapons.find(w => !w.evolved && w.level >= WEAPON_MAX_LEVEL && state.passives.some(p => p.id === WEAPONS[w.id].pair));
  return slot?.id ?? null;
}

export function rollCapsule(state: RunState): Card[] {
  const cards: Card[] = [];
  const evo = evolutionReady(state);
  if (evo) cards.push({ kind: 'evolution', id: evo, rarity: 'legendary', levels: 0, isNew: false });
  const pool = eligibleItems(state);
  while (cards.length < 3 && pool.length) {
    const item = pool.splice(nextInt(state.rng, pool.length), 1)[0], rarity = rollRarity(state.rng);
    cards.push({ kind: item.kind, id: item.id, rarity, levels: RARITY_LEVELS[rarity], isNew: item.isNew });
  }
  if (cards.length < 3) cards.push({ kind: 'heal', id: null, rarity: 'common', levels: 0, isNew: false });
  return cards;
}

export function applyCard(state: RunState, card: Card): void {
  if (card.kind === 'heal') {
    state.player.hp = Math.min(computeStats(state).maxHp, state.player.hp + CAPSULE.healAmount);
    return;
  }
  if (card.kind === 'evolution') {
    const slot = state.weapons.find(w => w.id === card.id);
    if (slot) slot.evolved = true;
    return;
  }
  if (card.kind === 'weapon') {
    const slot = state.weapons.find(w => w.id === card.id);
    if (slot) slot.level = Math.min(WEAPON_MAX_LEVEL, slot.level + card.levels);
    else if (state.weapons.length < PLAYER.maxWeapons) state.weapons.push({ id: card.id as WeaponId, level: Math.min(WEAPON_MAX_LEVEL, card.levels), cd: 0, evolved: false, volley: 0 });
    return;
  }
  const slot = state.passives.find(p => p.id === card.id), before = slot?.level ?? 0;
  if (slot) slot.level = Math.min(PASSIVE_MAX_LEVEL, slot.level + card.levels);
  else if (state.passives.length < PLAYER.maxPassives) state.passives.push({ id: card.id as PassiveId, level: Math.min(PASSIVE_MAX_LEVEL, card.levels) });
  const after = state.passives.find(p => p.id === card.id)?.level ?? 0;
  if (card.id === 'thickOutline') state.player.hp += PASSIVES.thickOutline.perLevel * (after - before);
  state.player.hp = Math.min(computeStats(state).maxHp, state.player.hp);
}
