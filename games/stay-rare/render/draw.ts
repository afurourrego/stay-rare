import type { GenerationSprites } from '@rarefriends/friendsdk/sprites';
import { BOSSES, WORLD } from '../sim/content';
import { computeStats } from '../sim/stats';
import type { RunState } from '../sim/types';
import { orbiters } from '../sim/weapons';
import { VIEW_H, VIEW_W, cameraFor, facingFromVector } from './camera';
import { SDK_DECOR, bakeGround, decorLayout, drawProp, rasterizeProps, type DecorItem, type DecorType } from './decor';
import { depthSort, enemyDepth, playerDepth, propDepth, shotDepth } from './depth';
import { createEnemySprites, enemyScale, pickEnemyFriend, type EnemySprites } from './corrupt';
import { HitFlash, blinkHidden } from './flash';
import { labelRise, type Fx } from './fx';
import { INK, INK30, INK60, PAPER, SIGNAL } from './palette';
import type { Particles } from './particles';
import { shotPixels } from './shots';
import { PIXEL, arcPoints, circlePoints, linePoints, plot, projector, shadowPixels, type Pt } from './pixel';
import { CORRUPTED, prepareFriendFrames, type FriendFrames } from './sprites';

/** The run is drawn on a half-resolution canvas and scaled ×2 with nearest-neighbour: everything is pixel art. */
const LOW_W = VIEW_W / PIXEL, LOW_H = VIEW_H / PIXEL, FRIEND_SCALE = 2;

export type DrawAssets = Readonly<{
  friend: FriendFrames; corrupted: FriendFrames; enemies: EnemySprites; flash: HitFlash;
  low: HTMLCanvasElement; lctx: CanvasRenderingContext2D; dither: CanvasPattern;
  /** World-size low-res flat ground (paths, grass). */
  ground: HTMLCanvasElement;
  /** SDK props of this run's layout, drawn depth-sorted with the characters once their art is rasterized. */
  /** SDK props with their layout index (`id`, what the sim reports in `state.broken`). */
  decor: readonly (DecorItem & { id: number })[]; props: { map: ReadonlyMap<DecorType, HTMLCanvasElement> | null };
}>;

export function createDrawAssets(sprites: GenerationSprites, seed: number): DrawAssets {
  const low = document.createElement('canvas');
  low.width = LOW_W; low.height = LOW_H;
  const lctx = low.getContext('2d')!;
  const tile = document.createElement('canvas');
  tile.width = tile.height = 2;
  const t = tile.getContext('2d')!;
  t.fillStyle = INK30; t.fillRect(0, 0, 1, 1); t.fillRect(1, 1, 1, 1);
  const props: { map: ReadonlyMap<DecorType, HTMLCanvasElement> | null } = { map: null };
  void rasterizeProps().then(map => { props.map = map; }).catch(() => { /* play without props art */ });
  const decor = decorLayout(seed).map((i, id) => ({ ...i, id })).filter(i => (SDK_DECOR as readonly string[]).includes(i.type));
  return { friend: prepareFriendFrames(sprites), corrupted: prepareFriendFrames(sprites, CORRUPTED), enemies: createEnemySprites(),
    flash: new HitFlash(), low, lctx, dither: lctx.createPattern(tile, 'repeat')!, ground: bakeGround(seed), decor, props };
}

const SHOT_FILL = { '#': INK, y: SIGNAL, p: PAPER, g: INK30 } as const, SHOT_SCALE = 2;
const shadows = new Map<string, Pt[]>();
const shadowCache = (w: number, h: number) => { const k = `${w}x${h}`; let v = shadows.get(k); if (!v) { v = shadowPixels(w, h); shadows.set(k, v); } return v; };

/** Pixel box: 1-px ink outline around a fill. */
function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  g.fillStyle = INK; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = fill; g.fillRect(x, y, w, h);
}

const GEM = ['..#..', '.#y#.', '#yyy#', '.#y#.', '..#..'];
/** Drift Mine: 'y' is the blinking light. */
const MINE_ART = ['..###..', '.#ggg#.', '#gg#gg#', '#g#y#g#', '#gg#gg#', '.#ggg#.', '..###..'];
/** Health patch: a signal plus outlined in ink. */
const PATCH_ART = ['..###..', '..#y#..', '###y###', '#yyyyy#', '###y###', '..#y#..', '..###..'];
function gem(g: CanvasRenderingContext2D, x: number, y: number): void {
  GEM.forEach((row, dy) => [...row].forEach((c, dx) => { if (c === '.') return; g.fillStyle = c === '#' ? INK : SIGNAL; g.fillRect(x - 2 + dx, y - 2 + dy, 1, 1); }));
}

export function drawFrame(ctx: CanvasRenderingContext2D, state: RunState, assets: DrawAssets, particles: Particles, fx: Fx,
  opts: { reducedMotion: boolean; shake: number }): void {
  const g = assets.lctx, p = state.player, cam = cameraFor(p.x, p.y), stats = computeStats(state);
  const sh = opts.shake > 0 && !opts.reducedMotion ? Math.round(Math.random() * 2 - 1) : 0;
  const pr = projector(cam), X = (wx: number) => pr.X(wx) + sh, Y = pr.Y;
  const on = (x: number, y: number, m: number) => x > -m && x < LOW_W + m && y > -m && y < LOW_H + m;
  assets.flash.still = opts.reducedMotion;
  assets.flash.observe(state.enemies);
  g.imageSmoothingEnabled = false;

  // Ground: the pre-baked world (lattice, dither, paths, scenery); blit the visible window.
  g.fillStyle = PAPER; g.fillRect(0, 0, LOW_W, LOW_H);
  g.drawImage(assets.ground, pr.groundX, pr.groundY, LOW_W, LOW_H, sh, 0, LOW_W, LOW_H);

  for (const w of state.walls) {
    const x = X(w.x), y = Y(w.y), ww = Math.round(w.w / PIXEL), hh = Math.round(w.h / PIXEL);
    g.fillStyle = INK; g.fillRect(x, y, ww, hh); g.fillStyle = PAPER;
    if (ww > hh) for (let i = 2; i < ww - 2; i += 5) g.fillRect(x + i, y + (hh >> 1), 2, 1);
    else for (let i = 2; i < hh - 2; i += 5) g.fillRect(x + (ww >> 1), y + i, 1, 2);
  }
  for (const gm of state.gems) { const x = X(gm.x), y = Y(gm.y); if (on(x, y, 4)) gem(g, x, y); }
  for (const pt of state.patches) {
    const x = X(pt.x), y = Y(pt.y), bob = !opts.reducedMotion && Math.floor(state.tick / 20) % 2 ? -1 : 0;
    if (!on(x, y, 8)) continue;
    plot(g, shadowCache(8, 3), x + 1, y + 4, INK60);
    PATCH_ART.forEach((row, dy) => [...row].forEach((c, dx) => { if (c === '.') return; g.fillStyle = c === '#' ? INK : SIGNAL; g.fillRect(x - 3 + dx, y - 3 + dy + bob, 1, 1); }));
  }
  for (const m of state.mines) { // Drift Mine: grey shell, ink rim, a signal light blinking slowly (steady under reduced motion)
    const x = X(m.x), y = Y(m.y), lit = opts.reducedMotion || Math.floor((state.tick + m.ttl) / 30) % 2 === 0;
    if (!on(x, y, 8)) continue;
    plot(g, shadowCache(8, 3), x + 1, y + 3, INK60);
    MINE_ART.forEach((row, dy) => [...row].forEach((c, dx) => { if (c === '.') return; g.fillStyle = c === '#' ? INK : c === 'g' ? INK30 : lit ? SIGNAL : INK; g.fillRect(x - 3 + dx, y - 3 + dy, 1, 1); }));
  }

  // Attack effects, plotted pixel by pixel. Fading = dotting out, never alpha.
  for (const f of state.effects) {
    const x = X(f.x), y = Y(f.y), r = f.size / PIXEL, fading = f.ttl < 4 ? 2 : 1;
    if (f.kind === 'wave') {
      // Crescent slash in 3 frames: it opens outward, then the ink edge dots out.
      const frame = f.ttl > 8 ? 0 : f.ttl > 4 ? 1 : 2, a0 = f.angle - f.spread / 2, a1 = f.angle + f.spread / 2;
      const reach = [0.6, 0.85, 1][frame];
      plot(g, arcPoints(r * reach, a0, a1), x, y, SIGNAL, frame === 2 ? 1 : 3);
      plot(g, arcPoints(r * reach + 2, a0, a1), x, y, INK, 1, frame === 2 ? 2 : 1);
      if (frame < 2) plot(g, arcPoints(r * reach - 2, a0 + 0.15, a1 - 0.15), x, y, PAPER, 1);
    } else if (f.kind === 'pulse') {
      const rr = r * (0.55 + 0.45 * (1 - f.ttl / 8));
      plot(g, circlePoints(rr), x, y, INK, 1, 2);
      // signal pings on the wave
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + state.tick * 0.05, qx = x + Math.round(Math.cos(a) * rr), qy = y + Math.round(Math.sin(a) * rr);
        g.fillStyle = INK; g.fillRect(qx - 1, qy - 2, 3, 5); g.fillRect(qx - 2, qy - 1, 5, 3); g.fillStyle = SIGNAL; g.fillRect(qx - 1, qy, 3, 1); g.fillRect(qx, qy - 1, 1, 3); }
    } else if (f.kind === 'stamp') {
      plot(g, circlePoints(r), x, y, INK, 2, fading);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; plot(g, linePoints(0, 0, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6), x, y, INK, 1); }
    } else if (f.kind === 'beam') {
      const reach = (f.reach ?? f.size) / PIXEL, ex = Math.round(Math.cos(f.angle) * reach), ey = Math.round(Math.sin(f.angle) * reach);
      const line = linePoints(0, 0, ex, ey);
      plot(g, line, x, y, INK, 5); plot(g, line, x, y, SIGNAL, 3);
      if (reach < r - 1) { // stopped by scenery: a small spark where it hits
        g.fillStyle = INK; g.fillRect(x + ex - 3, y + ey - 1, 7, 3); g.fillRect(x + ex - 1, y + ey - 3, 3, 7);
        g.fillStyle = SIGNAL; g.fillRect(x + ex - 2, y + ey, 5, 1); g.fillRect(x + ex, y + ey - 2, 1, 5);
      }
    } else if (f.kind === 'telegraph') {
      plot(g, linePoints(0, 0, Math.cos(f.angle) * r, Math.sin(f.angle) * r), x, y, INK, 2, 3);
    }
  }

  // Shadows first, on the ground: dithered pixel ellipses, nudged right as if lit from the top-left. Nothing covers a character.
  const shadow = (cx: number, cy: number, w: number, h: number) => plot(g, shadowCache(w, h), cx, cy, INK60);
  const broken = state.broken.length ? new Set(state.broken) : null;
  if (assets.props.map) for (const item of assets.decor) {
    if (broken?.has(item.id)) continue;
    const art = assets.props.map.get(item.type), x = X(item.x), y = Y(item.y);
    if (art && on(x, y, art.width)) shadow(x + Math.round(art.width * 0.12), y, Math.round(art.width * 0.85), Math.max(3, Math.round(art.width * 0.22)));
  }
  for (const e of state.enemies) {
    const x = X(e.x), y = Y(e.y), s = e.boss === 'corruptor' ? 72 : 16 * enemyScale(e.boss ? 'boss' : e.kind);
    // under the feet: the sprite's last rows, not below its box
    if (on(x, y, 48)) shadow(x + 1, y + (s >> 1) - Math.round(s / 8) - 1, Math.round(s * 0.6), Math.max(3, s >> 3));
  }
  // Friend frames are 18 px (1 px margin) ×2: the feet sit ~12 low-res px below the centre; the shadow tucks under them.
  shadow(X(p.x) + 1, Y(p.y) + 12, 22, 5);

  // Depth pass: props, glitches and your Friend sorted by their feet, so you walk in front of and behind scenery.
  type Drawable = { depth: number; draw(): void };
  const pass: Drawable[] = [];
  const props = assets.props.map;
  if (props) for (const item of assets.decor) {
    if (broken?.has(item.id)) continue;
    const art = props.get(item.type), x = X(item.x), y = Y(item.y);
    if (art && on(x, y - (art.height >> 1), art.height)) pass.push({ depth: propDepth(item), draw: () => drawProp(g, art, x, y) });
  }
  for (const e of state.enemies) {
    const x = X(e.x), y = Y(e.y), flash = assets.flash.isFlashing(e.id), walk = (Math.floor(state.tick / 6) + e.id) % 8;
    if (!on(x, y, 48)) continue;
    pass.push({ depth: enemyDepth(e), draw: () => {
      if (e.boss === 'corruptor') {
        const frame = assets.corrupted.get(facingFromVector(p.x - e.x, p.y - e.y), true, walk), s = frame.width * 4;
        g.drawImage(frame, x - s / 2, y - s / 2, s, s);
        return;
      }
      // Real Generations Friends corrupted by the static (red eyes), facing you.
      const kind = e.boss ? 'boss' : e.kind, s = 16 * enemyScale(kind);
      g.drawImage(assets.enemies.get(pickEnemyFriend(e.id), p.x < e.x ? 'left' : 'right', walk, kind, flash), x - (s >> 1), y - (s >> 1), s, s);
      // 3-frame impact star: big plus → diagonal burst → sparks.
      const stage = assets.flash.stage(e.id), sx = x + (s >> 2), sy = y - (s >> 2);
      if (stage === 3) { g.fillStyle = INK; g.fillRect(sx - 3, sy - 1, 7, 3); g.fillRect(sx - 1, sy - 3, 3, 7); g.fillStyle = SIGNAL; g.fillRect(sx - 2, sy, 5, 1); g.fillRect(sx, sy - 2, 1, 5); }
      else if (stage === 2) { g.fillStyle = SIGNAL; for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) g.fillRect(sx + dx, sy + dy, 1, 1); g.fillStyle = INK; g.fillRect(sx, sy, 1, 1); }
      else if (stage === 1) { g.fillStyle = INK; for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) g.fillRect(sx + dx, sy + dy, 1, 1); }
    } });
  }
  // Your Friend: its plain black silhouette (no halo, no static), dither shadow, 1-px bob, blink while invulnerable.
  const frame = assets.friend.get(facingFromVector(p.facingX, p.facingY), p.moving, Math.floor(state.tick / 6) % 8);
  const fs = frame.width * FRIEND_SCALE, px = X(p.x), py = Y(p.y);
  const bob = p.moving && !opts.reducedMotion && Math.floor(state.tick / 8) % 2 === 0 ? -1 : 0;
  pass.push({ depth: playerDepth(p), draw: () => {
    if (!blinkHidden(p.invuln, state.tick, opts.reducedMotion)) g.drawImage(frame, px - (fs >> 1), py - (fs >> 1) + bob, fs, fs);
  } });
  // Shots join the depth pass: they pass behind tree tops like you do (solid bases stop them in the sim).
  for (const b of state.projectiles) {
    if (b.ttl <= 0) continue;
    const x = X(b.x), y = Y(b.y);
    if (!on(x, y, 4)) continue;
    pass.push({ depth: shotDepth(b), draw: () => {
      if (b.hostile) { g.fillStyle = INK; g.fillRect(x - 3, y - 3, 7, 7); g.fillStyle = PAPER; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = INK; g.fillRect(x, y, 1, 1); return; }
      g.fillStyle = INK60; g.fillRect(X(b.x - b.vx * 3), Y(b.y - b.vy * 3), 2, 2); g.fillStyle = INK30; g.fillRect(X(b.x - b.vx * 6), Y(b.y - b.vy * 6), 2, 2);
      // Each weapon has its own pixel shot (bone, arrow, cell, star…), oriented to its flight.
      // drawn at 2×2 per shape pixel so shots read clearly at a glance (visual only; hitboxes unchanged)
      for (const q of shotPixels(b.weapon, Math.atan2(b.vy, b.vx), b.weapon === 'splitCell' && b.split === 0)) { g.fillStyle = SHOT_FILL[q.c]; g.fillRect(x + q.x * SHOT_SCALE - 1, y + q.y * SHOT_SCALE - 1, SHOT_SCALE, SHOT_SCALE); }
    } });
  }
  for (const d of depthSort(pass)) d.draw();

  const kin = state.weapons.find(w => w.id === 'kinOrbit');
  if (kin) {
    // dotted trail behind each orbiter (read-only copy: rendering never writes the sim), then the orbiters themselves
    for (let k = 3; k >= 1; k--) { g.fillStyle = k > 1 ? INK30 : INK60; for (const o of orbiters({ ...state, orbitAngle: state.orbitAngle - k * 0.22 }, kin, stats)) g.fillRect(X(o.x), Y(o.y), 2, 2); }
    for (const o of orbiters(state, kin, stats)) { box(g, X(o.x) - 2, Y(o.y) - 2, 5, 5, SIGNAL); g.fillStyle = PAPER; g.fillRect(X(o.x) - 1, Y(o.y) - 1, 1, 1); }
  }

  for (const q of particles.list) { g.fillStyle = INK; const s = Math.max(1, q.size >> 1); g.fillRect(X(q.x), Y(q.y), s, s); }
  for (const ring of fx.rings) plot(g, circlePoints(ring.max / PIXEL * (1 - ring.t / 24)), X(ring.x), Y(ring.y), ring.t % 2 ? SIGNAL : INK, 2, 2);
  for (const c of fx.confetti) { g.fillStyle = c.color; g.fillRect(X(c.x), Y(c.y), 2, 2); }
  for (const l of fx.labels) { // +HP rises and fades
    const ly = Y(l.y) - 10 - labelRise(l.t, opts.reducedMotion);
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillStyle = PAPER; g.fillText(l.text, X(l.x) + 1, ly + 1); g.fillStyle = INK; g.fillText(l.text, X(l.x), ly);
  }
  if (fx.banner) {
    const t = fx.banner.text, w = t.length * 6 + 8, bx = px - (w >> 1), by = py - (fs >> 1) - 16 - (fx.banner.t > 65 ? fx.banner.t - 65 : 0);
    box(g, bx, by, w, 11, SIGNAL);
    g.fillStyle = INK; g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(t, px, by + 2);
  }

  const boss = state.enemies.find(e => e.boss);
  if (boss) {
    const w = 200, x = (LOW_W - w) >> 1, y = 38;
    box(g, x, y, w, 5, PAPER);
    g.fillStyle = INK; g.fillRect(x, y, Math.round(w * boss.hp / boss.maxHp), 5);
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(BOSSES[boss.boss!].name.toUpperCase(), LOW_W >> 1, y + 8);
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(assets.low, 0, 0); // the visible canvas is 480×320; CSS scales it by a whole number
}
