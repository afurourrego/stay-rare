import type { Traits } from './traits';
export const TICK_HZ = 60;

export type Milestone = 1 | 2;
export type FamilyId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const WEAPON_IDS = ['boneBolt', 'maskWave', 'kinOrbit', 'splitCell', 'offsetShot', 'signalPulse',
  'driftMines', 'quakeStamp', 'glitterBounce', 'voidBeam'] as const;
export type WeaponId = typeof WEAPON_IDS[number];
export const PASSIVE_IDS = ['swiftPixel', 'thickOutline', 'magnet', 'overclock', 'sharpEdge', 'wideFrame'] as const;
export type PassiveId = typeof PASSIVE_IDS[number];
export type EnemyKind = 'mote' | 'swarm' | 'block' | 'scanline' | 'splitter' | 'blinker';
export type BossKind = 'bigStatic' | 'brokenGlyph' | 'deadPixelGrid' | 'corruptor';

/** Movement input, each axis in [-1, 1]; the recorder quantizes it to multiples of 1/127. */
export type InputFrame = Readonly<{ dx: number; dy: number }>;
export type Rng = { s: number };
export type Rarity = 'common' | 'rare' | 'legendary';
export type Card = Readonly<{
  kind: 'weapon' | 'passive' | 'heal' | 'evolution';
  id: WeaponId | PassiveId | null; rarity: Rarity; levels: number; isNew: boolean;
}>;

export type WeaponSlot = { id: WeaponId; level: number; cd: number; evolved: boolean; volley: number };
export type PassiveSlot = { id: PassiveId; level: number };
export type Player = { x: number; y: number; hp: number; facingX: number; facingY: number; moving: boolean; invuln: number };
export type Enemy = {
  id: number; kind: EnemyKind | 'boss'; boss: BossKind | null; x: number; y: number;
  hp: number; maxHp: number; speed: number; damage: number; xp: number; radius: number;
  t: number; mode: number; vx: number; vy: number;
};
export type Projectile = {
  id: number; hostile: boolean; x: number; y: number; vx: number; vy: number; damage: number; radius: number;
  ttl: number; pierce: number; split: number; bounces: number; hits: number[];
  /** Which weapon fired it (presentation only; never read by the sim). */
  weapon?: WeaponId;
};
export type Mine = { x: number; y: number; ttl: number; damage: number; radius: number };
export type Wall = { x: number; y: number; w: number; h: number; ttl: number };
export type EffectKind = 'wave' | 'pulse' | 'beam' | 'stamp' | 'telegraph';
/** Visual and timed effects. `damage` is used only by beams (0 for visuals). */
export type Effect = { kind: EffectKind; x: number; y: number; angle: number; size: number; spread: number; ttl: number; damage: number;
  /** Beams only: how far the beam reaches this tick (it stops at the first solid prop). */
  reach?: number };
export type Gem = { x: number; y: number; value: number };
/** Solid scenery: a collision circle (world px). */
export type Obstacle = Readonly<{ x: number; y: number; r: number; /** index in the run's decor layout */ id?: number }>;
/** A solid prop that shots and area weapons can break (crates, terminals). */
export type Breakable = { id: number; obstacle: Obstacle; hp: number };
/** A health patch dropped by a broken prop: walk over it to heal. */
export type Patch = { x: number; y: number };
/** Events for presentation (particles, sounds); the sim never reads them. */
export type GameEvent = Readonly<{ type: 'kill' | 'hurt' | 'levelUp' | 'capsule' | 'bossSpawn' | 'bossDown' | 'shoot' | 'hit' | 'gem' | 'telegraph' | 'block' | 'break' | 'heal'; x: number; y: number }>;
/** Compared by bosses defeated, then ticks survived. */
export type Score = Readonly<{ bosses: number; ticks: number }>;

export type RunState = {
  seed: number; familyId: FamilyId; milestone: Milestone; rng: Rng;
  tick: number; cycle: number; phase: 'wave' | 'boss'; phaseTick: number; spawnAcc: number; bossesDefeated: number;
  player: Player; weapons: WeaponSlot[]; passives: PassiveSlot[];
  xp: number; level: number; pendingLevels: number; capsule: Card[] | null; over: boolean;
  enemies: Enemy[]; projectiles: Projectile[]; gems: Gem[]; mines: Mine[]; walls: Wall[]; effects: Effect[]; obstacles: Obstacle[];
  breakables: Breakable[]; broken: number[]; patches: Patch[];
  /** Your Friend's own traits, read from its on-chain art (sim/traits.ts). */
  traits: Traits;
  events: GameEvent[]; nextId: number; orbitAngle: number;
};
