import { useState } from 'react';
import type { FriendSoundKit } from '@rarefriends/friendsdk/sounds';
import type { Sfx } from '../audio/sfx';
import type { ChestResult } from '../economy/run';
import type { ChestCue } from '../render/chestAnim';
import { ChestCanvas } from './ChestCanvas';
import { ConsoleBtn } from './Crt';

/** The free-run line says the RF is simulated itself: the fine print is hidden on small screens. */
export const FREE_RUN_LINE = 'Your 1 simulated RF comes back: your next run is free.';

export type ChestPanelProps = {
  result: ChestResult | null; busy: boolean; error: string; unclaimed: bigint; reducedMotion: boolean; poolShare: string;
  playAgain: { ok: boolean; label: string; reason: string };
  sound: FriendSoundKit | null; sfx: Sfx | null;
  onRetry(): void; onRedeem(): void; onDone(): void; onPlayAgain(): void;
};

/** The chest, opened inside the Run over terminal: it rattles, the lock pops, the lid opens and the prize rises; then console options. */
export function ChestPanel(p: ChestPanelProps) {
  const kind = p.result && p.result.kind !== 'sealing' ? p.result.kind : null;
  // Keyed to the result (not reset in an effect: the canvas reports a reduced-motion reveal in its own effect, which runs first).
  const key = kind && p.result ? `${p.result.playId}:${kind}` : '';
  const [revealedKey, setRevealedKey] = useState('');
  const revealed = key !== '' && revealedKey === key;
  const onCue = (cue: ChestCue) => { if (cue === 'tick' || cue === 'click') p.sfx?.play(cue); else p.sound?.play(cue); };
  const free = kind === 'freeRun' && revealed;
  return <section className={`sr-chest-window${free ? ' sr-chest-free' : ''}${p.reducedMotion ? ' sr-still' : ''}`} aria-labelledby="sr-chest-title">
    <h3 id="sr-chest-title" className="sr-crt-line">&gt; YOUR CHEST</h3>
    <div className="sr-chest-row">
      <div className="sr-chest-stage">
        <ChestCanvas kind={kind} reducedMotion={p.reducedMotion} onReveal={() => setRevealedKey(key)} onCue={onCue} />
      </div>
      <div className="sr-chest-text" aria-live="polite">
        {!p.result && (p.busy ? <p role="status">Opening…</p> : <><p>{p.error || 'The chest did not open.'}</p><ConsoleBtn onClick={p.onRetry}>Retry</ConsoleBtn></>)}
        {p.result?.kind === 'sealing' && <><p>Chest still sealing…</p><ConsoleBtn disabled={p.busy} onClick={p.onRetry}>Retry</ConsoleBtn></>}
        {kind && !revealed && <p role="status">Unlocking…</p>}
        {revealed && kind === 'poolEntry' && <div className="sr-ticket">
          <strong>Pool entry</strong><span>+{p.poolShare} to today’s pool (simulated)</span>
        </div>}
        {free && <div className="sr-free">
          <strong className="sr-stamp">Free run!</strong>
          <p>{FREE_RUN_LINE}</p>
          {p.unclaimed > 0n && <ConsoleBtn disabled={p.busy} onClick={p.onRedeem}>Redeem · 1 RF</ConsoleBtn>}
        </div>}
        <p className="sr-fine">1% chance, regardless of your score. Simulated RF.</p>
        {p.error && p.result && <p role="alert">{p.error}</p>}
      </div>
    </div>
    {kind && <div className="sr-console">
      <ConsoleBtn autoFocus disabled={p.busy || !p.playAgain.ok} onClick={p.onPlayAgain}>{p.playAgain.label}</ConsoleBtn>
      <ConsoleBtn disabled={p.busy} onClick={p.onDone}>Back to title</ConsoleBtn>
      {!p.playAgain.ok && <p className="sr-reason">{p.playAgain.reason}</p>}
    </div>}
  </section>;
}
