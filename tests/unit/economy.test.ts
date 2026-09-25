import { beforeEach, describe, expect, test } from 'vitest';
import { RF, createGamePreview, parseChanceGame } from '@rarefriends/friendsdk/game';
import gameJson from '../../games/stay-rare/game.json';
import { PAYOUT_BPS, buildDailyPool, exampleRivals, msUntilCutoff, payouts, poolTotal, rankEntries, utcDayKey, type PoolEntry } from '../../games/stay-rare/economy/dailyPool';
import { openChest, pendingPlay, redeemFreeRun, startCheck, startRun, unclaimedFreeRuns } from '../../games/stay-rare/economy/run';
import { recordEntry, recordScore, resetSession, sessionRecord } from '../../games/stay-rare/economy/session';
import { splitEntry } from '../../games/stay-rare/economy/split';

const definition = parseChanceGame(gameJson);
const POOL_ROLL = () => 0, FREE_ROLL = () => 9999;
const preview = (draw = POOL_ROLL, rfBalance = 20n * RF) => createGamePreview(definition, { stake: 10n * RF, rfBalance, friendId: 7730n, draw }).client;
const entry = (name: string, bosses: number, seconds: number, entries = 1, you = false): PoolEntry => ({ name, best: { bosses, ticks: seconds * 60 }, entries, you });

describe('entry flow over the SDK preview client', () => {
  test('Start buys and plays one Run for 1 RF', async () => {
    const c = preview();
    expect(await startRun(c)).toBe(1n);
    const s = await c.read();
    expect([s.rfBalance, s.consumables]).toEqual([19n * RF, 0n]);
    expect(pendingPlay(s)?.id).toBe(1n);
  });
  test('opening the chest settles: roll < 9900 is a pool entry', async () => {
    const c = preview(POOL_ROLL), id = await startRun(c);
    expect(await openChest(c, id)).toEqual({ kind: 'poolEntry', playId: id });
    expect(pendingPlay(await c.read())).toBeUndefined();
  });
  test('roll ≥ 9900 is a free run; redeeming returns 1 RF to the same balance', async () => {
    const c = preview(FREE_ROLL), id = await startRun(c);
    expect((await openChest(c, id)).kind).toBe('freeRun');
    expect(unclaimedFreeRuns(await c.read())).toBe(1n);
    await redeemFreeRun(c);
    const s = await c.read();
    expect([s.rfBalance, unclaimedFreeRuns(s)]).toEqual([20n * RF, 0n]);
  });
  test('a Run bought but not played (cancelled confirmation) is reused, not charged again', async () => {
    const c = preview();
    await c.buy(1n);
    await startRun(c);
    const s = await c.read();
    expect([s.rfBalance, s.consumables]).toEqual([19n * RF, 0n]);
  });
  test('a pending chest blocks a new run', async () => {
    const c = preview();
    await startRun(c);
    const check = startCheck(await c.read(), definition);
    expect(check).toEqual({ ok: false, reason: 'Open your unopened chest first.' });
    await expect(startRun(c)).rejects.toThrow('Open your unopened chest first.');
  });
  test('running out of simulated RF gives a clear reason', async () => {
    const check = startCheck(await preview(POOL_ROLL, 0n).read(), definition);
    expect(check.ok).toBe(false);
    expect(check.ok ? '' : check.reason).toMatch(/Not enough simulated RF\. Reload the page to reset the preview\./);
  });
  test('20 RF covers exactly 20 runs', async () => {
    const c = preview();
    for (let i = 0; i < 20; i++) await openChest(c, await startRun(c));
    expect(startCheck(await c.read(), definition).ok).toBe(false);
  });
});

describe('split', () => {
  test('1 RF → 0.89 pool, 0.01 luck, 0.05 house, 0.05 burn, exactly', () => {
    expect(splitEntry(RF)).toEqual({ pool: 89n * RF / 100n, luck: RF / 100n, house: 5n * RF / 100n, burn: 5n * RF / 100n });
  });
  test('parts always sum to the price', () => {
    for (const price of [1n, 7n, 12_345n, RF + 3n]) {
      const s = splitEntry(price);
      expect(s.pool + s.luck + s.house + s.burn).toBe(price);
    }
  });
});

describe('daily pool', () => {
  test('UTC day key and time to the 00:00 UTC cutoff', () => {
    expect(utcDayKey(Date.UTC(2026, 8, 24, 23, 59))).toBe('2026-09-24');
    expect(msUntilCutoff(Date.UTC(2026, 8, 24, 23, 0))).toBe(3_600_000);
  });
  test('example rivals are the same all day and change the next day', () => {
    const a = exampleRivals('2026-09-24');
    expect(a).toHaveLength(40);
    expect(exampleRivals('2026-09-24')).toEqual(a);
    expect(exampleRivals('2026-09-25')).not.toEqual(a);
    for (const r of a) {
      expect(r.entries >= 1 && r.entries <= 5).toBe(true);
      expect(r.best.ticks).toBeGreaterThanOrEqual(r.best.bosses * 90 * 60);
      expect(r.best.ticks).toBeLessThan((r.best.bosses + 1) * 90 * 60);
    }
  });
  test('payout shares total 100% and rank by bosses, then time', () => {
    expect(PAYOUT_BPS.reduce((a, b) => a + b, 0)).toBe(10_000);
    const ranked = rankEntries([entry('a', 1, 200), entry('b', 3, 100), entry('c', 1, 300)]);
    expect(ranked.map(r => r.name)).toEqual(['b', 'c', 'a']);
  });
  test('top 10 get 30/20/13/9/7/6/5/4/3/3 %; with fewer players the rest carries over', () => {
    const many = rankEntries(Array.from({ length: 12 }, (_, i) => entry(`p${i}`, 12 - i, 100)));
    const total = 100n * RF, full = payouts(total, many);
    expect(full.paid).toHaveLength(10);
    expect(full.paid[0].amount).toBe(30n * RF);
    expect(full.carryOver).toBe(0n);
    const few = payouts(total, many.slice(0, 3));
    expect(few.paid.map(p => p.amount)).toEqual([30n * RF, 20n * RF, 13n * RF]);
    expect(few.carryOver).toBe(37n * RF);
  });
  test('pool total = entries × 0.89 RF', () => {
    expect(poolTotal([entry('a', 0, 10, 3), entry('b', 0, 10, 2)], RF)).toBe(5n * 89n * RF / 100n);
  });
  test('buildDailyPool ranks you among the example rivals', () => {
    const now = Date.UTC(2026, 8, 24, 12);
    const top = buildDailyPool(now, entry('You', 99, 10, 1, true), RF);
    expect(top.yourRank).toBe(1);
    expect(top.yourPayout).toBe(top.paid[0].amount);
    expect(buildDailyPool(now, null, RF).yourRank).toBeNull();
    const low = buildDailyPool(now, entry('You', 0, 1, 1, true), RF);
    expect(low.yourRank).toBeGreaterThan(10);
    expect(low.yourPayout).toBe(0n);
  });
});

describe('session', () => {
  beforeEach(() => resetSession());
  test('keeps entries and the best score per Friend', () => {
    recordEntry(1n); recordEntry(1n); recordScore(1n, { bosses: 1, ticks: 100 }); recordScore(1n, { bosses: 0, ticks: 9999 });
    expect(sessionRecord(1n)).toEqual({ best: { bosses: 1, ticks: 100 }, entries: 2 });
    expect(sessionRecord(2n)).toEqual({ best: null, entries: 0 });
  });
});
