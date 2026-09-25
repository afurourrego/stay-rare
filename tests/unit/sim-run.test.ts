import { describe, expect, test } from 'vitest';
import { applyCard, eligibleItems, rollCapsule, rollRarity } from '../../games/stay-rare/sim/capsule';
import { PASSIVE_MAX_LEVEL, WEAPON_MAX_LEVEL } from '../../games/stay-rare/sim/content';
import { createRng } from '../../games/stay-rare/sim/rng';
import { chooseCard, createRun, endRun, step } from '../../games/stay-rare/sim/run';
import { spawnEnemy } from '../../games/stay-rare/sim/spawn';
import { computeStats } from '../../games/stay-rare/sim/stats';
import { PASSIVE_IDS, WEAPON_IDS, type Card } from '../../games/stay-rare/sim/types';
import { FAMILY, freshRun } from '../helpers/state';

const card = (c: Partial<Card> & Pick<Card, 'kind'>): Card => ({ id: null, rarity: 'common', levels: 1, isNew: false, ...c });

describe('capsule rolls', () => {
  test('rarity is about 70 / 25 / 5 %', () => {
    const r = createRng(123), count = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 10_000; i++) count[rollRarity(r)]++;
    expect(count.common).toBeGreaterThan(6800); expect(count.common).toBeLessThan(7200);
    expect(count.rare).toBeGreaterThan(2300); expect(count.rare).toBeLessThan(2700);
    expect(count.legendary).toBeGreaterThan(400); expect(count.legendary).toBeLessThan(600);
  });
  test('3 distinct items, never a milestone-2 weapon in milestone 1', () => {
    const s = freshRun();
    for (let i = 0; i < 500; i++) {
      const cards = rollCapsule(s);
      expect(cards).toHaveLength(3);
      expect(new Set(cards.map(c => c.id)).size).toBe(3);
      expect(cards.some(c => ['driftMines', 'quakeStamp', 'glitterBounce', 'voidBeam'].includes(c.id ?? ''))).toBe(false);
    }
  });
  test('nothing left to upgrade → a single heal card', () => {
    const s = freshRun(FAMILY.skeleton, 2);
    s.weapons = WEAPON_IDS.slice(0, 6).map(id => ({ id, level: WEAPON_MAX_LEVEL, cd: 0, evolved: true, volley: 0 }));
    s.passives = PASSIVE_IDS.map(id => ({ id, level: PASSIVE_MAX_LEVEL }));
    expect(eligibleItems(s)).toEqual([]);
    expect(rollCapsule(s)).toEqual([card({ kind: 'heal', levels: 0 })]);
  });
});

describe('applying cards', () => {
  test('a new legendary weapon enters at level 3; levels cap at 8', () => {
    const s = freshRun();
    applyCard(s, card({ kind: 'weapon', id: 'kinOrbit', rarity: 'legendary', levels: 3, isNew: true }));
    expect(s.weapons.find(w => w.id === 'kinOrbit')?.level).toBe(3);
    s.weapons[0].level = 7;
    applyCard(s, card({ kind: 'weapon', id: 'boneBolt', rarity: 'rare', levels: 2 }));
    expect(s.weapons[0].level).toBe(8);
  });
  test('Thick Outline raises max HP and heals what it adds', () => {
    const s = freshRun(); s.player.hp = 50;
    applyCard(s, card({ kind: 'passive', id: 'thickOutline', rarity: 'rare', levels: 2, isNew: true }));
    expect(computeStats(s).maxHp).toBe(140); expect(s.player.hp).toBe(90);
  });
  test('heal card adds 20 HP up to max', () => {
    const s = freshRun(); s.player.hp = 95;
    applyCard(s, card({ kind: 'heal', levels: 0 }));
    expect(s.player.hp).toBe(100);
  });
});

describe('step', () => {
  test('advances time and spawns glitches', () => {
    const s = freshRun();
    for (let i = 0; i < 120; i++) step(s, { dx: 0, dy: 0 });
    expect(s.tick).toBe(120); expect(s.enemies.length).toBeGreaterThan(0);
  });
  test('a level-up opens a capsule and freezes the run until a card is chosen', () => {
    const s = freshRun(); s.xp = 8.5;
    s.gems.push({ x: s.player.x, y: s.player.y, value: 1 });
    step(s, { dx: 0, dy: 0 });
    expect(s.capsule).toHaveLength(3);
    const t = s.tick; step(s, { dx: 1, dy: 0 });
    expect(s.tick).toBe(t);
    chooseCard(s, 0);
    expect(s.capsule).toBeNull();
    step(s, { dx: 0, dy: 0 });
    expect(s.tick).toBe(t + 1);
  });
  test('several pending levels chain capsules', () => {
    const s = freshRun(); s.xp = 9 + 15 - 0.5;
    s.gems.push({ x: s.player.x, y: s.player.y, value: 1 });
    step(s, { dx: 0, dy: 0 });
    expect(s.capsule).not.toBeNull(); chooseCard(s, 0);
    expect(s.capsule).not.toBeNull(); chooseCard(s, 0);
    expect(s.capsule).toBeNull();
  });
  test('death ends the run and freezes it', () => {
    const s = freshRun(); s.player.hp = 1;
    spawnEnemy(s, 'mote', s.player.x, s.player.y);
    step(s, { dx: 0, dy: 0 });
    expect(s.over).toBe(true); expect(s.player.hp).toBe(0);
    const t = s.tick; step(s, { dx: 0, dy: 0 }); expect(s.tick).toBe(t);
  });
  test('endRun ends immediately and closes any capsule', () => {
    const s = freshRun(); s.capsule = rollCapsule(s);
    endRun(s);
    expect([s.over, s.capsule]).toEqual([true, null]);
  });
});
