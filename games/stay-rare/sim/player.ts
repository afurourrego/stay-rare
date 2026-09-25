import { PLAYER, WORLD, xpToNext } from './content';
import { clampToWorld, pushOut } from './motion';
import type { Stats } from './stats';
import { TICK_HZ, type InputFrame, type RunState, type Wall } from './types';

function circleHitsRect(cx: number, cy: number, r: number, w: Wall): boolean {
  const nx = Math.max(w.x, Math.min(cx, w.x + w.w)), ny = Math.max(w.y, Math.min(cy, w.y + w.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}
export function hitsWall(state: RunState, x: number, y: number): boolean {
  return state.walls.some(w => circleHitsRect(x, y, PLAYER.radius, w));
}

export function movePlayer(state: RunState, input: InputFrame, stats: Stats): void {
  const p = state.player;
  let { dx, dy } = input;
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  p.moving = len > 0.05;
  if (p.moving) { const l = Math.hypot(dx, dy); p.facingX = dx / l; p.facingY = dy / l; }
  const v = stats.speed / TICK_HZ;
  const nx = clampToWorld(p.x + dx * v, PLAYER.radius, WORLD.width);
  if (!hitsWall(state, nx, p.y)) p.x = nx;
  const ny = clampToWorld(p.y + dy * v, PLAYER.radius, WORLD.height);
  if (!hitsWall(state, p.x, ny)) p.y = ny;
  pushOut(p, PLAYER.radius, state.obstacles);
  p.x = clampToWorld(p.x, PLAYER.radius, WORLD.width); p.y = clampToWorld(p.y, PLAYER.radius, WORLD.height);
  if (p.invuln > 0) p.invuln--;
  if (stats.regen > 0) p.hp = Math.min(stats.maxHp, p.hp + stats.regen / TICK_HZ);
}

export function hurtPlayer(state: RunState, amount: number, stats: Stats): void {
  const p = state.player;
  if (p.invuln > 0 || state.over) return;
  p.hp -= amount;
  p.invuln = stats.invulnTicks;
  state.events.push({ type: 'hurt', x: p.x, y: p.y });
}

export function gainXp(state: RunState, amount: number): void {
  state.xp += amount;
  let need = xpToNext(state.level);
  while (state.xp >= need) {
    state.xp -= need;
    state.level++;
    state.pendingLevels++;
    state.events.push({ type: 'levelUp', x: state.player.x, y: state.player.y });
    need = xpToNext(state.level);
  }
}

/** Gems inside the pickup radius fly to the player; touching one grants its XP (× family XP bonus). */
export function collectGems(state: RunState, stats: Stats): void {
  const p = state.player, reach2 = stats.pickup ** 2, stepPx = 420 / TICK_HZ;
  for (let i = state.gems.length - 1; i >= 0; i--) {
    const g = state.gems[i], dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
    if (d2 > reach2) continue;
    const d = Math.sqrt(d2);
    if (d <= 18) {
      gainXp(state, g.value * stats.xpMul);
      state.events.push({ type: 'gem', x: g.x, y: g.y });
      state.gems[i] = state.gems[state.gems.length - 1];
      state.gems.pop();
    } else { g.x += dx / d * stepPx; g.y += dy / d * stepPx; }
  }
}
