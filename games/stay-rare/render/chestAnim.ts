import { linePoints } from './pixel';
/**
 * Chest opening timeline (presentation only; the prize was already decided by `settle`).
 * shake → unlock (the lock pops and falls) → open (4 drawn lid frames, light column) → reveal (the prize rises) → idle.
 */
export const CHEST_T = { shake: 600, unlock: 780, open: 1050, reveal: 1850 } as const;
export type ChestKind = 'poolEntry' | 'freeRun';
export type ChestPhase = 'shake' | 'unlock' | 'open' | 'reveal' | 'idle';
export type ChestFrame = Readonly<{
  phase: ChestPhase; t: number;
  shakeAmp: number; shakeX: number; lockLit: boolean;
  /** Lock offset from its rest position (canvas px), rotation frame 0–3. */
  lock: Readonly<{ x: number; y: number; spin: number; visible: boolean }>;
  /** 0 closed · 1 ajar · 2 nearly open · 3 open (flipped back). */
  lid: 0 | 1 | 2 | 3;
  /** Light column height 0–1, one-frame flash inside the chest window when the lid gives way. */
  light: number; flash: boolean;
  /** Prize offset above the chest opening (canvas px, negative = up). */
  item: Readonly<{ y: number; visible: boolean }>;
  rays: boolean; rayAngle: number; confetti: boolean; confettiT: number;
  glowHigh: boolean; done: boolean;
}>;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const RISE = 26;

export function chestFrame(t: number, kind: ChestKind, reduced: boolean): ChestFrame {
  const free = kind === 'freeRun';
  if (reduced) {
    return { phase: 'idle', t, shakeAmp: 0, shakeX: 0, lockLit: true, lock: { x: 0, y: 0, spin: 0, visible: false }, lid: 3,
      light: 1, flash: false, item: { y: -RISE, visible: true }, rays: free, rayAngle: 0, confetti: false, confettiT: 0, glowHigh: true, done: true };
  }
  const phase: ChestPhase = t < CHEST_T.shake ? 'shake' : t < CHEST_T.unlock ? 'unlock' : t < CHEST_T.open ? 'open' : t < CHEST_T.reveal ? 'reveal' : 'idle';
  // Anticipation: the shake grows in steps; the lock blinks.
  const shakeAmp = phase === 'shake' ? 1 + Math.floor(t / 200) : 0;
  const shakeX = shakeAmp * (Math.floor(t / 40) % 2 ? 1 : -1);
  const lockLit = Math.floor(t / 100) % 2 === 0;
  // Unlock: the lock pops up and falls away along a parabola, spinning.
  const u = Math.max(0, (t - CHEST_T.shake) / (CHEST_T.unlock - CHEST_T.shake));
  const popped = t >= CHEST_T.shake;
  const lock = { x: popped ? Math.round(10 * u) : 0, y: popped ? Math.round(-16 * u + 20 * u * u) : 0,
    spin: popped ? Math.floor(u * 8) % 4 : 0, visible: t < CHEST_T.unlock + 100 };
  // Open: 4 lid frames; a flash as it gives way; the light column rises.
  const o = clamp01((t - CHEST_T.unlock) / (CHEST_T.open - CHEST_T.unlock));
  const lid = (t < CHEST_T.unlock ? 0 : Math.min(3, Math.floor(o * 4))) as 0 | 1 | 2 | 3;
  const flash = t >= CHEST_T.unlock && o >= 0.75 && o < 0.9;
  const light = t < CHEST_T.unlock ? 0 : clamp01((t - CHEST_T.unlock) / (CHEST_T.open + 300 - CHEST_T.unlock));
  // Reveal: the prize rises out (ease-out); a free run adds rotating rays and confetti.
  const r = clamp01((t - CHEST_T.open) / (CHEST_T.reveal - CHEST_T.open));
  const rise = 1 - (1 - r) ** 3;
  const idle = phase === 'idle';
  const bob = idle && Math.floor((t - CHEST_T.reveal) / 500) % 2 ? 1 : 0;
  return {
    phase, t, shakeAmp, shakeX, lockLit, lock, lid, light, flash,
    item: { y: -Math.round(RISE * rise) + bob, visible: t >= CHEST_T.open },
    rays: free && t >= CHEST_T.open, rayAngle: (t / 1000) * 0.8,
    confetti: free && t >= CHEST_T.open, confettiT: Math.max(0, t - CHEST_T.open),
    glowHigh: !idle || Math.floor((t - CHEST_T.reveal) / 500) % 2 === 0, done: idle,
  };
}

/** While `settle` draws the prize: closed, lock blinking, a 1 px rattle twice a second (still under reduced motion). */
export function closedFrame(t: number, reduced: boolean): ChestFrame {
  const f = chestFrame(0, 'poolEntry', false);
  return { ...f, t, shakeAmp: reduced ? 0 : 1, shakeX: reduced ? 0 : Math.floor(t / 250) % 2 ? 1 : 0,
    lockLit: reduced || Math.floor(t / 300) % 2 === 0, glowHigh: false, done: false };
}

/** Sounds crossed while the clock moves from `from` (exclusive) to `to` (inclusive): shake ticks, the lock click, the reveal, a free-run reward. */
export type ChestCue = 'tick' | 'click' | 'reveal-common' | 'reveal-legendary' | 'reward';
export function chestCues(from: number, to: number, kind: ChestKind): ChestCue[] {
  const marks: [number, ChestCue][] = [[0, 'tick'], [200, 'tick'], [400, 'tick'], [CHEST_T.shake, 'click'],
    [CHEST_T.open, kind === 'freeRun' ? 'reveal-legendary' : 'reveal-common']];
  if (kind === 'freeRun') marks.push([CHEST_T.reveal, 'reward']);
  return marks.filter(([at]) => from < at && at <= to).map(([, cue]) => cue);
}

/** Reduced motion skips the timeline but still sounds the reveal (and a free run's reward), once. */
export function revealCues(kind: ChestKind): ChestCue[] {
  return kind === 'freeRun' ? ['reveal-legendary', 'reward'] : ['reveal-common'];
}

/**
 * Pixel art (1 char = 1 canvas pixel): '#' ink, '.' paper, 'g' ink-30, 'y' signal (the lock light), ' ' clear.
 * Lid frames: 0 closed, 1 ajar (same art, lifted), 2 tipping back, 3 open (its underside stands behind the body).
 */
export const CHEST_SPRITES = {
  lid0: [
    '  ####################  ',
    ' #..##............##..# ',
    '#...##............##...#',
    '#...##............##...#',
    '#ggg##gggggggggggg##ggg#',
    '########################',
  ],
  lid2: [
    ' ###################### ',
    '#...##............##...#',
    '########################',
    ' #gg##gggggggggggg##gg# ',
    ' ###################### ',
  ],
  lid3: [
    '    ################    ',
    '   #..##........##..#   ',
    '   #..##........##..#   ',
    '  #...##........##...#  ',
    '  #...##........##...#  ',
    '  #ggg##gggggggg##ggg#  ',
    ' #....##........##....# ',
    ' #gggg##gggggggg##gggg# ',
    '########################',
  ],
  body: [
    '########################',
    '#...##............##...#',
    '#...##............##...#',
    '#ggg##gggggggggggg##ggg#',
    '#...##............##...#',
    '#...##............##...#',
    '#...##............##...#',
    '#ggg##gggggggggggg##ggg#',
    '#...##............##...#',
    '#ggg##gggggggggggg##ggg#',
    '#ggg##gggggggggggg##ggg#',
    '########################',
  ],
  lock: [' #### ', ' #  # ', '######', '#yyyy#', '#y##y#', '#yyyy#', '######'],
  lockSide: [' ## ', ' ## ', '####', '#yy#', '#yy#', '#yy#', '####'],
  /** '.' paper (Pool entry) or signal (Free run); ':' a dashed perforation. */
  ticket: [
    '####################',
    '#..........:.......#',
    '#.###.###..:...#...#',
    '#.#.#.#....:..###..#',
    ' .##..##...:.#####. ',
    '#.#.#.#....:..###..#',
    '#.#.#.#....:...#...#',
    '#..........:.......#',
    '####################',
  ],
} as const satisfies Record<string, readonly string[]>;

export const CHEST_W = 48, CHEST_H = 44;
export type ChestInk = 'ink' | 'paper' | 'ink30' | 'signal';
export type ChestPixel = Readonly<{ x: number; y: number; c: ChestInk }>;
const X0 = 12, BODY_Y = 30, LOCK_X = 21, LOCK_Y = 26, TICKET_Y = 31, CX = 24;
/** Lid art and top row per frame; the rows between the lid and the body show the chest's inside. */
const LIDS = [[CHEST_SPRITES.lid0, 24], [CHEST_SPRITES.lid0, 22], [CHEST_SPRITES.lid2, 22], [CHEST_SPRITES.lid3, 18]] as const;

/** Everything the canvas paints for one frame, back to front (later pixels cover earlier ones). */
export function chestPixels(f: ChestFrame, kind: ChestKind): ChestPixel[] {
  const out: ChestPixel[] = [], free = kind === 'freeRun';
  const put = (x: number, y: number, c: ChestInk) => {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < CHEST_W && y >= 0 && y < CHEST_H) out.push({ x, y, c });
  };
  const sprite = (rows: readonly string[], x0: number, y0: number, map: (ch: string, x: number, y: number) => ChestInk | null) =>
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = map(ch, x, y); if (c) put(x0 + x, y0 + y, c); }));
  const base = (ch: string): ChestInk | null => ch === '#' ? 'ink' : ch === '.' ? 'paper' : ch === 'g' ? 'ink30' : ch === 'y' ? 'signal' : null;
  const sx = f.shakeX;

  // Floor shadow (never shakes).
  for (let x = X0; x < X0 + 24; x++) { if (x % 2 === 0) put(x, BODY_Y + 12, 'ink30'); if (x > X0 + 1 && x < X0 + 22 && x % 2) put(x, BODY_Y + 13, 'ink30'); }
  // Free run: slow rotating pixel rays behind everything, dashed.
  if (f.rays) {
    const turn = Math.round(f.rayAngle * 16 / Math.PI) * Math.PI / 16;
    for (let i = 0; i < 8; i++) {
      const a = turn + i * Math.PI / 4, cx = CX, cy = 9;
      linePoints(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, cx + Math.cos(a) * 24, cy + Math.sin(a) * 24)
        .forEach(([x, y], k) => { if (k % 3 !== 2) put(x, y, k % 3 ? 'ink30' : 'signal'); });
    }
  }
  // The lid, and the inside of the chest showing under it (dark back wall, light at the bottom).
  const [lidArt, lidY] = LIDS[f.lid];
  for (let y = lidY + lidArt.length; y < BODY_Y; y++) {
    const row = BODY_Y - y; // 1 = the row just above the rim: full light; 2 = checker; higher = dark back wall
    for (let x = 0; x < 24; x++) put(sx + X0 + x, y, x === 0 || x === 23 || row > 2 || (row === 2 && x % 2) ? 'ink' : 'signal');
  }
  if (f.lid === 3) sprite(lidArt, sx + X0, lidY, base);
  // The light column rising out of the chest: a dither that thins with height and shimmers slowly, with motes drifting up.
  if (f.light > 0) {
    const reach = Math.round(f.light * 28), top = BODY_Y - 1 - reach, shift = f.done ? (f.glowHigh ? 0 : 1) : Math.floor(f.t / 250) % 2;
    for (let y = top; y < BODY_Y; y++) {
      const h = BODY_Y - y, half = 8 - Math.floor(h / 10), every = h < 8 ? 2 : h < 18 ? 3 : 4;
      for (let x = CX - half; x < CX + half; x++) if ((x + y + shift) % every === 0) put(sx + x, y, 'signal');
    }
    for (let i = 0; i < 5; i++) {
      const h = 3 + Math.floor(f.t * 0.012 + i * 5.3) % Math.max(1, reach);
      put(sx + CX - 6 + (i * 5) % 12, BODY_Y - h, h < 16 ? 'ink' : 'ink30');
    }
  }
  if (f.lid === 3) sprite(lidArt, sx + X0, lidY, ch => ch === '#' ? 'ink' : null); // the open lid's outline reads through the light
  // The prize rising out of the chest: a ticket (paper) or the free-run ticket (signal) with sparkles.
  if (f.item.visible) {
    const ty = TICKET_Y + f.item.y;
    sprite(CHEST_SPRITES.ticket, CX - 10, ty, (ch, _x, y) => ch === ':' ? (y % 2 ? 'ink' : null) : ch === '.' ? (free ? 'signal' : 'paper') : base(ch));
    if (free) {
      const on = f.done ? f.glowHigh : Math.floor(f.t / 200) % 2 === 0;
      const spark = (x: number, y: number) => { put(x, y, 'ink'); put(x - 1, y, 'signal'); put(x + 1, y, 'signal'); put(x, y - 1, 'signal'); put(x, y + 1, 'signal'); };
      if (on) { spark(CX - 13, ty - 1); spark(CX + 12, ty + 9); } else { spark(CX + 13, ty - 1); spark(CX - 12, ty + 9); }
    }
  }
  sprite(CHEST_SPRITES.body, sx + X0, BODY_Y, base);
  if (f.lid < 3) sprite(lidArt, sx + X0, lidY, base);
  // The lock: blinking while it waits, then popping off and spinning along its arc.
  if (f.lock.visible) {
    const art = f.lock.spin % 2 ? CHEST_SPRITES.lockSide : CHEST_SPRITES.lock, flip = f.lock.spin === 2;
    const lx = sx + LOCK_X + f.lock.x + (art === CHEST_SPRITES.lockSide ? 1 : 0), ly = LOCK_Y + f.lock.y;
    sprite(flip ? [...art].reverse() : art, lx, ly, ch => ch === 'y' ? (f.lockLit ? 'signal' : 'ink30') : base(ch));
  }
  // Dust kicked up by the rattle.
  if (f.phase === 'shake' && f.shakeAmp >= 2) {
    const k = Math.floor(f.t / 100) % 3;
    put(X0 - 2 - k, BODY_Y + 11 - k, 'ink30'); put(X0 + 25 + k, BODY_Y + 11 - k, 'ink30');
  }
  // The lid gives way: a short pixel star over the opening.
  if (f.flash) for (const [dx, dy] of [[1, 0], [-1, 0], [1, -1], [-1, -1], [0, -1]]) for (let r = 5; r < 9; r++) put(CX + dx * r * 1.5, BODY_Y - 2 + dy * r, 'signal');
  // Free run: confetti bursting out and falling (1.4 s).
  if (f.confetti && f.confettiT < 1400) {
    const s = f.confettiT / 1000;
    for (let i = 0; i < 22; i++) {
      const a = -Math.PI / 2 + (i / 21 - 0.5) * 2.4, v = 34 + (i * 37) % 26;
      const x = CX + Math.cos(a) * v * s, y = BODY_Y - 3 + Math.sin(a) * v * s + 30 * s * s;
      put(x, y, i % 3 === 0 ? 'ink' : i % 3 === 1 ? 'signal' : 'ink30');
      if (i % 2 && Math.floor(f.confettiT / 90 + i) % 2) put(x + 1, y, 'signal');
    }
  }
  return out;
}
