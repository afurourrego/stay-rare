import { useEffect, useReducer, useRef, useState } from 'react';
import type { GameSnapshot } from '@rarefriends/friendsdk/game';
import type { GameComponentProps } from '@rarefriends/friendsdk/runtime';
import { createFriendSoundKit, type FriendSoundKit } from '@rarefriends/friendsdk/sounds';
import { createFriendReader, type GenerationSprites } from '@rarefriends/friendsdk/sprites';
import './style.css';
import { createMusic, type Music } from './audio/music';
import { createSfx, type Sfx } from './audio/sfx';
import { flow } from './app/flow';
import { buildDailyPool } from './economy/dailyPool';
import { openChest, pendingPlay, redeemFreeRun, startCheck, startRun, unclaimedFreeRuns } from './economy/run';
import { recordEntry, recordScore, sessionRecord } from './economy/session';
import { CONTENT_MILESTONE, familyInfo } from './sim/content';
import type { FamilyId } from './sim/types';
import { Btn } from './ui/Btn';
import { rankLine, rf } from './ui/format';
import { Results } from './ui/Results';
import { RunView, type RunEnd } from './ui/RunView';
import { Title } from './ui/Title';

const messageOf = (cause: unknown, fallback: string) => cause instanceof Error && cause.message ? cause.message : fallback;

export default function StayRare({ friendId, client, paused }: GameComponentProps) {
  const [screen, dispatch] = useReducer(flow, { name: 'loading' });
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [sprites, setSprites] = useState<GenerationSprites | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const [muted, setMuted] = useState(false), [reducedMotion, setReducedMotion] = useState(false), [now, setNow] = useState(() => Date.now());
  const sound = useRef<FriendSoundKit | null>(null), sfx = useRef<Sfx | null>(null), music = useRef<Music | null>(null), epoch = useRef(0);

  useEffect(() => {
    const version = ++epoch.current;
    dispatch({ type: 'reset' }); setError(''); setBusy(false); setMuted(false);
    // Sound is on by default; browsers only let it play after the first click (Start run / Sound unlock it).
    sound.current = createFriendSoundKit({ muted: false });
    sfx.current = createSfx(); sfx.current.setMuted(false); music.current = createMusic();
    // Read first: the runtime reports an error if the game has not read within 10 s.
    Promise.all([client.read(), createFriendReader().read(friendId)]).then(([value, art]) => {
      if (version !== epoch.current) return;
      setSnapshot(value); setSprites(art); dispatch({ type: 'loaded' });
    }).catch(cause => { if (version === epoch.current) dispatch({ type: 'failed', message: messageOf(cause, 'Could not load your Friend.') }); });
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { epoch.current++; sound.current?.dispose(); sound.current = null; sfx.current?.dispose(); sfx.current = null; music.current?.dispose(); music.current = null; media.removeEventListener('change', update); window.clearInterval(clock); };
  }, [client, friendId, attempt]);

  async function act(work: () => Promise<void>) {
    const version = epoch.current;
    setBusy(true); setError('');
    try { await work(); }
    catch (cause) { if (version === epoch.current) setError(messageOf(cause, 'The preview action failed.')); }
    finally {
      if (version === epoch.current) {
        setBusy(false);
        try { const value = await client.read(); if (version === epoch.current) setSnapshot(value); } catch { /* keep the last snapshot */ }
      }
    }
  }
  const toggleMute = () => {
    const next = !muted; setMuted(next); sound.current?.setMuted(next); sfx.current?.setMuted(next); music.current?.setMuted(next);
    if (!next) { void sound.current?.unlock(); void sfx.current?.unlock(); void music.current?.unlock(); }
  };
  const start = () => {
    if (busy || paused) return;
    void sound.current?.unlock(); void sfx.current?.unlock(); void music.current?.unlock();
    dispatch({ type: 'start' });
    void act(async () => {
      try { const playId = await startRun(client); recordEntry(friendId); sound.current?.play('action-start'); dispatch({ type: 'started', playId }); }
      catch (cause) { dispatch({ type: 'startFailed' }); throw cause; }
    });
  };
  const openChestFor = (playId: bigint) => act(async () => {
    void sound.current?.unlock(); void sfx.current?.unlock();
    sound.current?.play('anticipation');
    const result = await openChest(client, playId); // the chest plays its own reveal cues as it opens
    dispatch({ type: 'opened', result });
  });
  const redeem = () => act(async () => { await redeemFreeRun(client); sound.current?.play('reward'); });
  const onRunEnd = (end: RunEnd) => { recordScore(friendId, end.score); dispatch({ type: 'ended', score: end.score, build: end.build }); };

  if (screen.name === 'loading') return <div className="sr-root"><p className="sr-status" role="status">Loading your Friend…</p></div>;
  if (screen.name === 'error') return <div className="sr-root"><p className="sr-status" role="alert">{screen.message}</p><Btn onClick={() => setAttempt(a => a + 1)}>Retry</Btn></div>;
  if (!snapshot || !sprites) return null;
  if (snapshot.friendId !== friendId) return <div className="sr-root"><p role="alert">This game session does not match the selected Friend.</p></div>;

  const record = sessionRecord(friendId);
  const pool = buildDailyPool(now, record.best ? { name: `You · Friend #${friendId}`, best: record.best, entries: record.entries, you: true } : null, client.definition.price);
  const again = startCheck(snapshot, client.definition);
  const playAgain = { ok: again.ok, label: `Play again · ${rf(client.definition.price)}`, reason: again.ok ? '' : again.reason };
  return <div className={`sr-root${screen.name === 'run' ? ' sr-running' : ''}`}>
    {screen.name === 'run'
      ? <RunView key={String(screen.playId)} sprites={sprites} paused={paused} muted={muted} reducedMotion={reducedMotion} sound={sound.current} sfx={sfx.current} music={music.current}
          onToggleMute={toggleMute} onToggleReducedMotion={() => setReducedMotion(r => !r)} onEnd={onRunEnd} />
      : screen.name === 'results' || screen.name === 'chest'
        ? <Results score={screen.score} build={screen.build} rankText={`${rankLine(pool)} (simulated pool, example rivals)`} busy={busy} reducedMotion={reducedMotion}
            onOpenChest={() => { if (screen.name === 'results') { dispatch({ type: 'toChest' }); void openChestFor(screen.playId); } }}
            chest={screen.name === 'chest' ? {
              result: screen.result, busy, error, unclaimed: unclaimedFreeRuns(snapshot), reducedMotion, poolShare: rf(pool.split.pool), playAgain, sound: sound.current, sfx: sfx.current,
              onPlayAgain: () => { dispatch({ type: 'done' }); start(); }, onRetry: () => void openChestFor(screen.playId),
              onRedeem: () => void redeem(), onDone: () => dispatch({ type: 'done' }),
            } : null} />
          : <Title sprites={sprites} info={familyInfo(sprites.familyId as FamilyId, CONTENT_MILESTONE)} snapshot={snapshot} definition={client.definition}
              best={record.best} pool={pool} busy={busy || screen.name === 'starting'} paused={paused} error={error} reducedMotion={reducedMotion}
              onStart={start} onRedeem={() => void redeem()}
              onOpenChest={() => { const p = pendingPlay(snapshot); if (p) { dispatch({ type: 'resumeChest', playId: p.id }); void openChestFor(p.id); } }} />}
  </div>;
}
