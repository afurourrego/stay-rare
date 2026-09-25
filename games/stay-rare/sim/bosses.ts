import { BOSSES, DIRECTOR, WORLD } from './content';
import { chase, clampToWorld } from './motion';
import { nextFloat } from './rng';
import { spawnEnemy, spawnProjectile } from './spawn';
import { TICK_HZ, type Enemy, type RunState } from './types';

function raiseWalls(state: RunState): void {
  const p = state.player;
  for (const side of [-1, 1]) {
    const vertical = nextFloat(state.rng) < 0.5;
    state.walls.push(vertical
      ? { x: p.x + side * 140 - 12, y: p.y - 110, w: 24, h: 220, ttl: 360 }
      : { x: p.x - 110, y: p.y + side * 140 - 12, w: 220, h: 24, ttl: 360 });
  }
}

export function updateBoss(state: RunState, e: Enemy): void {
  const p = state.player, def = BOSSES[e.boss!];
  const bulletDamage = def.bullet * (1 + DIRECTOR.damagePerCycle * state.cycle);
  const bullet = (angle: number, speed: number) => spawnProjectile(state, { hostile: true, x: e.x, y: e.y,
    vx: Math.cos(angle) * speed / TICK_HZ, vy: Math.sin(angle) * speed / TICK_HZ, damage: bulletDamage, radius: 6, ttl: 300, pierce: 0, split: 0, bounces: 0 });
  e.t++;
  switch (e.boss) {
    case 'bigStatic':
      if (e.mode === 0) {
        chase(e, p, def.speed);
        if (e.t >= 180) {
          const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
          e.mode = 1; e.t = 0; e.vx = (p.x - e.x) / d; e.vy = (p.y - e.y) / d;
          state.events.push({ type: 'telegraph', x: e.x, y: e.y });
          state.effects.push({ kind: 'telegraph', x: e.x, y: e.y, angle: Math.atan2(e.vy, e.vx), size: 420 * 40 / TICK_HZ, spread: e.radius * 2, ttl: 36, damage: 0 });
        }
      } else if (e.mode === 1) { if (e.t >= 36) { e.mode = 2; e.t = 0; } }
      else { e.x += e.vx * 420 / TICK_HZ; e.y += e.vy * 420 / TICK_HZ; if (e.t >= 40) { e.mode = 0; e.t = 0; } }
      break;
    case 'brokenGlyph':
      chase(e, p, def.speed);
      if (e.t % 120 === 0) for (let i = 0; i < 12; i++) bullet(i * Math.PI / 6, 140);
      if (e.hp < e.maxHp / 2 && e.t % 10 === 0) bullet(e.t * 0.3, 140);
      break;
    case 'deadPixelGrid':
      chase(e, p, def.speed);
      if (e.t % 360 === 0) raiseWalls(state);
      if (e.t % 300 === 0) for (let i = 0; i < 8 && state.enemies.length < DIRECTOR.maxEnemies + 1; i++) {
        spawnEnemy(state, 'mote', e.x + Math.cos(i * Math.PI / 4) * 70, e.y + Math.sin(i * Math.PI / 4) * 70);
      }
      break;
    case 'corruptor': {
      // Your Friend, inverted: chases (> 66%), then keeps range with 3-bullet fans (33–66%), then rushes and fires faster (< 33%).
      const frac = e.hp / e.maxHp, fast = frac < 1 / 3, speed = def.speed * (fast ? 1.33 : 1);
      if (frac > 2 / 3) { chase(e, p, speed); break; }
      const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
      if (fast || d > 280) chase(e, p, speed);
      else if (d < 240) { e.x -= (p.x - e.x) / d * speed / TICK_HZ; e.y -= (p.y - e.y) / d * speed / TICK_HZ; }
      if (e.t % (fast ? 40 : 60) === 0) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        for (const offset of [-0.2, 0, 0.2]) bullet(a + offset, 180);
      }
      break;
    }
  }
  e.x = clampToWorld(e.x, e.radius, WORLD.width);
  e.y = clampToWorld(e.y, e.radius, WORLD.height);
}
