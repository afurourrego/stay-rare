import type { Score } from '../sim/types';
import { ChestPanel, type ChestPanelProps } from './Chest';
import { ConsoleBtn, Crt, TypedLine } from './Crt';
import { formatScore } from './format';
import { iconForLabel } from './icons';
import { PixelIcon } from './PixelGrid';

type Props = { score: Score | null; build: string[]; rankText: string; busy: boolean; reducedMotion: boolean; onOpenChest(): void; chest: ChestPanelProps | null };
/** Run over: the run log types in on the CRT; "> Open chest" opens the chest right there, in the same terminal. */
export function Results({ score, build, rankText, busy, reducedMotion, onOpenChest, chest }: Props) {
  // Only the log lines type in (≤ ~0.6 s); the rank and "> Open chest" appear at once, never delayed.
  const step = reducedMotion || chest ? 0 : Math.min(120, 600 / (build.length + 2));
  return <div className="sr-results">
    <Crt title="Run over" titleId="sr-results-title" reducedMotion={reducedMotion} modal={false}>
      <TypedLine delay={0} className="sr-crt-line">{score ? '> RUN LOG · SIGNAL LOST' : '> RECOVERED CHEST'}</TypedLine>
      {score && <TypedLine delay={step} className="sr-log-score">{formatScore(score)}</TypedLine>}
      {build.length > 0 && <ul className="sr-log-build">
        {build.map((b, i) => <li key={b} className="sr-crt-log" style={{ animationDelay: `${step * (2 + i)}ms` }}>
          {iconForLabel(b) && <PixelIcon rows={iconForLabel(b)!} className="sr-log-icon" />}<span>{b}</span>
        </li>)}
      </ul>}
      {score && <p className="sr-crt-rank">{rankText}</p>}
      {chest ? <ChestPanel {...chest} /> : <div className="sr-console">
        <ConsoleBtn autoFocus disabled={busy} onClick={onOpenChest}>Open chest</ConsoleBtn>
      </div>}
    </Crt>
  </div>;
}
