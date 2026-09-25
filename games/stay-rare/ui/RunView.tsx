import { useEffect, useRef, useState } from 'react';
import type { FriendSoundKit } from '@rarefriends/friendsdk/sounds';
import type { Music } from '../audio/music';
import { SFX_FOR_EVENT, type Sfx } from '../audio/sfx';
import type { GenerationSprites } from '@rarefriends/friendsdk/sprites';
import { attachKeyboard, axisFromKeys } from '../input/keyboard';
import { attachJoystick } from '../input/touch';
import { VIEW_H, VIEW_W } from '../render/camera';
import { PIXEL, integerScale } from '../render/pixel';
import { friendTraits } from '../render/sprites';
import { createDrawAssets, drawFrame } from '../render/draw';
import { createFixedLoop } from '../render/loop';
import { Fx } from '../render/fx';
import { Particles } from '../render/particles';
import { CONTENT_MILESTONE } from '../sim/content';
import { createRecorder, type Recording } from '../sim/replay';
import { chooseCard, createRun, endRun, step } from '../sim/run';
import { score } from '../sim/score';
import type { FamilyId, RunState, Score } from '../sim/types';
import { CapsuleDialog, type CapsuleView } from './CapsuleDialog';
import { buildSummary, cardText } from './format';
import { Hud } from './Hud';
import { hudData, hudKey, type HudData } from './hudData';
import { PauseMenu } from './PauseMenu';

export type RunEnd = Readonly<{ score: Score; build: string[]; recording: Recording }>;
type Props = {
  sprites: GenerationSprites; paused: boolean; muted: boolean; reducedMotion: boolean; sound: FriendSoundKit | null; sfx: Sfx | null; music: Music | null;
  onToggleMute(): void; onToggleReducedMotion(): void; onEnd(end: RunEnd): void;
};

const capsuleView = (s: RunState): CapsuleView | null => s.capsule ? { cards: [...s.capsule], texts: s.capsule.map(c => cardText(c, s)) } : null;

export function RunView(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null), stageRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudData | null>(null), [capsule, setCapsule] = useState<CapsuleView | null>(null), [menu, setMenu] = useState(false);
  const live = useRef({ props, menu }); live.current = { props, menu };
  const api = useRef<{ choose(i: number): void; end(): void } | null>(null);

  useEffect(() => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0], familyId = props.sprites.familyId as FamilyId;
    const traits = friendTraits(props.sprites); // your Friend plays a little differently from every other one
    const state = createRun(seed, familyId, CONTENT_MILESTONE, traits), recorder = createRecorder(seed, familyId, CONTENT_MILESTONE, traits);
    const assets = createDrawAssets(props.sprites, seed), particles = new Particles(), fx = new Fx(), ctx = canvasRef.current!.getContext('2d')!;
    let lastHud = '', finished = false, shake = 0;
    const finish = () => {
      if (finished) return;
      finished = true; loop.stop(); live.current.props.music?.stop();
      live.current.props.onEnd({ score: score(state), build: buildSummary(state), recording: recorder.rec });
    };
    const choose = (i: number) => {
      if (!state.capsule?.[i]) return;
      recorder.choice(i); chooseCard(state, i);
      live.current.props.sound?.play('select');
      setCapsule(capsuleView(state));
    };
    api.current = { choose, end: () => { endRun(state); setCapsule(null); setMenu(false); finish(); } };
    const keyboard = attachKeyboard(window, {
      onPause: () => { if (!state.capsule && !state.over) setMenu(m => !m); },
      onMute: () => live.current.props.onToggleMute(),
      onChoose: choose,
    });
    const joystick = attachJoystick(stageRef.current!);
    const playSounds = () => {
      const kit = live.current.props.sound;
      for (const e of state.events) {
        // Gacha-style fanfare from the SDK kit: ready → rare reveal → reward.
        if (e.type === 'levelUp') { kit?.play('action-ready'); window.setTimeout(() => kit?.play('reveal-rare'), 160); window.setTimeout(() => kit?.play('reward'), 380); }
        else if (e.type === 'bossSpawn') { kit?.play('anticipation'); live.current.props.music?.play('boss'); }
        else if (e.type === 'bossDown') { kit?.play('reveal-legendary'); live.current.props.music?.play('wave'); }
        const action = SFX_FOR_EVENT[e.type]; // chiptune action sounds (throttled per sound)
        if (action) live.current.props.sfx?.play(action);
      }
    };
    const loop = createFixedLoop({
      running: () => !live.current.props.paused && !live.current.menu && !state.capsule && !state.over && !document.hidden,
      tick: () => {
        step(state, recorder.input(joystick.active() ? joystick.vector() : axisFromKeys(keyboard.keys)));
        if (state.events.some(e => e.type === 'hurt')) shake = 6;
        playSounds();
        particles.fromEvents(state.events, live.current.props.reducedMotion);
        fx.fromEvents(state.events, live.current.props.reducedMotion);
        if (state.capsule) setCapsule(capsuleView(state));
        if (state.over) finish();
      },
      render: () => {
        // Music holds while the run is paused, in the menu or choosing a power, and picks up where it was.
        live.current.props.music?.hold(!!live.current.props.paused || live.current.menu || !!state.capsule || document.hidden);
        particles.update(); fx.update();
        drawFrame(ctx, state, assets, particles, fx, { reducedMotion: live.current.props.reducedMotion, shake });
        if (shake > 0) shake--;
        const data = hudData(state), key = hudKey(data);
        if (key !== lastHud) { lastHud = key; setHud(data); }
      },
    });
    loop.start();
    props.music?.play('wave');
    stageRef.current!.focus();
    // True pixel art: show the 480×320 canvas at a whole-number scale (×1, ×2, ×3…), centred; the rest is paper.
    const fit = () => {
      const stage = stageRef.current, canvas = canvasRef.current;
      if (!stage || !canvas) return;
      const k = integerScale(stage.clientWidth, stage.clientHeight);
      canvas.style.width = `${(VIEW_W / PIXEL) * k}px`; canvas.style.height = `${(VIEW_H / PIXEL) * k}px`;
    };
    const resize = new ResizeObserver(fit); resize.observe(stageRef.current!); fit();
    const hide = () => { keyboard.release(); joystick.release(); if (!state.over && !state.capsule) setMenu(true); };
    const onVisibility = () => { if (document.hidden) hide(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', hide);
    return () => {
      loop.stop(); live.current.props.music?.stop(); keyboard.dispose(); joystick.dispose(); api.current = null; resize.disconnect();
      document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', hide);
    };
    // One run per mount: the parent remounts RunView (key = playId) for every new run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="sr-stage" ref={stageRef} tabIndex={-1}>
    <canvas ref={canvasRef} width={VIEW_W / PIXEL} height={VIEW_H / PIXEL} className="sr-canvas" role="img" aria-label="Stay Rare run" />
    {hud && <Hud data={hud} muted={props.muted} onPause={() => { if (!capsule) setMenu(true); }} onMute={props.onToggleMute} />}
    {capsule && <CapsuleDialog view={capsule} reducedMotion={props.reducedMotion} sound={props.sound} onChoose={i => api.current?.choose(i)} />}
    {menu && !capsule && <PauseMenu muted={props.muted} reducedMotion={props.reducedMotion} onResume={() => setMenu(false)}
      onEndRun={() => api.current?.end()} onToggleMute={props.onToggleMute} onToggleReducedMotion={props.onToggleReducedMotion} />}
    {props.paused && !menu && !capsule && <div className="sr-overlay sr-hostpause" data-ui role="status">Paused</div>}
  </div>;
}
