import { describe, expect, test } from 'vitest';
import { decodeGenerationSprites } from '@rarefriends/friendsdk/sprites';
import { cameraFor, facingFromVector, VIEW_H, VIEW_W } from '../../games/stay-rare/render/camera';
import { createFixedLoop } from '../../games/stay-rare/render/loop';
import { noisePixels } from '../../games/stay-rare/render/noise';
import { Particles } from '../../games/stay-rare/render/particles';
import { decodeRows } from '../../games/stay-rare/render/corrupt';
import { ENEMY_FRIENDS } from '../../games/stay-rare/render/enemyFriends';
import { CANONICAL, CORRUPTED, haloGrid, resolveFrameRows } from '../../games/stay-rare/render/sprites';
import { WORLD } from '../../games/stay-rare/sim/content';

const sprites = (familyId: number) => decodeGenerationSprites(7730n, familyId, 1, Array.from({ length: 64 }, (_, i) => BigInt(i + 1)));

describe('sprites', () => {
  test('haloGrid rings every mask pixel with a 1-pixel halo', () => {
    const rows = ['.#.', '...', '...'];
    expect(haloGrid(rows)).toEqual(['.hhh.', '.hmh.', '.hhh.', '.....', '.....']);
  });
  test('enclosed holes in the silhouette (the eyes) become their own cell, so they are painted, not left see-through', () => {
    expect(haloGrid(['###', '#.#', '###'])).toEqual(['hhhhh', 'hmmmh', 'hmemh', 'hmmmh', 'hhhhh']);
    expect(CANONICAL.eyes).toBe('#ffffff');
    for (const f of ENEMY_FRIENDS.filter(f => f.familyId !== 8)) expect(haloGrid(decodeRows(f.right[0])).join(''), `#${f.tokenId}`).toContain('e');
  });
  test('your Friend is drawn as its plain black silhouette (no white halo); the Corruptor keeps its ink outline', () => {
    expect(CANONICAL.halo).toBeNull();
    expect(CORRUPTED.halo).toBe('#111111');
    expect(CORRUPTED.eyes).toBe('#111111'); // inverted: ink eyes on the pale body, never see-through
  });
  test('Colossus (family 6) facing up/down uses the SDK side fallback', () => {
    const colossus = sprites(6);
    expect(resolveFrameRows(colossus, 'up', false, 0, 'left')).toEqual(colossus.clips.idle.left[0].rows);
    const skeleton = sprites(0);
    expect(resolveFrameRows(skeleton, 'up', true, 3, 'left')).toEqual(skeleton.clips.walk.up[3].rows);
  });
});

describe('noise, camera, particles', () => {
  test('noise is deterministic and about half on', () => {
    const a = noisePixels(5, 32);
    expect(noisePixels(5, 32)).toEqual(a);
    const on = a.filter(Boolean).length / a.length;
    expect(on).toBeGreaterThan(0.4); expect(on).toBeLessThan(0.6);
  });
  test('camera centers on the Friend and clamps to the world', () => {
    expect(cameraFor(1600, 1200)).toEqual({ x: 1600 - VIEW_W / 2, y: 1200 - VIEW_H / 2 });
    expect(cameraFor(10, 10)).toEqual({ x: 0, y: 0 });
    expect(cameraFor(WORLD.width, WORLD.height)).toEqual({ x: WORLD.width - VIEW_W, y: WORLD.height - VIEW_H });
  });
  test('facing picks the dominant axis', () => {
    expect([facingFromVector(1, 0.2), facingFromVector(-1, 0), facingFromVector(0.1, -1), facingFromVector(0, 1)]).toEqual(['right', 'left', 'up', 'down']);
  });
  test('particles: 8 per kill, 1 with reduced motion, decay, capped at 600', () => {
    const p = new Particles();
    const chips = new Particles(); chips.fromEvents([{ type: 'block', x: 0, y: 0 }], false);
    expect(chips.list).toHaveLength(4); expect(chips.list.every(c => c.size <= 2)).toBe(true); // a shot chips the scenery
    const debris = new Particles(); debris.fromEvents([{ type: 'break', x: 0, y: 0 }], false);
    expect(debris.list.length).toBe(12); // a prop breaks: a bigger burst of debris
    p.fromEvents([{ type: 'kill', x: 0, y: 0 }], false); expect(p.list).toHaveLength(8);
    p.fromEvents([{ type: 'kill', x: 0, y: 0 }], true); expect(p.list).toHaveLength(9);
    for (let i = 0; i < 18; i++) p.update(); expect(p.list).toHaveLength(0);
    p.fromEvents(Array.from({ length: 200 }, () => ({ type: 'kill' as const, x: 0, y: 0 })), false);
    expect(p.list.length).toBe(600);
  });
});

describe('fixed loop', () => {
  function harness(running = () => true) {
    let t = 0, ticks = 0, renders = 0; const queue: FrameRequestCallback[] = [];
    const loop = createFixedLoop({ tick: () => ticks++, render: () => renders++, running, now: () => t,
      raf: cb => { queue.push(cb); return queue.length; }, caf: () => { queue.length = 0; } });
    const frame = (ms: number) => { t += ms; const cb = queue.shift(); cb?.(t); };
    return { loop, frame, get ticks() { return ticks; }, get renders() { return renders; } };
  }
  test('ticks at 60 Hz regardless of frame rate', () => {
    const h = harness(); h.loop.start();
    h.frame(51); expect(h.ticks).toBe(3);
    h.frame(1000 / 60); expect(h.ticks).toBe(4);
  });
  test('a long stall runs at most 5 ticks', () => {
    const h = harness(); h.loop.start(); h.frame(2000);
    expect(h.ticks).toBe(5);
  });
  test('does not tick while not running, but still renders', () => {
    const h = harness(() => false); h.loop.start(); h.frame(500);
    expect(h.ticks).toBe(0); expect(h.renders).toBe(1);
  });
  test('stop() ends the loop', () => {
    const h = harness(); h.loop.start(); h.loop.stop(); h.frame(100);
    expect(h.ticks).toBe(0);
  });
});
