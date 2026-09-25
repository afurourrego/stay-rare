/**
 * Background chiptune, synthesized with Web Audio (square lead, triangle bass, noise drums): no files, no network.
 * Two loops: `wave` while you fight the glitches, `boss` (faster, tenser) while a boss is up. Songs switch on a bar line.
 */
export type Voice = 'lead' | 'bass' | 'kick' | 'snare' | 'hat';
export type Note = Readonly<{ voice: Voice; step: number; midi: number; len: number }>;
export type Song = Readonly<{ bpm: number; steps: number; notes: readonly Note[] }>;
export type SongName = 'wave' | 'boss';

const n = (voice: Voice, step: number, midi: number, len = 1): Note => ({ voice, step, midi, len });
const drums = (bars: number, kicks: readonly number[], snares: readonly number[], hats: readonly number[]): Note[] =>
  Array.from({ length: bars }, (_, b) => [
    ...kicks.map(s => n('kick', b * 16 + s, 0)), ...snares.map(s => n('snare', b * 16 + s, 0)), ...hats.map(s => n('hat', b * 16 + s, 0)),
  ]).flat();

// Wave: A minor, Am F C G | Am F G E. Bouncy bass (root on the beat, octave between), a hummable lead.
const WAVE_ROOTS = [45, 41, 48, 43, 45, 41, 43, 40];
const WAVE_LEAD: [number, number, number][] = [
  [0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 69, 4],
  [16, 69, 2], [18, 72, 2], [20, 77, 4], [24, 76, 2], [26, 74, 2], [28, 72, 4],
  [32, 72, 2], [34, 76, 2], [36, 79, 4], [40, 77, 2], [42, 76, 2], [44, 74, 4],
  [48, 74, 4], [52, 71, 4], [56, 67, 8],
  [64, 76, 2], [66, 76, 2], [68, 79, 2], [70, 76, 2], [72, 74, 4], [76, 72, 4],
  [80, 77, 2], [82, 76, 2], [84, 74, 2], [86, 72, 2], [88, 69, 8],
  [96, 71, 2], [98, 74, 2], [100, 79, 4], [104, 77, 2], [106, 74, 2], [108, 71, 4],
  [112, 68, 4], [116, 71, 4], [120, 76, 8],
];
// Boss: E phrygian ostinato over a driving eighth-note bass (E E F D per bar).
const BOSS_ROOTS = [40, 41, 40, 38];
const BOSS_RIFF: [number, number, number][] = [[0, 0, 1], [2, 1, 1], [4, 0, 1], [6, 7, 2], [8, 0, 1], [10, 1, 1], [12, 3, 2], [14, 1, 2]];

export const SONGS: Readonly<Record<SongName, Song>> = {
  wave: {
    bpm: 128, steps: 128,
    notes: [
      ...WAVE_LEAD.map(([s, m, l]) => n('lead', s, m, l)),
      ...WAVE_ROOTS.flatMap((r, b) => [0, 4, 8, 12].flatMap(s => [n('bass', b * 16 + s, r, 2), n('bass', b * 16 + s + 2, r + 12)])),
      ...drums(8, [0, 8], [4, 12], [2, 6, 10, 14]),
    ],
  },
  boss: {
    bpm: 150, steps: 64,
    notes: [
      ...BOSS_ROOTS.flatMap((r, b) => BOSS_RIFF.map(([s, d, l]) => n('lead', b * 16 + s, r + 24 + d + (b === 2 ? 12 : 0), l))),
      ...BOSS_ROOTS.flatMap((r, b) => [0, 2, 4, 6, 8, 10, 12, 14].map(s => n('bass', b * 16 + s, r))),
      ...drums(4, [0, 4, 8, 12], [4, 12], [1, 3, 5, 7, 9, 11, 13, 15]),
    ],
  },
};

export const stepSeconds = (song: Song) => 60 / song.bpm / 4;

/** Notes starting on global steps [from, to), looping the song; `at` is the global step. */
export function songEvents(song: Song, from: number, to: number): (Note & { at: number })[] {
  const out: (Note & { at: number })[] = [];
  for (let at = from; at < to; at++) {
    const local = ((at % song.steps) + song.steps) % song.steps;
    for (const note of song.notes) if (note.step === local) out.push({ ...note, at });
  }
  return out;
}

const VOLUME = 0.55, LOOKAHEAD = 0.15;
const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function createMusic() {
  let ctx: AudioContext | null = null, master: GainNode | null = null, noise: AudioBuffer | null = null;
  let muted = false, held = false, song: SongName | null = null, pending: SongName | null = null;
  let step = 0, nextTime = 0, timer = 0;

  const voice = (e: Note, t: number, dur: number) => {
    if (!ctx || !master || !noise) return;
    const env = ctx.createGain(); env.connect(master);
    const end = t + dur;
    if (e.voice === 'lead' || e.voice === 'bass') {
      const o = ctx.createOscillator(), peak = e.voice === 'lead' ? 0.045 : 0.08;
      o.type = e.voice === 'lead' ? 'square' : 'triangle'; o.frequency.setValueAtTime(freq(e.midi), t);
      env.gain.setValueAtTime(peak, t); env.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(env); o.start(t); o.stop(end + 0.02); o.onended = () => env.disconnect();
    } else if (e.voice === 'kick') {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.08);
      env.gain.setValueAtTime(0.13, t); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(env); o.start(t); o.stop(t + 0.12); o.onended = () => env.disconnect();
    } else {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), snare = e.voice === 'snare', len = snare ? 0.08 : 0.025;
      src.buffer = noise; f.type = snare ? 'bandpass' : 'highpass'; f.frequency.value = snare ? 1800 : 7000;
      env.gain.setValueAtTime(snare ? 0.06 : 0.022, t); env.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(f); f.connect(env); src.start(t); src.stop(t + len + 0.02); src.onended = () => env.disconnect();
    }
  };
  /** Lookahead scheduler: queue every step that starts within the next 150 ms; switch songs on a bar line. */
  const schedule = () => {
    if (!ctx || !song || held || ctx.state !== 'running') return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // after a pause or a slow tab
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      if (pending && step % 16 === 0) { song = pending; pending = null; step = 0; }
      const s = SONGS[song], dt = stepSeconds(s);
      for (const e of songEvents(s, step, step + 1)) voice(e, nextTime, e.len * dt * 0.95);
      nextTime += dt; step++;
    }
  };
  const onVisibility = () => { if (document.hidden) void ctx?.suspend(); else if (!held && !muted) void ctx?.resume(); };
  document.addEventListener('visibilitychange', onVisibility);
  const newMaster = () => {
    if (!ctx) return;
    master?.disconnect(); // anything already queued on the old bus falls silent
    master = ctx.createGain(); master.gain.value = muted ? 0 : VOLUME; master.connect(ctx.destination);
  };

  return {
    /** Call from a player gesture (autoplay rules). */
    async unlock(): Promise<boolean> {
      try {
        if (!ctx) {
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) return false;
          ctx = new AC(); newMaster();
          noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
          const d = noise.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        await ctx.resume();
        return true;
      } catch { return false; }
    },
    /** Start a song, or switch to it on the next bar line. */
    play(name: SongName): void {
      if (song === name) { pending = null; return; }
      if (!song) { song = name; step = 0; nextTime = 0; } else pending = name;
      if (!timer) timer = window.setInterval(schedule, 25);
    },
    /** Hold the music (pause menu, level-up choice) and pick it up where it was. */
    hold(value: boolean): void {
      if (held === value) return;
      held = value;
      if (value) void ctx?.suspend(); else if (!muted && !document.hidden) void ctx?.resume();
    },
    stop(): void { window.clearInterval(timer); timer = 0; song = null; pending = null; held = false; newMaster(); },
    setMuted(value: boolean): void { muted = value; if (master) master.gain.value = value ? 0 : VOLUME; },
    dispose(): void { this.stop(); document.removeEventListener('visibilitychange', onVisibility); void ctx?.close(); ctx = null; master = null; },
  };
}
export type Music = ReturnType<typeof createMusic>;
