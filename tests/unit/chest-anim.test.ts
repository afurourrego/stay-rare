import { describe, expect, test } from 'vitest';
import { CHEST_H, CHEST_SPRITES, CHEST_T, CHEST_W, chestCues, revealCues, chestFrame, chestPixels, closedFrame } from '../../games/stay-rare/render/chestAnim';

describe('chest opening timeline (presentation only)', () => {
  test('anticipation: the shake grows and the lock blinks', () => {
    const early = chestFrame(50, 'poolEntry', false), late = chestFrame(CHEST_T.shake - 50, 'poolEntry', false);
    expect(early.phase).toBe('shake');
    expect(late.shakeAmp).toBeGreaterThan(early.shakeAmp);
    const blinks = new Set(Array.from({ length: 12 }, (_, i) => chestFrame(i * 50, 'poolEntry', false).lockLit));
    expect(blinks).toEqual(new Set([true, false]));
    expect(early.lid).toBe(0); expect(early.lock.visible).toBe(true);
  });
  test('unlock: the lock pops up and falls away along an arc', () => {
    const a = chestFrame(CHEST_T.shake + 20, 'poolEntry', false), b = chestFrame(CHEST_T.unlock - 10, 'poolEntry', false);
    expect(a.phase).toBe('unlock');
    expect(a.lock.y).toBeLessThan(0);
    expect(b.lock.x).toBeGreaterThan(a.lock.x);
    expect(chestFrame(CHEST_T.open + 10, 'poolEntry', false).lock.visible).toBe(false);
  });
  test('open: the lid goes through its 4 drawn frames and the light column rises', () => {
    const lids = Array.from({ length: 6 }, (_, i) => chestFrame(CHEST_T.unlock + i * ((CHEST_T.open - CHEST_T.unlock) / 5), 'poolEntry', false).lid);
    expect(lids[0]).toBe(0); expect(lids[lids.length - 1]).toBe(3);
    expect(lids.every((l, i) => i === 0 || l >= lids[i - 1])).toBe(true);
    expect(chestFrame(CHEST_T.open + 100, 'poolEntry', false).light).toBeGreaterThan(chestFrame(CHEST_T.open + 10, 'poolEntry', false).light);
  });
  test('reveal: the prize rises out of the chest; only a free run gets rays and confetti', () => {
    const start = chestFrame(CHEST_T.open + 10, 'freeRun', false), end = chestFrame(CHEST_T.reveal - 10, 'freeRun', false);
    expect(end.item.y).toBeLessThan(start.item.y);
    expect(end.rays).toBe(true); expect(end.confetti).toBe(true);
    const pool = chestFrame(CHEST_T.reveal - 10, 'poolEntry', false);
    expect([pool.rays, pool.confetti]).toEqual([false, false]);
  });
  test('idle after the reveal: the chest stays open and the glow pulses slowly (≤ 1 Hz)', () => {
    const f = chestFrame(CHEST_T.reveal + 5000, 'poolEntry', false);
    expect([f.phase, f.lid, f.item.visible, f.done]).toEqual(['idle', 3, true, true]);
    const pulses = Array.from({ length: 40 }, (_, i) => chestFrame(CHEST_T.reveal + i * 50, 'poolEntry', false).glowHigh);
    const changes = pulses.filter((p, i) => i > 0 && p !== pulses[i - 1]).length;
    expect(changes).toBeLessThanOrEqual(4);
  });
  test('reduced motion jumps straight to the final frame', () => {
    const f = chestFrame(0, 'freeRun', true);
    expect([f.phase, f.lid, f.done, f.shakeAmp]).toEqual(['idle', 3, true, 0]);
  });
});

describe('chest while the draw settles, sounds and pixels', () => {
  test('waiting: closed with the lock on, a small rattle; still under reduced motion', () => {
    const f = closedFrame(300, false);
    expect(f.lid).toBe(0); expect(f.lock.visible).toBe(true); expect(f.item.visible).toBe(false);
    expect(Math.abs(f.shakeX)).toBeLessThanOrEqual(1);
    expect(new Set(Array.from({ length: 20 }, (_, i) => closedFrame(i * 60, false).shakeX)).size).toBeGreaterThan(1);
    expect(new Set(Array.from({ length: 20 }, (_, i) => closedFrame(i * 60, true).shakeX))).toEqual(new Set([0]));
  });
  test('cues fire once each as the clock sweeps: ticks, click, reveal, reward only for a free run', () => {
    const sweep = (kind: 'poolEntry' | 'freeRun') => {
      const out: string[] = [];
      for (let t = 0; t < CHEST_T.reveal + 500; t += 16) out.push(...chestCues(t - 16, t, kind));
      return out;
    };
    const pool = sweep('poolEntry'), free = sweep('freeRun');
    expect(pool.filter(c => c === 'tick').length).toBe(3);
    expect(pool.filter(c => c === 'click')).toHaveLength(1);
    expect(pool.filter(c => c === 'reveal-common')).toHaveLength(1);
    expect(pool).not.toContain('reward'); expect(pool).not.toContain('reveal-legendary');
    expect(free.filter(c => c === 'reveal-legendary')).toHaveLength(1);
    expect(free.filter(c => c === 'reward')).toHaveLength(1);
    expect(pool.indexOf('click')).toBeLessThan(pool.indexOf('reveal-common'));
  });
  test('sprites are rectangular pixel grids', () => {
    for (const [name, rows] of Object.entries(CHEST_SPRITES)) {
      expect(new Set(rows.map(r => r.length)).size, name).toBe(1);
    }
  });
  test('pixels stay on the integer grid inside the canvas; frames differ; a free run shines more', () => {
    for (const t of [0, 300, CHEST_T.shake + 90, CHEST_T.unlock + 120, CHEST_T.open + 200, CHEST_T.reveal + 900]) {
      for (const px of chestPixels(chestFrame(t, 'freeRun', false), 'freeRun')) {
        expect(Number.isInteger(px.x) && Number.isInteger(px.y)).toBe(true);
        expect(px.x >= 0 && px.x < CHEST_W && px.y >= 0 && px.y < CHEST_H).toBe(true);
      }
    }
    const key = (t: number) => chestPixels(chestFrame(t, 'poolEntry', false), 'poolEntry').map(p => `${p.x},${p.y},${p.c}`).join(';');
    expect(key(0)).not.toBe(key(CHEST_T.reveal + 100));
    const lit = (kind: 'poolEntry' | 'freeRun') => chestPixels(chestFrame(CHEST_T.reveal + 100, kind, false), kind).filter(p => p.c === 'signal').length;
    expect(lit('freeRun')).toBeGreaterThan(lit('poolEntry'));
  });
});

test('reduced motion still sounds the reveal (and the free-run reward), once', () => {
  expect(revealCues('poolEntry')).toEqual(['reveal-common']);
  expect(revealCues('freeRun')).toEqual(['reveal-legendary', 'reward']);
});
