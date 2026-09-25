import type { DailyPoolView, Payout } from '../economy/dailyPool';
import { formatCountdown, formatScore, rankLine, rf } from './format';

const row = (p: Payout) => <li key={p.rank} className={p.entry.you ? 'sr-you' : undefined}>
  <span>#{p.rank}</span><span>{p.entry.name}</span><span>{formatScore(p.entry.best)}</span><span>{rf(p.amount)}</span>
</li>;

export function DailyPoolPanel({ view }: { view: DailyPoolView }) {
  const s = view.split;
  return <section className="sr-card sr-pool" aria-labelledby="sr-pool-title">
    <h2 id="sr-pool-title">Daily Pool <span className="sr-tag">Simulated — example rivals</span></h2>
    <p>Pool today: <strong>{rf(view.total)}</strong> · cutoff in {formatCountdown(view.msToCutoff)} (00:00 UTC)</p>
    <ol className="sr-ranks">{view.paid.slice(0, 5).map(row)}</ol>
    {view.paid.length > 5 && <details className="sr-more"><summary>Show top 10</summary><ol className="sr-ranks" start={6}>{view.paid.slice(5).map(row)}</ol></details>}
    <p>{rankLine(view)}</p>
    <p className="sr-fine">Each run: {rf(s.pool)} pool · {rf(s.luck)} free-run chest · {rf(s.house)} house · {rf(s.burn)} burned.
      Your best run per Friend counts; the top 10 split the pool 30/20/13/9/7/6/5/4/3/3%. Design only: the pool, payouts and
      burn are not part of FriendSDK v0.1.2. Resets when you reload.</p>
  </section>;
}
