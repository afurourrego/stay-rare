import { describe, expect, test } from 'vitest';
import { ICONS, iconFor } from '../../games/stay-rare/ui/icons';
import { PASSIVE_IDS, WEAPON_IDS } from '../../games/stay-rare/sim/types';

const valid = (grid: readonly string[], size: number, chars: RegExp) => grid.length === size && grid.every(r => r.length === size && chars.test(r));

describe('pixel icons', () => {
  test('every weapon, passive, heal and evolution card has a 16×16 icon drawn in paper/signal for dark tiles', () => {
    for (const id of [...WEAPON_IDS, ...PASSIVE_IDS, 'heal', 'evolution']) {
      expect(ICONS[id], id).toBeDefined();
      expect(valid(ICONS[id], 16, /^[.#ypg]+$/), id).toBe(true);
      expect(/[py]/.test(ICONS[id].join('')), id).toBe(true);
    }
  });
  test('icons are all different', () => {
    expect(new Set(Object.values(ICONS).map(g => g.join(''))).size).toBe(Object.keys(ICONS).length);
  });
  test('cards map to their icon', () => {
    expect(iconFor({ kind: 'weapon', id: 'boneBolt', rarity: 'common', levels: 1, isNew: true })).toBe(ICONS.boneBolt);
    expect(iconFor({ kind: 'heal', id: null, rarity: 'common', levels: 0, isNew: false })).toBe(ICONS.heal);
    expect(iconFor({ kind: 'evolution', id: 'boneBolt', rarity: 'legendary', levels: 0, isNew: false })).toBe(ICONS.evolution);
  });
});
