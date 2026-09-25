import { ConsoleBtn, Crt } from './Crt';

type Props = { muted: boolean; reducedMotion: boolean; onResume(): void; onEndRun(): void; onToggleMute(): void; onToggleReducedMotion(): void };
/** Pause as a system console on the full-size CRT. */
export function PauseMenu(p: Props) {
  return <div className="sr-overlay sr-crt-overlay" data-ui>
    <Crt title="Paused" titleId="sr-pause-title" reducedMotion={p.reducedMotion}>
      <p className="sr-crt-line">&gt; SYSTEM PAUSED · SIGNAL HOLDING</p>
      <div className="sr-console">
        <ConsoleBtn autoFocus onClick={p.onResume}>Resume</ConsoleBtn>
        <ConsoleBtn aria-pressed={!p.muted} onClick={p.onToggleMute}>{p.muted ? 'Sound: off' : 'Sound: on'}</ConsoleBtn>
        <ConsoleBtn aria-pressed={p.reducedMotion} onClick={p.onToggleReducedMotion}>{p.reducedMotion ? 'Reduce motion: on' : 'Reduce motion: off'}</ConsoleBtn>
        <ConsoleBtn className="sr-console-danger" onClick={p.onEndRun}>End run</ConsoleBtn>
      </div>
      <p className="sr-crt-note">Ending the run counts as a death: your score is kept and your chest opens.</p>
    </Crt>
  </div>;
}
