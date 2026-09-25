import { compareScore } from '../sim/score';
import type { Score } from '../sim/types';

/** In memory only: the sandbox has no storage, so this resets when the page reloads. */
export type SessionRecord = Readonly<{ best: Score | null; entries: number }>;
const records = new Map<string, SessionRecord>();

export function sessionRecord(friendId: bigint): SessionRecord { return records.get(String(friendId)) ?? { best: null, entries: 0 }; }
export function recordEntry(friendId: bigint): void {
  const r = sessionRecord(friendId);
  records.set(String(friendId), { ...r, entries: r.entries + 1 });
}
export function recordScore(friendId: bigint, score: Score): void {
  const r = sessionRecord(friendId);
  if (!r.best || compareScore(score, r.best) > 0) records.set(String(friendId), { ...r, best: score });
}
export function resetSession(): void { records.clear(); }
