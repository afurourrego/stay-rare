import { describe, expect, test } from 'vitest';
import { RF } from '@rarefriends/friendsdk/game';
import { flow, type Screen } from '../../games/stay-rare/app/flow';
import { buildDailyPool } from '../../games/stay-rare/economy/dailyPool';
import { attachKeyboard, axisFromKeys } from '../../games/stay-rare/input/keyboard';
import { joystickVector } from '../../games/stay-rare/input/touch';
import { buildSummary, cardText, formatCountdown, formatScore, formatTime, rankLine, rf } from '../../games/stay-rare/ui/format';
import { hudData } from '../../games/stay-rare/ui/hudData';
import { freshRun } from '../helpers/state';

const score = { bosses: 1, ticks: 90 * 60 };

describe('flow', () => {
  test('happy path: loading → title → starting → run → results → chest → title', () => {
    let s: Screen = { name: 'loading' };
    s = flow(s, { type: 'loaded' }); expect(s.name).toBe('title');
    s = flow(s, { type: 'start' }); expect(s.name).toBe('starting');
    s = flow(s, { type: 'started', playId: 3n }); expect(s).toEqual({ name: 'run', playId: 3n });
    s = flow(s, { type: 'ended', score, build: ['Bone Bolt 2'] }); expect(s).toEqual({ name: 'results', playId: 3n, score, build: ['Bone Bolt 2'] });
    s = flow(s, { type: 'toChest' }); expect(s).toEqual({ name: 'chest', playId: 3n, result: null, score, build: ['Bone Bolt 2'] });
    s = flow(s, { type: 'opened', result: { kind: 'poolEntry', playId: 3n } }); expect(s.name).toBe('chest');
    s = flow(s, { type: 'done' }); expect(s.name).toBe('title');
  });
  test('Play again: done then start in one go reaches starting', () => {
    const chest: Screen = { name: 'chest', playId: 1n, result: { kind: 'poolEntry', playId: 1n }, score, build: [] };
    expect(flow(flow(chest, { type: 'done' }), { type: 'start' })).toEqual({ name: 'starting' });
  });
  test('a cancelled start returns to the title', () => {
    expect(flow({ name: 'starting' }, { type: 'startFailed' })).toEqual({ name: 'title' });
  });
  test('a pending chest can be resumed from the title', () => {
    expect(flow({ name: 'title' }, { type: 'resumeChest', playId: 9n })).toEqual({ name: 'chest', playId: 9n, result: null, score: null, build: [] });
  });
  test('done waits for a real result; sealing keeps the chest open', () => {
    const sealed = flow({ name: 'chest', playId: 1n, result: null, score: null, build: [] }, { type: 'opened', result: { kind: 'sealing', playId: 1n } });
    expect(flow(sealed, { type: 'done' })).toBe(sealed);
  });
  test('out-of-order actions are ignored; reset and failed work anywhere', () => {
    const title: Screen = { name: 'title' };
    expect(flow(title, { type: 'ended', score, build: [] })).toBe(title);
    expect(flow({ name: 'run', playId: 1n }, { type: 'reset' })).toEqual({ name: 'loading' });
    expect(flow(title, { type: 'failed', message: 'x' })).toEqual({ name: 'error', message: 'x' });
  });
});

describe('input', () => {
  test('keys map to axes; opposite keys cancel', () => {
    expect(axisFromKeys(new Set(['KeyD', 'ArrowUp']))).toEqual({ dx: 1, dy: -1 });
    expect(axisFromKeys(new Set(['KeyA', 'KeyD']))).toEqual({ dx: 0, dy: 0 });
  });
  test('attachKeyboard tracks movement keys, fires shortcuts and release() clears held keys', () => {
    const target = new EventTarget(), calls: string[] = [];
    const key = (type: string, code: string) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code, repeat: false }));
    const kb = attachKeyboard(target as unknown as Window, { onPause: () => calls.push('pause'), onMute: () => calls.push('mute'), onChoose: i => calls.push(`choose${i}`) });
    key('keydown', 'KeyW'); key('keydown', 'KeyP'); key('keydown', 'KeyM'); key('keydown', 'Digit2');
    expect([...kb.keys]).toEqual(['KeyW']);
    expect(calls).toEqual(['pause', 'mute', 'choose1']);
    kb.release();
    expect(kb.keys.size).toBe(0);
    kb.dispose(); key('keydown', 'KeyW');
    expect(kb.keys.size).toBe(0);
  });
  test('joystick vector is clamped to length 1', () => {
    expect(joystickVector(0, 0, 30, 0)).toEqual({ dx: 0.5, dy: 0 });
    const v = joystickVector(0, 0, 300, 400);
    expect(Math.hypot(v.dx, v.dy)).toBeCloseTo(1);
  });
});

describe('formatting', () => {
  test('time, score, RF, countdown', () => {
    expect([formatTime(0), formatTime(61 * 60)]).toEqual(['0:00', '1:01']);
    expect(formatScore(score)).toBe('1 boss · 1:30');
    expect(formatScore({ bosses: 12, ticks: 1123 * 60 })).toBe('12 bosses · 18:43');
    expect([rf(89n * RF / 100n), rf(123_456n * RF), rf(0n)]).toEqual(['0.89 RF', '123,456 RF', '0 RF']);
    expect(formatCountdown(3_723_000)).toBe('1h 02m');
  });
  test('card text says what changes', () => {
    const s = freshRun();
    expect(cardText({ kind: 'weapon', id: 'boneBolt', rarity: 'rare', levels: 2, isNew: false }, s)).toEqual({ title: 'Bone Bolt', detail: '+2 levels (Lv 1 → 3)' });
    expect(cardText({ kind: 'weapon', id: 'kinOrbit', rarity: 'common', levels: 1, isNew: true }, s)).toEqual({ title: 'Kin Orbit', detail: 'New · Lv 1 · Pixels orbit around you' });
    expect(cardText({ kind: 'heal', id: null, rarity: 'common', levels: 0, isNew: false }, s)).toEqual({ title: 'Patch', detail: '+20 HP' });
    expect(cardText({ kind: 'evolution', id: 'boneBolt', rarity: 'legendary', levels: 0, isNew: false }, s)).toEqual({ title: 'Bone Storm', detail: 'Evolves Bone Bolt: double damage, faster' });
  });
  test('build summary and HUD data', () => {
    const s = freshRun(); s.passives.push({ id: 'magnet', level: 2 }); s.weapons[0].evolved = true;
    expect(buildSummary(s)).toEqual(['Bone Storm Lv 1', 'Magnet Lv 2']);
    expect(hudData(s)).toEqual({ hp: 100, maxHp: 100, xpPct: 0, level: 1, bosses: 0, time: '0:00', phase: 'Wave 1' });
  });
  test('rank line', () => {
    const now = Date.UTC(2026, 8, 24, 12);
    expect(rankLine(buildDailyPool(now, null, RF))).toBe('Play a run to enter today’s pool.');
    expect(rankLine(buildDailyPool(now, { name: 'You', best: { bosses: 99, ticks: 1 }, entries: 1, you: true }, RF))).toMatch(/^You are #1: .+ RF if the day ended now\.$/);
  });
});
