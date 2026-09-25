import type { ChanceGameDefinition, GameSnapshot } from '@rarefriends/friendsdk/game';
import type { GenerationSprites } from '@rarefriends/friendsdk/sprites';
import type { DailyPoolView } from '../economy/dailyPool';
import { pendingPlay, startCheck, unclaimedFreeRuns } from '../economy/run';
import type { familyInfo } from '../sim/content';
import type { Score } from '../sim/types';
import { friendTraits } from '../render/sprites';
import { describeTraits } from '../sim/traits';
import logoUrl from '../logo.png';
import { Btn } from './Btn';
import { DailyPoolPanel } from './DailyPoolPanel';
import { FriendPortrait } from './FriendPortrait';
import { formatScore, rf } from './format';

type Props = {
  sprites: GenerationSprites; info: ReturnType<typeof familyInfo>; snapshot: GameSnapshot; definition: ChanceGameDefinition;
  best: Score | null; pool: DailyPoolView; busy: boolean; paused: boolean; error: string; reducedMotion: boolean;
  onStart(): void; onOpenChest(): void; onRedeem(): void;
};
export function Title(p: Props) {
  const pending = pendingPlay(p.snapshot), check = startCheck(p.snapshot, p.definition), freeRuns = unclaimedFreeRuns(p.snapshot);
  const status = p.error || (pending ? 'You have an unopened chest.' : !check.ok ? check.reason : p.busy ? 'Waiting for preview confirmation…'
    : `${rf(p.snapshot.rfBalance)} simulated · 20 simulated RF per session, reload to reset.`);
  return <section className="sr-title">
    <header><h1><img className="sr-logo" src={logoUrl} alt="Stay Rare" width={64} height={13} /></h1><p className="sr-muted">Survive the static. Stay rare.</p></header>
    <div className="sr-title-grid">
      <div className="sr-left">
        <div className="sr-card sr-friend">
          <FriendPortrait sprites={p.sprites} reducedMotion={p.reducedMotion} />
          <h2>Friend #{String(p.sprites.tokenId)} · {p.info.name}</h2>
          <dl><dt>Starts with</dt><dd>{p.info.weaponName}: {p.info.weaponDescription}</dd><dt>Family trait</dt><dd>{p.info.passive}</dd>
            <dt>Its own traits</dt><dd><ul className="sr-traits" aria-label={`Traits of Friend #${String(p.sprites.tokenId)}`}>
              {describeTraits(friendTraits(p.sprites)).map(t => <li key={t}>{t}</li>)}</ul></dd></dl>
          <p>Best today: {p.best ? formatScore(p.best) : 'none yet'} <small>(this session)</small></p>
          <p className="sr-fine">WASD / arrows or drag to move · weapons fire on their own · P pause · M sound</p>
        </div>
        <div className="sr-actions">
          {pending
            ? <Btn className="sr-primary sr-start" disabled={p.busy || p.paused} onClick={p.onOpenChest}>Open your chest</Btn>
            : <Btn className="sr-primary sr-start" disabled={!check.ok || p.busy || p.paused} onClick={p.onStart}>Start run · {rf(p.definition.price)}</Btn>}
          {freeRuns > 0n && <Btn disabled={p.busy || p.paused} onClick={p.onRedeem}>Redeem free run · 1 RF</Btn>}
          <p role={p.error ? 'alert' : 'status'} className="sr-status-line">{status}</p>
        </div>
      </div>
      <DailyPoolPanel view={p.pool} />
    </div>
  </section>;
}
