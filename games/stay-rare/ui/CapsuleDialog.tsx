import { useEffect, useMemo } from 'react';
import type { FriendSoundCue, FriendSoundKit } from '@rarefriends/friendsdk/sounds';
import { noisePixels } from '../render/noise';
import type { Card, Rarity } from '../sim/types';
import { Crt } from './Crt';
import { iconFor } from './icons';
import { PixelIcon } from './PixelGrid';

export type CapsuleView = Readonly<{ cards: Card[]; texts: { title: string; detail: string }[] }>;
const RANK: Record<Rarity, number> = { common: 0, rare: 1, legendary: 2 };
/** Reveal timings (ms): the static clears in bands, then the chips print; keep in sync with style.css (.sr-crt-*). */
export const REVEAL = { orb: 900, perCard: 240 } as const;
const BANDS = 8;

/** A 1-bit static tile as a data URL (img-src allows data:), tiled over the CRT screen with pixelated scaling. */
let staticUrl = '';
function staticTile(): string {
  if (staticUrl) return staticUrl;
  const size = 48, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#111111'; g.fillRect(0, 0, size, size); g.fillStyle = '#eeeeee';
  noisePixels(0x5717, size, 0.45).forEach((on, i) => { if (on) g.fillRect(i % size, (i / size) | 0, 1, 1); });
  return (staticUrl = c.toDataURL());
}

type Props = { view: CapsuleView; onChoose(index: number): void; reducedMotion: boolean; sound: FriendSoundKit | null };
/** Level up: a full-size decoding terminal whose screen holds the three power chips. */
export function CapsuleDialog({ view, onChoose, reducedMotion, sound }: Props) {
  const url = useMemo(() => (reducedMotion ? '' : staticTile()), [reducedMotion]);
  useEffect(() => {
    if (!sound) return;
    const cue = (r: Rarity): FriendSoundCue => r === 'legendary' ? 'reveal-legendary' : r === 'rare' ? 'reveal-rare' : 'reveal-common';
    if (reducedMotion) { sound.play(cue(view.cards.reduce<Rarity>((best, c) => RANK[c.rarity] > RANK[best] ? c.rarity : best, 'common'))); return; }
    sound.play('anticipation'); // the terminal decodes the signal
    const timers = view.cards.map((c, i) => window.setTimeout(() => sound.play(cue(c.rarity)), REVEAL.orb + i * REVEAL.perCard));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [view, reducedMotion, sound]);
  return <div className="sr-overlay sr-crt-overlay" data-ui>
    <Crt title="Level up!" titleId="sr-capsule-title" reducedMotion={reducedMotion}>
      <p className="sr-crt-line"><span className="sr-crt-typed">&gt; SIGNAL DECODED · PICK ONE POWER</span></p>
      <div className="sr-cards">
        {view.cards.map((card, i) => <button key={i} type="button" autoFocus={i === 0}
          className={`sr-cardpick sr-chip sr-${card.rarity}${reducedMotion ? '' : ' sr-reveal'}`}
          style={{ animationDelay: `${REVEAL.orb + i * REVEAL.perCard}ms` }}
          aria-label={`Choose ${view.texts[i].title}, ${card.rarity}`} onClick={() => onChoose(i)}>
          <span className="sr-card-head"><PixelIcon rows={iconFor(card)} className="sr-card-icon" /><span className="sr-rarity">{card.rarity}</span></span>
          <strong>{view.texts[i].title}</strong><span>{view.texts[i].detail}</span><kbd>{i + 1}</kbd>
        </button>)}
      </div>
      <p className="sr-crt-note">Rarity is game chance, not RF.</p>
      {!reducedMotion && <div className="sr-crt-static" aria-hidden="true">
        {Array.from({ length: BANDS }, (_, b) => <i key={b} style={{ backgroundImage: `url(${url})`, top: `${b * 100 / BANDS}%`, animationDelay: `${200 + b * 70}ms` }} />)}
      </div>}
    </Crt>
  </div>;
}
