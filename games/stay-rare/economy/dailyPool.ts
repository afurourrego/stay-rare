import { compareScore } from '../sim/score';
import { createRng, hashString, nextFloat, nextInt } from '../sim/rng';
import { TICK_HZ, type Score } from '../sim/types';
import { splitEntry } from './split';

export const PAYOUT_BPS = [3000, 2000, 1300, 900, 700, 600, 500, 400, 300, 300] as const;
export type PoolEntry = Readonly<{ name: string; best: Score; entries: number; you: boolean }>;
export type Payout = Readonly<{ rank: number; entry: PoolEntry; amount: bigint }>;

export function utcDayKey(nowMs: number): string { return new Date(nowMs).toISOString().slice(0, 10); }
export function msUntilCutoff(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - nowMs;
}

/** Simulated rivals, identical for everyone on the same UTC day. Always shown as "example rivals". */
export function exampleRivals(dayKey: string, count = 40): PoolEntry[] {
  const rng = createRng(hashString(dayKey));
  return Array.from({ length: count }, () => {
    const bosses = Math.floor(nextFloat(rng) ** 2 * 15), seconds = bosses * 90 + 10 + nextInt(rng, 79);
    return { name: `Friend #${1 + nextInt(rng, 9999)}`, best: { bosses, ticks: seconds * TICK_HZ }, entries: 1 + nextInt(rng, 5), you: false };
  });
}

export function rankEntries(entries: readonly PoolEntry[]): PoolEntry[] { return [...entries].sort((a, b) => compareScore(b.best, a.best)); }
export function poolTotal(entries: readonly PoolEntry[], price: bigint): bigint {
  return entries.reduce((n, e) => n + BigInt(e.entries), 0n) * splitEntry(price).pool;
}
export function payouts(total: bigint, ranked: readonly PoolEntry[]): { paid: Payout[]; carryOver: bigint } {
  const paid = ranked.slice(0, PAYOUT_BPS.length).map((entry, i) => ({ rank: i + 1, entry, amount: total * BigInt(PAYOUT_BPS[i]) / 10_000n }));
  return { paid, carryOver: total - paid.reduce((sum, p) => sum + p.amount, 0n) };
}

export type DailyPoolView = Readonly<{
  dayKey: string; msToCutoff: number; ranked: PoolEntry[]; total: bigint; paid: Payout[]; carryOver: bigint;
  yourRank: number | null; yourPayout: bigint; split: ReturnType<typeof splitEntry>;
}>;
export function buildDailyPool(nowMs: number, you: PoolEntry | null, price: bigint): DailyPoolView {
  const dayKey = utcDayKey(nowMs), entries = [...exampleRivals(dayKey), ...(you ? [you] : [])];
  const ranked = rankEntries(entries), total = poolTotal(entries, price), { paid, carryOver } = payouts(total, ranked);
  const index = ranked.findIndex(e => e.you), yourRank = index < 0 ? null : index + 1;
  return { dayKey, msToCutoff: msUntilCutoff(nowMs), ranked, total, paid, carryOver, yourRank,
    yourPayout: paid.find(p => p.entry.you)?.amount ?? 0n, split: splitEntry(price) };
}
