import { BOSSES, DIRECTOR, ENEMIES, WORLD } from './content';
import { clampToWorld } from './motion';
import type { BossKind, Enemy, EnemyKind, Projectile, RunState } from './types';

export function spawnEnemy(state: RunState, kind: EnemyKind, x: number, y: number): Enemy {
  const def = ENEMIES[kind], c = state.cycle, hp = def.hp * (1 + DIRECTOR.hpPerCycle * c);
  const e: Enemy = {
    id: state.nextId++, kind, boss: null,
    x: clampToWorld(x, def.radius, WORLD.width), y: clampToWorld(y, def.radius, WORLD.height),
    hp, maxHp: hp, speed: def.speed, damage: def.damage * (1 + DIRECTOR.damagePerCycle * c), xp: def.xp, radius: def.radius,
    t: 0, mode: 0, vx: 0, vy: 0,
  };
  state.enemies.push(e);
  return e;
}

export function spawnBossEnemy(state: RunState, boss: BossKind, x: number, y: number): Enemy {
  const def = BOSSES[boss], c = state.cycle, hp = def.hp * (1 + DIRECTOR.bossHpPerCycle * c);
  const e: Enemy = {
    id: state.nextId++, kind: 'boss', boss,
    x: clampToWorld(x, def.radius, WORLD.width), y: clampToWorld(y, def.radius, WORLD.height),
    hp, maxHp: hp, speed: def.speed, damage: def.damage * (1 + DIRECTOR.damagePerCycle * c), xp: 0, radius: def.radius,
    t: 0, mode: 0, vx: 0, vy: 0,
  };
  state.enemies.push(e);
  return e;
}

export type NewProjectile = Omit<Projectile, 'id' | 'hits'> & { hits?: number[] };
export function spawnProjectile(state: RunState, p: NewProjectile): void {
  state.projectiles.push({ ...p, id: state.nextId++, hits: p.hits ?? [] });
}
