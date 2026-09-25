import { describe, expect, test } from 'vitest';
import { spawnEnemy } from '../../games/stay-rare/sim/spawn';
import { computeStats } from '../../games/stay-rare/sim/stats';
import type { RunState, WeaponId, WeaponSlot } from '../../games/stay-rare/sim/types';
import { FIRE, extras, fireWeapons, orbiters, updateProjectiles, weaponCooldownTicks, weaponDamage } from '../../games/stay-rare/sim/weapons';
import { FAMILY, freshRun } from '../helpers/state';

const slot = (id: WeaponId, level = 1, evolved = false): WeaponSlot => ({ id, level, cd: 0, evolved, volley: 0 });
const arm = (s: RunState, id: WeaponId, level = 1, evolved = false) => { s.weapons = [slot(id, level, evolved)]; return s.weapons[0]; };
const fly = (s: RunState, n: number) => { const st = computeStats(s); for (let i = 0; i < n; i++) updateProjectiles(s, st); };

describe('weapon scaling', () => {
  test('extras at levels 3, 5, 7 and when evolved', () => {
    expect([1, 3, 5, 7].map(l => extras(slot('boneBolt', l)))).toEqual([0, 1, 2, 3]);
    expect(extras(slot('boneBolt', 8, true))).toBe(4);
  });
  test('damage grows 15% per level and uses family damage', () => {
    const st = computeStats(freshRun(FAMILY.skeleton));
    expect(weaponDamage(slot('boneBolt'), st)).toBeCloseTo(15.4);
    expect(weaponDamage(slot('boneBolt', 3), st)).toBeCloseTo(14 * 1.15 ** 2 * 1.1);
    expect(weaponDamage(slot('boneBolt', 8, true), st)).toBeCloseTo(14 * 1.15 ** 7 * 1.1 * 2);
  });
  test('cooldown in ticks uses family cooldown, with a 6-tick floor', () => {
    expect(weaponCooldownTicks(slot('boneBolt'), computeStats(freshRun(FAMILY.skeleton)))).toBe(48);
    expect(weaponCooldownTicks(slot('maskWave'), computeStats(freshRun(FAMILY.mask)))).toBe(78);
  });
});

describe('firing', () => {
  test('Bone Bolt aims at the nearest glitch; with no target it retries in 6 ticks', () => {
    const s = freshRun(); const w = arm(s, 'boneBolt');
    fireWeapons(s, computeStats(s));
    expect(s.projectiles).toHaveLength(0); expect(w.cd).toBe(6);
    const e = spawnEnemy(s, 'mote', s.player.x + 200, s.player.y); w.cd = 0;
    fireWeapons(s, computeStats(s));
    expect(s.projectiles).toHaveLength(1);
    expect(s.projectiles[0].vx).toBeGreaterThan(0); expect(Math.abs(s.projectiles[0].vy)).toBeLessThan(1e-9);
    fly(s, 40);
    expect(e.hp).toBeLessThan(10);
  });
  test('Bone Bolt level 3 fires at the two nearest glitches', () => {
    const s = freshRun(); arm(s, 'boneBolt', 3);
    spawnEnemy(s, 'mote', s.player.x + 200, s.player.y); spawnEnemy(s, 'mote', s.player.x - 200, s.player.y); spawnEnemy(s, 'mote', s.player.x + 650, s.player.y);
    fireWeapons(s, computeStats(s));
    expect(s.projectiles.map(p => Math.sign(p.vx)).sort()).toEqual([-1, 1]);
  });
  test('an evolved Bone Bolt pierces two extra glitches', () => {
    const s = freshRun(); arm(s, 'boneBolt', 8, true); s.player.hp = 1e9;
    const line = [120, 170, 220].map(dx => spawnEnemy(s, 'block', s.player.x + dx, s.player.y));
    s.projectiles = []; FIRE.boneBolt(s, s.weapons[0], computeStats(s));
    s.projectiles.splice(1);
    fly(s, 60);
    expect(line.every(e => e.hp < e.maxHp)).toBe(true);
  });
  test('Mask Wave hits in front, not behind', () => {
    const s = freshRun(FAMILY.mask); arm(s, 'maskWave');
    const front = spawnEnemy(s, 'block', s.player.x + 100, s.player.y), back = spawnEnemy(s, 'block', s.player.x - 100, s.player.y);
    fireWeapons(s, computeStats(s));
    expect(front.hp).toBeLessThan(60); expect(back.hp).toBe(60);
    expect(s.effects[0].kind).toBe('wave');
  });
  test('Kin Orbit has 2 orbiters at 70 px that damage what they touch', () => {
    const s = freshRun(FAMILY.family); const w = arm(s, 'kinOrbit'); const st = computeStats(s);
    const [o] = orbiters(s, w, st);
    expect(Math.hypot(o.x - s.player.x, o.y - s.player.y)).toBeCloseTo(70);
    expect(orbiters(s, w, st)).toHaveLength(2);
    const e = spawnEnemy(s, 'block', o.x, o.y);
    FIRE.kinOrbit(s, w, st);
    expect(e.hp).toBeLessThan(60);
  });
  test('Split Cell splits into 2 half-damage children on impact', () => {
    const s = freshRun(FAMILY.cellular); arm(s, 'splitCell');
    spawnEnemy(s, 'block', s.player.x + 100, s.player.y);
    fireWeapons(s, computeStats(s)); fly(s, 20);
    const children = s.projectiles.filter(p => p.ttl > 0 && p.split === 0);
    expect(children).toHaveLength(2);
    expect(children[0].damage).toBeCloseTo(5.5);
  });
  test('Offset Shot fires 2 shots 50° apart around the facing', () => {
    const s = freshRun(FAMILY.asymmetry); arm(s, 'offsetShot');
    fireWeapons(s, computeStats(s));
    const [a, b] = s.projectiles.map(p => Math.atan2(p.vy, p.vx) * 180 / Math.PI);
    expect(b - a).toBeCloseTo(50);
  });
  test('Signal Pulse damages glitches within 60 px + their radius only', () => {
    const s = freshRun(FAMILY.hoverer); arm(s, 'signalPulse');
    const near = spawnEnemy(s, 'mote', s.player.x + 70, s.player.y), far = spawnEnemy(s, 'mote', s.player.x + 90, s.player.y);
    fireWeapons(s, { ...computeStats(s), crit: 0 });
    expect(near.hp).toBe(6); expect(far.hp).toBe(10);
  });
});

describe('projectiles', () => {
  test('hostile bullets hurt the player and vanish', () => {
    const s = freshRun();
    s.projectiles.push({ id: 99, hostile: true, x: s.player.x + 10, y: s.player.y, vx: 0, vy: 0, damage: 6, radius: 5, ttl: 10, pierce: 0, split: 0, bounces: 0, hits: [] });
    fly(s, 1);
    expect(s.player.hp).toBe(94); expect(s.projectiles[0].ttl).toBe(0);
  });
  test('projectiles leaving the world expire', () => {
    const s = freshRun();
    s.projectiles.push({ id: 99, hostile: false, x: 1, y: 1, vx: -5, vy: 0, damage: 1, radius: 5, ttl: 99, pierce: 0, split: 0, bounces: 0, hits: [] });
    fly(s, 1);
    expect(s.projectiles[0].ttl).toBe(0);
  });
});
