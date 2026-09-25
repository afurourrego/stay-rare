import { describe, expect, test } from 'vitest';
import { SFX, SFX_FOR_EVENT, Throttle } from '../../games/stay-rare/audio/sfx';
import { spawnEnemy } from '../../games/stay-rare/sim/spawn';
import { step } from '../../games/stay-rare/sim/run';
import { freshRun } from '../helpers/state';

describe('chiptune sfx', () => {
  test('every action sound is defined with a short envelope', () => {
    for (const name of ['shoot', 'hit', 'kill', 'gem', 'hurt', 'telegraph'] as const) {
      expect(SFX[name], name).toBeDefined();
      expect(SFX[name].ms).toBeGreaterThan(0); expect(SFX[name].ms).toBeLessThanOrEqual(450);
    }
  });
  test('throttle: a sound cannot repeat faster than its minimum gap; other sounds are independent', () => {
    const t = new Throttle();
    expect(t.allow('hit', 0)).toBe(true);
    expect(t.allow('hit', SFX.hit.gap - 1)).toBe(false);
    expect(t.allow('kill', 1)).toBe(true);
    expect(t.allow('hit', SFX.hit.gap)).toBe(true);
  });
  test('game events map to sounds', () => {
    expect(SFX_FOR_EVENT.kill).toBe('kill');
    expect(SFX_FOR_EVENT.hurt).toBe('hurt');
    expect(SFX_FOR_EVENT.shoot).toBe('shoot');
    expect(SFX_FOR_EVENT.block).toBe('hit');
    expect(SFX_FOR_EVENT.break).toBe('kill');
    expect(SFX_FOR_EVENT.heal).toBe('heal');
    expect(SFX.heal.ms).toBeLessThanOrEqual(450);
  });
});

describe('sim emits presentation events for sound', () => {
  test('shots, hits and gem pickups raise events (never read by the sim)', () => {
    const s = freshRun(); s.player.hp = 1e9;
    spawnEnemy(s, 'mote', s.player.x + 120, s.player.y);
    const seen = new Set<string>();
    for (let i = 0; i < 240; i++) { step(s, { dx: 0, dy: 0 }); s.events.forEach(e => seen.add(e.type)); if (s.capsule) s.capsule = null; }
    expect(seen.has('shoot')).toBe(true);
    expect(seen.has('hit')).toBe(true);
    expect(seen.has('kill')).toBe(true);
  });
});
