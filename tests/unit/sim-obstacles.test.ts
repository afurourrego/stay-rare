import { describe, expect, test } from 'vitest';
import { WORLD } from '../../games/stay-rare/sim/content';
import { updateEnemies } from '../../games/stay-rare/sim/enemies';
import { SOLID, decorLayout, obstaclesFor } from '../../games/stay-rare/sim/layout';
import { movePlayer } from '../../games/stay-rare/sim/player';
import { spawnEnemy, spawnProjectile } from '../../games/stay-rare/sim/spawn';
import { updateProjectiles } from '../../games/stay-rare/sim/weapons';
import { computeStats } from '../../games/stay-rare/sim/stats';
import { freshRun } from '../helpers/state';

const clear = (x: number, y: number, r: number, o: { x: number; y: number; r: number }) => Math.hypot(x - o.x, y - o.y) >= o.r + r - 0.01;

describe('solid scenery', () => {
  test('obstacles are the solid props of the run layout, deterministic by seed', () => {
    const obs = obstaclesFor(21);
    expect(obs).toEqual(obstaclesFor(21));
    const solidItems = decorLayout(21).filter(i => i.type in SOLID);
    expect(obs).toHaveLength(solidItems.length);
    expect(obs.length).toBeGreaterThan(20);
    expect(obs.every(o => o.r > 0)).toBe(true);
  });
  test('flowers, reeds and grass are not solid', () => {
    for (const t of ['flower', 'reeds', 'grass', 'tuft', 'pebble']) expect(t in SOLID).toBe(false);
  });
  test('the run keeps its obstacles and the start area is clear', () => {
    const s = freshRun(0, 1, 21);
    expect(s.obstacles).toEqual(obstaclesFor(21));
    expect(s.obstacles.every(o => clear(WORLD.width / 2, WORLD.height / 2, 16, o))).toBe(true);
  });
});

describe('collision', () => {
  test('the player cannot walk through an obstacle and slides along it', () => {
    const s = freshRun(0, 1, 21), st = computeStats(s);
    s.obstacles = [{ x: s.player.x + 60, y: s.player.y + 4, r: 20 }];
    for (let i = 0; i < 120; i++) movePlayer(s, { dx: 1, dy: 0 }, st);
    expect(clear(s.player.x, s.player.y, 16, s.obstacles[0])).toBe(true);
    expect(s.player.x).toBeGreaterThan(s.obstacles[0].x);
  });
  test('glitches go around obstacles instead of through them', () => {
    const s = freshRun(0, 1, 21), st = computeStats(s);
    s.player.hp = 1e9;
    s.obstacles = [{ x: s.player.x + 150, y: s.player.y, r: 30 }];
    const e = spawnEnemy(s, 'mote', s.player.x + 300, s.player.y + 2);
    for (let i = 0; i < 400; i++) { updateEnemies(s, st); expect(clear(e.x, e.y, e.radius, s.obstacles[0])).toBe(true); }
    expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeLessThan(60);
  });
});

describe('shots and scenery', () => {
  const fly = (s: ReturnType<typeof freshRun>, ticks: number) => {
    const st = computeStats(s); let blocked = 0;
    for (let i = 0; i < ticks; i++) { s.events = []; updateProjectiles(s, st); blocked += s.events.filter(e => e.type === 'block').length; }
    return blocked;
  };
  const shot = (s: ReturnType<typeof freshRun>, hostile: boolean, x: number, y: number, vx: number) =>
    spawnProjectile(s, { hostile, x, y, vx, vy: 0, damage: 10, radius: 6, ttl: 90, pierce: 5, split: 0, bounces: 0 });
  test('a shot that meets a solid prop stops there; a glitch behind it is safe', () => {
    const s = freshRun(0, 1, 21);
    s.obstacles = [{ x: s.player.x + 100, y: s.player.y, r: 20 }];
    const e = spawnEnemy(s, 'mote', s.player.x + 200, s.player.y), hp = e.hp;
    shot(s, false, s.player.x, s.player.y, 6);
    expect(fly(s, 60)).toBe(1);
    expect(e.hp).toBe(hp);
    expect(s.projectiles.every(b => b.ttl <= 0)).toBe(true);
  });
  test('glitch shots are blocked too: scenery is cover', () => {
    const s = freshRun(0, 1, 21), hp = s.player.hp;
    s.obstacles = [{ x: s.player.x + 100, y: s.player.y, r: 20 }];
    shot(s, true, s.player.x + 200, s.player.y, -6);
    expect(fly(s, 60)).toBe(1);
    expect(s.player.hp).toBe(hp);
  });
  test('with a clear line the shot still lands', () => {
    const s = freshRun(0, 1, 21);
    s.obstacles = [{ x: s.player.x + 100, y: s.player.y + 80, r: 20 }];
    const e = spawnEnemy(s, 'mote', s.player.x + 200, s.player.y), hp = e.hp;
    shot(s, false, s.player.x, s.player.y, 6);
    expect(fly(s, 60)).toBe(0);
    expect(e.hp).toBeLessThan(hp);
  });
});

describe('split cell on scenery', () => {
  test('a Split Cell that meets a prop still splits: its fragments fan out away from it and keep flying', () => {
    const s = freshRun(0, 1, 21), st = computeStats(s);
    s.obstacles = [{ x: s.player.x + 100, y: s.player.y, r: 20 }];
    spawnProjectile(s, { hostile: false, x: s.player.x, y: s.player.y, vx: 6, vy: 0, damage: 10, radius: 7, ttl: 90, pierce: 0, split: 3, bounces: 0, weapon: 'splitCell' });
    for (let i = 0; i < 20; i++) updateProjectiles(s, st);
    const frags = s.projectiles.filter(b => b.ttl > 0);
    expect(frags).toHaveLength(3);
    expect(frags.every(b => b.vx < 0 && b.split === 0 && b.weapon === 'splitCell')).toBe(true); // back, away from the prop
    for (let i = 0; i < 5; i++) updateProjectiles(s, st);
    expect(s.projectiles.filter(b => b.ttl > 0)).toHaveLength(3);
  });
});
