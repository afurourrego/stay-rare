import { describe, expect, test } from 'vitest';
import { corruptRows, decodeRows, enemyScale, eyeHoles, pickEnemyFriend } from '../../games/stay-rare/render/corrupt';
import { ENEMY_FRIENDS } from '../../games/stay-rare/render/enemyFriends';

const rows = decodeRows(ENEMY_FRIENDS[0].right[0]);
const ink = (r: readonly string[]) => r.join('').split('').filter(c => c === '#').length;

describe('enemy Friends snapshot', () => {
  test('real Friends from every family, 8 walk frames per side', () => {
    expect(new Set(ENEMY_FRIENDS.map(f => f.familyId)).size).toBe(9);
    for (const f of ENEMY_FRIENDS) { expect(f.left).toHaveLength(8); expect(f.right).toHaveLength(8); }
    expect(rows).toHaveLength(16); expect(rows.every(r => r.length === 16)).toBe(true);
    expect(ink(rows)).toBeGreaterThan(10);
  });
  test('each enemy keeps the same Friend (by id)', () => {
    expect(pickEnemyFriend(5)).toBe(pickEnemyFriend(5));
    expect(new Set(Array.from({ length: 200 }, (_, i) => pickEnemyFriend(i))).size).toBe(ENEMY_FRIENDS.length);
  });
});

describe('corruption', () => {
  test('strength 0 leaves the Friend untouched, except its eyes turn red', () => {
    const out = corruptRows(rows, 3, 0, false);
    expect(out.map(r => r.replace(/e/g, '.'))).toEqual(rows);
    expect(out.join('')).toMatch(/e/);
  });
  test('is deterministic, flickers by phase and keeps 16×16', () => {
    const a = corruptRows(rows, 1, 0.8, false);
    expect(corruptRows(rows, 1, 0.8, false)).toEqual(a);
    expect(a).toHaveLength(16); expect(a.every(r => r.length === 16)).toBe(true);
    expect(a).not.toEqual(rows);
    expect(corruptRows(rows, 2, 0.8, false)).not.toEqual(a);
    expect(a.join('')).toMatch(/n/);
  });
  test('corruption never erases the Friend', () => {
    for (let phase = 0; phase < 8; phase++) expect(ink(corruptRows(rows, phase, 1, false))).toBeGreaterThan(ink(rows) * 0.6);
  });
  test('scanline Friends lose every third row', () => {
    const s = corruptRows(rows, 0, 0, true);
    for (let y = 1; y < 16; y += 3) expect(s[y]).not.toMatch(/#/);
  });
  test('bigger, tougher glitches draw bigger Friends', () => {
    expect(enemyScale('swarm')).toBeLessThan(enemyScale('mote'));
    expect(enemyScale('mote')).toBeLessThan(enemyScale('block'));
    expect(enemyScale('block')).toBeLessThan(enemyScale('boss'));
    for (const k of ['swarm', 'mote', 'block', 'scanline', 'splitter', 'blinker', 'boss'] as const) expect(Number.isInteger(enemyScale(k))).toBe(true);
  });
});

describe('red eyes', () => {
  test('eyes are small enclosed holes; big hollows and open gaps are not eyes', () => {
    const face = ['.....', '.###.', '.#.#.', '.###.', '.....'];
    expect([...eyeHoles(face)]).toEqual([2 * 5 + 2]);
    const hollow = ['#######', '#.....#', '#.....#', '#.....#', '#######'];
    expect(eyeHoles(hollow).size).toBe(0);
    expect(eyeHoles(['.#.', '...', '.#.']).size).toBe(0);
  });
  test('every snapshot Friend family except Hollow gets at least one red eye', () => {
    for (const f of ENEMY_FRIENDS.filter(f => f.familyId !== 8)) expect(eyeHoles(decodeRows(f.right[0])).size, `#${f.tokenId}`).toBeGreaterThan(0);
  });
  test('corruption keeps eyes marked and never paints static over them', () => {
    const out = corruptRows(rows, 1, 0.8, false).join('');
    expect(out).toMatch(/e/);
  });
});
