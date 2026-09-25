import { describe, expect, test } from 'vitest';
import { applyCard, evolutionReady, rollCapsule } from '../../games/stay-rare/sim/capsule';
import { computeStats } from '../../games/stay-rare/sim/stats';
import { weaponCooldownTicks, weaponDamage } from '../../games/stay-rare/sim/weapons';
import { buildSummary } from '../../games/stay-rare/ui/format';
import { FAMILY, freshRun } from '../helpers/state';

function ready(milestone: 1 | 2) {
  const s = freshRun(FAMILY.skeleton, milestone);
  s.weapons[0].level = 8; s.passives.push({ id: 'sharpEdge', level: 1 });
  return s;
}

describe('evolutions', () => {
  test('need milestone 2, level 8 and the paired passive', () => {
    expect(evolutionReady(ready(1))).toBeNull();
    expect(evolutionReady(ready(2))).toBe('boneBolt');
    const noPair = freshRun(FAMILY.skeleton, 2); noPair.weapons[0].level = 8;
    expect(evolutionReady(noPair)).toBeNull();
  });
  test('the next capsule leads with a guaranteed legendary evolution card', () => {
    const [first] = rollCapsule(ready(2));
    expect(first).toEqual({ kind: 'evolution', id: 'boneBolt', rarity: 'legendary', levels: 0, isNew: false });
  });
  test('evolving doubles damage, speeds up 25%, and shows the evolved name', () => {
    const s = ready(2), st = computeStats(s), before = { dmg: weaponDamage(s.weapons[0], st), cd: weaponCooldownTicks(s.weapons[0], st) };
    applyCard(s, rollCapsule(s)[0]);
    expect(s.weapons[0].evolved).toBe(true);
    expect(weaponDamage(s.weapons[0], st)).toBeCloseTo(before.dmg * 2);
    expect(weaponCooldownTicks(s.weapons[0], st)).toBe(Math.max(6, Math.round(before.cd * 0.75)));
    expect(buildSummary(s)[0]).toBe('Bone Storm Lv 8');
    expect(evolutionReady(s)).toBeNull();
  });
});
