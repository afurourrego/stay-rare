import { describe, expect, test } from 'vitest';
import { shotPixels } from '../../games/stay-rare/render/shots';
import { spawnEnemy } from '../../games/stay-rare/sim/spawn';
import { computeStats } from '../../games/stay-rare/sim/stats';
import { FIRE } from '../../games/stay-rare/sim/weapons';
import { freshRun } from '../helpers/state';

const xs = (pts: { x: number }[]) => pts.map(p => p.x);

describe('projectiles remember their weapon (render only)', () => {
  test('Bone Bolt and Split Cell shots are tagged; split children too', () => {
    const s = freshRun(); s.weapons = [{ id: 'boneBolt', level: 1, cd: 0, evolved: false, volley: 0 }];
    spawnEnemy(s, 'mote', s.player.x + 200, s.player.y);
    FIRE.boneBolt(s, s.weapons[0], computeStats(s));
    expect(s.projectiles[0].weapon).toBe('boneBolt');
    FIRE.splitCell(s, { id: 'splitCell', level: 1, cd: 0, evolved: false, volley: 0 }, computeStats(s));
    expect(s.projectiles[1].weapon).toBe('splitCell');
  });
});

describe('shot shapes', () => {
  test('a bone is a stick along its direction with knobs at both ends', () => {
    const right = shotPixels('boneBolt', 0), down = shotPixels('boneBolt', Math.PI / 2);
    expect(Math.max(...xs(right)) - Math.min(...xs(right))).toBeGreaterThan(Math.max(...xs(down)) - Math.min(...xs(down)));
    expect(right.some(p => p.c === 'p')).toBe(true);
  });
  test('an arrow has its signal head in front', () => {
    const pts = shotPixels('offsetShot', 0), head = pts.filter(p => p.c === 'y');
    expect(head.length).toBeGreaterThan(0);
    expect(Math.min(...xs(head))).toBeGreaterThan(Math.min(...xs(pts)));
  });
  test('cells are round with a nucleus; children are smaller', () => {
    const big = shotPixels('splitCell', 0), small = shotPixels('splitCell', 0, true);
    expect(big.some(p => p.x === 0 && p.y === 0 && p.c === 'p')).toBe(true);
    expect(small.length).toBeLessThan(big.length);
  });
  test('every weapon (and unknown shots) gets a shape', () => {
    for (const w of ['boneBolt', 'maskWave', 'kinOrbit', 'splitCell', 'offsetShot', 'signalPulse', 'driftMines', 'quakeStamp', 'glitterBounce', 'voidBeam', undefined] as const)
      expect(shotPixels(w, 1).length, String(w)).toBeGreaterThan(3);
  });
});
