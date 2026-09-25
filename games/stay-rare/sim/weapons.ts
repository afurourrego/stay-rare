import { PLAYER, WEAPONS, WORLD } from './content';
import { damageEnemy, nearestEnemies } from './combat';
import { hurtPlayer } from './player';
import { nextFloat } from './rng';
import { clampToWorld, obstacleAt } from './motion';
import { damageProp, damagePropsInArea } from './props';
import { spawnProjectile } from './spawn';
import { buildGrid, queryGrid } from './spatial';
import type { Stats } from './stats';
import { TICK_HZ, type Enemy, type Obstacle, type Projectile, type RunState, type WeaponId, type WeaponSlot } from './types';

const DEG = Math.PI / 180;
type Fire = (state: RunState, slot: WeaponSlot, stats: Stats) => boolean;

export function extras(slot: WeaponSlot): number {
  return (slot.level >= 3 ? 1 : 0) + (slot.level >= 5 ? 1 : 0) + (slot.level >= 7 ? 1 : 0) + (slot.evolved ? 1 : 0);
}
/** Evolution (milestone 2): double damage, 25% faster, +1 extra. */
export function weaponDamage(slot: WeaponSlot, stats: Stats): number {
  return WEAPONS[slot.id].damage * 1.15 ** (slot.level - 1) * stats.damageMul * (slot.evolved ? 2 : 1);
}
export function weaponCooldownTicks(slot: WeaponSlot, stats: Stats): number {
  return Math.max(6, Math.round(WEAPONS[slot.id].cooldown * TICK_HZ * stats.cooldownMul * (slot.evolved ? 0.75 : 1)));
}
export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
export function orbiters(state: RunState, slot: WeaponSlot, stats: Stats): { x: number; y: number }[] {
  const count = 2 + extras(slot), r = 70 * stats.areaMul, p = state.player;
  return Array.from({ length: count }, (_, i) => {
    const a = state.orbitAngle + i * Math.PI * 2 / count;
    return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
  });
}

const angleTo = (from: { x: number; y: number }, to: { x: number; y: number }) => Math.atan2(to.y - from.y, to.x - from.x);
function shoot(state: RunState, x: number, y: number, angle: number, speed: number,
  o: { damage: number; radius: number; ttl: number; pierce?: number; split?: number; bounces?: number; weapon?: WeaponId }): void {
  spawnProjectile(state, { hostile: false, x, y, vx: Math.cos(angle) * speed / TICK_HZ, vy: Math.sin(angle) * speed / TICK_HZ,
    damage: o.damage, radius: o.radius, ttl: o.ttl, pierce: o.pierce ?? 0, split: o.split ?? 0, bounces: o.bounces ?? 0, weapon: o.weapon });
}
/** Damages every living enemy whose body overlaps the circle (and passes `filter`), and wears down breakable props in it. */
function hitArea(state: RunState, stats: Stats, x: number, y: number, radius: number, damage: number, filter?: (t: { x: number; y: number }) => boolean): void {
  damagePropsInArea(state, x, y, radius, damage, filter);
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const r = radius + e.radius;
    if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r * r && (!filter || filter(e))) damageEnemy(state, e, damage, stats);
  }
}

export const FIRE: Record<WeaponId, Fire> = {
  boneBolt(state, slot, stats) {
    const p = state.player, targets = nearestEnemies(state, p.x, p.y, 1 + extras(slot), 700);
    for (const t of targets) shoot(state, p.x, p.y, angleTo(p, t), 400, { damage: weaponDamage(slot, stats), radius: 6, ttl: 90, pierce: slot.evolved ? 2 : 0, weapon: 'boneBolt' });
    return targets.length > 0;
  },
  maskWave(state, slot, stats) {
    const p = state.player, n = extras(slot), [t] = nearestEnemies(state, p.x, p.y, 1, 400);
    const angle = t ? angleTo(p, t) : Math.atan2(p.facingY, p.facingX);
    const spread = (70 + 20 * n) * DEG, range = (140 + 20 * n) * stats.areaMul;
    hitArea(state, stats, p.x, p.y, range, weaponDamage(slot, stats), e => Math.abs(angleDiff(Math.atan2(e.y - p.y, e.x - p.x), angle)) <= spread / 2);
    state.effects.push({ kind: 'wave', x: p.x, y: p.y, angle, size: range, spread, ttl: 12, damage: 0 });
    return true;
  },
  kinOrbit(state, slot, stats) {
    for (const o of orbiters(state, slot, stats)) hitArea(state, stats, o.x, o.y, 14, weaponDamage(slot, stats));
    return true;
  },
  splitCell(state, slot, stats) {
    const p = state.player, [t] = nearestEnemies(state, p.x, p.y, 1, 700);
    if (!t) return false;
    shoot(state, p.x, p.y, angleTo(p, t), 360, { damage: weaponDamage(slot, stats), radius: 7, ttl: 90, split: 2 + extras(slot), weapon: 'splitCell' });
    return true;
  },
  offsetShot(state, slot, stats) {
    const p = state.player, count = 2 + extras(slot), [t] = nearestEnemies(state, p.x, p.y, 1, 700);
    const base = t ? angleTo(p, t) : Math.atan2(p.facingY, p.facingX);
    const jitter = (slot.volley % 2 === 0 ? 8 : -8) * DEG;
    slot.volley++;
    for (let i = 0; i < count; i++) shoot(state, p.x, p.y, base + jitter + (-25 + 50 * i / (count - 1)) * DEG, 420, { damage: weaponDamage(slot, stats), radius: 5, ttl: 70, weapon: 'offsetShot' });
    return true;
  },
  signalPulse(state, slot, stats) {
    const p = state.player, radius = (60 + 12 * extras(slot)) * stats.areaMul;
    hitArea(state, stats, p.x, p.y, radius, weaponDamage(slot, stats));
    state.effects.push({ kind: 'pulse', x: p.x, y: p.y, angle: 0, size: radius, spread: 0, ttl: 8, damage: 0 });
    return true;
  },
  // Milestone 2 weapons (Task 12). Never offered while the run's milestone is 1.
  driftMines(state, slot, stats) {
    const p = state.player;
    if (!p.moving) return false;
    if (state.mines.length >= 3 + extras(slot)) state.mines.shift();
    state.mines.push({ x: p.x, y: p.y, ttl: 600, damage: weaponDamage(slot, stats), radius: 40 * stats.areaMul });
    return true;
  },
  quakeStamp(state, slot, stats) {
    const p = state.player, n = extras(slot), radius = (100 + 15 * n) * stats.areaMul, push = 40 + 10 * n;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > radius + e.radius) continue;
      damageEnemy(state, e, weaponDamage(slot, stats), stats);
      if (!e.boss && d > 0) {
        e.x = clampToWorld(e.x + dx / d * push, e.radius, WORLD.width);
        e.y = clampToWorld(e.y + dy / d * push, e.radius, WORLD.height);
      }
    }
    damagePropsInArea(state, p.x, p.y, radius, weaponDamage(slot, stats));
    state.effects.push({ kind: 'stamp', x: p.x, y: p.y, angle: 0, size: radius, spread: 0, ttl: 10, damage: 0 });
    return true;
  },
  glitterBounce(state, slot, stats) {
    const p = state.player, [t] = nearestEnemies(state, p.x, p.y, 1, 700);
    if (!t) return false;
    shoot(state, p.x, p.y, angleTo(p, t), 380, { damage: weaponDamage(slot, stats), radius: 6, ttl: 120, bounces: 2 + extras(slot), weapon: 'glitterBounce' });
    return true;
  },
  voidBeam(state, slot, stats) {
    const p = state.player, size = 400 * stats.areaMul, [t] = nearestEnemies(state, p.x, p.y, 1, size);
    state.effects.push({ kind: 'beam', x: p.x, y: p.y, angle: t ? angleTo(p, t) : Math.atan2(p.facingY, p.facingX), size, spread: 0,
      ttl: Math.round((1 + 0.3 * extras(slot)) * TICK_HZ), damage: weaponDamage(slot, stats) });
    return true;
  },
};

export function fireWeapons(state: RunState, stats: Stats): void {
  state.orbitAngle += 3 / TICK_HZ;
  for (const slot of state.weapons) {
    slot.cd--;
    if (slot.cd > 0) continue;
    const fired = FIRE[slot.id](state, slot, stats);
    slot.cd = fired ? weaponCooldownTicks(slot, stats) : 6;
    if (fired) state.events.push({ type: 'shoot', x: state.player.x, y: state.player.y });
  }
}

function onHit(state: RunState, b: Projectile, e: Enemy): void {
  if (b.split > 0) {
    const base = nextFloat(state.rng) * Math.PI * 2;
    for (let i = 0; i < b.split; i++) {
      const a = base + i * Math.PI * 2 / b.split;
      spawnProjectile(state, { hostile: false, x: e.x, y: e.y, vx: Math.cos(a) * 300 / TICK_HZ, vy: Math.sin(a) * 300 / TICK_HZ,
        damage: b.damage * 0.5, radius: 5, ttl: 40, pierce: 0, split: 0, bounces: 0, hits: [e.id], weapon: b.weapon });
    }
    b.ttl = 0;
    return;
  }
  if (b.bounces > 0) {
    const [next] = nearestEnemies(state, e.x, e.y, 1, 220, b.hits);
    if (next) {
      const a = Math.atan2(next.y - e.y, next.x - e.x), speed = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed; b.bounces--;
      return;
    }
    b.ttl = 0;
    return;
  }
  if (b.pierce > 0) { b.pierce--; return; }
  b.ttl = 0;
}

/** A Split Cell that meets a prop still splits: fragments fan out (±50°) away from it, from where the cell last flew clear. */
function splitOffWall(state: RunState, b: Projectile, wall: { x: number; y: number }): void {
  const x = b.x - b.vx, y = b.y - b.vy, normal = Math.atan2(y - wall.y, x - wall.x);
  for (let i = 0; i < b.split; i++) {
    const a = normal + (b.split === 1 ? 0 : (-50 + 100 * i / (b.split - 1)) * DEG);
    spawnProjectile(state, { hostile: false, x, y, vx: Math.cos(a) * 300 / TICK_HZ, vy: Math.sin(a) * 300 / TICK_HZ,
      damage: b.damage * 0.5, radius: 5, ttl: 40, pierce: 0, split: 0, bounces: 0, weapon: b.weapon });
  }
}

export function updateProjectiles(state: RunState, stats: Stats): void {
  const grid = buildGrid(state.enemies), near: number[] = [], p = state.player;
  for (const b of state.projectiles) {
    if (b.ttl <= 0) continue;
    b.x += b.vx; b.y += b.vy; b.ttl--;
    if (b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height) { b.ttl = 0; continue; }
    // Solid scenery stops every shot, yours and the glitches' (it is cover both ways).
    const wall = obstacleAt(b, b.radius, state.obstacles);
    if (wall) {
      b.ttl = 0; state.events.push({ type: 'block', x: b.x, y: b.y });
      if (!b.hostile && b.split > 0) splitOffWall(state, b, wall);
      const prop = b.hostile ? undefined : state.breakables.find(p => p.obstacle === wall);
      if (prop) damageProp(state, prop, b.damage);
      continue;
    }
    if (b.hostile) {
      const r = b.radius + PLAYER.radius;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < r * r) { hurtPlayer(state, b.damage, stats); b.ttl = 0; }
      continue;
    }
    queryGrid(grid, b.x, b.y, b.radius + 48, near);
    for (const i of near) {
      const e = state.enemies[i];
      if (!e || e.hp <= 0 || b.hits.includes(e.id)) continue;
      const r = b.radius + e.radius;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > r * r) continue;
      damageEnemy(state, e, b.damage, stats);
      b.hits.push(e.id);
      onHit(state, b, e);
      break;
    }
  }
}

export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** First solid prop along a ray (unit direction ux, uy) within `len`, and the distance to its edge. */
export function rayToObstacle(x: number, y: number, ux: number, uy: number, len: number, obstacles: readonly Obstacle[]): { dist: number; hit: Obstacle | null } {
  let dist = len, hit: Obstacle | null = null;
  for (const o of obstacles) {
    const ox = o.x - x, oy = o.y - y, along = ox * ux + oy * uy;
    if (along < 0 || along - o.r > dist) continue;
    const off2 = ox * ox + oy * oy - along * along;
    if (off2 > o.r * o.r) continue;
    const d = Math.max(0, along - Math.sqrt(o.r * o.r - off2));
    if (d < dist) { dist = d; hit = o; }
  }
  return { dist, hit };
}

export function updateMines(state: RunState, stats: Stats): void {
  for (const m of state.mines) {
    if (m.ttl <= 0) continue;
    m.ttl--;
    const trigger = state.enemies.some(e => e.hp > 0 && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 <= (16 + e.radius) ** 2);
    if (!trigger) continue;
    hitArea(state, stats, m.x, m.y, m.radius, m.damage);
    state.effects.push({ kind: 'stamp', x: m.x, y: m.y, angle: 0, size: m.radius, spread: 0, ttl: 8, damage: 0 });
    m.ttl = 0;
  }
}

/** Beams follow the Friend and keep the angle they fired at (the nearest glitch), stop at the first solid prop, and deal their damage every 6 ticks along the line (and to that prop). */
export function updateBeams(state: RunState, stats: Stats): void {
  const p = state.player;
  for (const f of state.effects) {
    if (f.kind !== 'beam' || f.ttl <= 0) continue;
    f.x = p.x; f.y = p.y;
    const ux = Math.cos(f.angle), uy = Math.sin(f.angle), { dist, hit } = rayToObstacle(f.x, f.y, ux, uy, f.size, state.obstacles);
    f.reach = dist;
    if (f.ttl % 6 !== 0) continue;
    const bx = f.x + ux * dist, by = f.y + uy * dist;
    for (const e of state.enemies) if (e.hp > 0 && distToSegment(e.x, e.y, f.x, f.y, bx, by) <= 10 + e.radius) damageEnemy(state, e, f.damage, stats);
    const prop = hit && state.breakables.find(b => b.obstacle === hit);
    if (prop) damageProp(state, prop, f.damage);
  }
}
