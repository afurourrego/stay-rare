import { PLAYER, WORLD } from './content';
import { updateBoss } from './bosses';
import { chase, clampToWorld, pushOut } from './motion';
import { hurtPlayer } from './player';
import { nextFloat } from './rng';
import { spawnProjectile } from './spawn';
import { buildGrid, queryGrid } from './spatial';
import type { Stats } from './stats';
import { TICK_HZ, type Enemy, type RunState } from './types';

function moveRegular(state: RunState, e: Enemy): void {
  const p = state.player;
  e.t++;
  if (e.kind === 'scanline') {
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, v = e.speed / TICK_HZ;
    if (d > 240) { e.x += dx / d * v; e.y += dy / d * v; }
    else if (d < 200) { e.x -= dx / d * v; e.y -= dy / d * v; }
    else { e.x += -dy / d * v; e.y += dx / d * v; }
    if (e.t % 150 === 0) spawnProjectile(state, { hostile: true, x: e.x, y: e.y, vx: dx / d * 160 / TICK_HZ, vy: dy / d * 160 / TICK_HZ,
      damage: e.damage, radius: 5, ttl: 240, pierce: 0, split: 0, bounces: 0 });
  } else if (e.kind === 'blinker' && e.t % 180 === 0) {
    const a = nextFloat(state.rng) * Math.PI * 2, r = 80 + nextFloat(state.rng) * 80;
    e.x = p.x + Math.cos(a) * r; e.y = p.y + Math.sin(a) * r;
  } else chase(e, p, e.speed);
  e.x = clampToWorld(e.x, e.radius, WORLD.width);
  e.y = clampToWorld(e.y, e.radius, WORLD.height);
}

function separate(state: RunState): void {
  const grid = buildGrid(state.enemies), near: number[] = [];
  state.enemies.forEach((e, i) => {
    queryGrid(grid, e.x, e.y, e.radius + 48, near);
    for (const j of near) {
      if (j <= i) continue;
      const o = state.enemies[j], dx = o.x - e.x, dy = o.y - e.y, min = e.radius + o.radius, d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2), push = (min - d) / 2, ux = dx / d, uy = dy / d;
      if (!e.boss) { e.x -= ux * push; e.y -= uy * push; }
      if (!o.boss) { o.x += ux * push; o.y += uy * push; }
    }
  });
}

export function updateEnemies(state: RunState, stats: Stats): void {
  const p = state.player;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (e.boss) updateBoss(state, e); else moveRegular(state, e);
    const rr = e.radius + PLAYER.radius;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr) hurtPlayer(state, e.damage, stats);
  }
  separate(state);
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    pushOut(e, e.radius, state.obstacles);
    e.x = clampToWorld(e.x, e.radius, WORLD.width); e.y = clampToWorld(e.y, e.radius, WORLD.height);
  }
}
