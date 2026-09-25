import type { BossKind, EnemyKind, FamilyId, Milestone, PassiveId, WeaponId } from './types';

/** Milestone 2 shipped (Task 15): rare-family weapons, evolutions, Splitter, Blinker and The Corruptor are live. */
export const CONTENT_MILESTONE: Milestone = 2;

export const WORLD = { width: 3200, height: 2400 } as const;
export const MAX_GEMS = 600;
export const PLAYER = { hp: 100, speed: 150, pickup: 64, radius: 16, invulnTicks: 30, crit: 0.05, critMul: 2, maxWeapons: 6, maxPassives: 6 } as const;

export type FamilyMods = Partial<{ damage: number; cooldown: number; xp: number; regen: number; crit: number; speed: number; hp: number; area: number; invulnTicks: number }>;
export type FamilyDef = Readonly<{ name: string; weapon: WeaponId; passive: string; mods: FamilyMods }>;
/** Index = FriendSDK familyId (GENERATION_FAMILY_NAMES order). Traits are ours; there is no official family lore. */
export const FAMILIES: readonly FamilyDef[] = [
  { name: 'Skeleton', weapon: 'boneBolt', passive: '+10% damage', mods: { damage: 1.1 } },
  { name: 'Mask', weapon: 'maskWave', passive: '−7% cooldown', mods: { cooldown: 0.93 } },
  { name: 'Family', weapon: 'kinOrbit', passive: '+35% XP', mods: { xp: 1.35 } },
  { name: 'Cellular', weapon: 'splitCell', passive: 'Regenerates 0.2 HP/s', mods: { regen: 0.2 } },
  { name: 'Asymmetry', weapon: 'offsetShot', passive: '+10% crit chance', mods: { crit: 0.1 } },
  { name: 'Hoverer', weapon: 'driftMines', passive: '+20% speed', mods: { speed: 1.2 } },
  { name: 'Colossus', weapon: 'quakeStamp', passive: '+40% HP, −10% speed', mods: { hp: 1.4, speed: 0.9 } },
  { name: 'Sparkling', weapon: 'glitterBounce', passive: '+10% area', mods: { area: 1.1 } },
  { name: 'Hollow', weapon: 'voidBeam', passive: '1 s invulnerable after a hit', mods: { invulnTicks: 60 } },
];

export type WeaponDef = Readonly<{ name: string; milestone: Milestone; cooldown: number; damage: number; pair: PassiveId; evolvedName: string; description: string }>;
export const WEAPONS: Readonly<Record<WeaponId, WeaponDef>> = {
  boneBolt: { name: 'Bone Bolt', milestone: 1, cooldown: 0.8, damage: 14, pair: 'sharpEdge', evolvedName: 'Bone Storm', description: 'Fires at the nearest glitch' },
  maskWave: { name: 'Mask Wave', milestone: 1, cooldown: 1.4, damage: 9, pair: 'wideFrame', evolvedName: 'Mask Eclipse', description: 'Sweeps a cone toward the nearest glitch' },
  kinOrbit: { name: 'Kin Orbit', milestone: 1, cooldown: 0.5, damage: 28, pair: 'overclock', evolvedName: 'Kin Halo', description: 'Pixels orbit around you' },
  splitCell: { name: 'Split Cell', milestone: 1, cooldown: 1.1, damage: 11, pair: 'magnet', evolvedName: 'Mitosis', description: 'Splits on impact' },
  offsetShot: { name: 'Offset Shot', milestone: 1, cooldown: 0.9, damage: 12, pair: 'swiftPixel', evolvedName: 'Asym Barrage', description: 'Uneven shots at the nearest glitch' },
  signalPulse: { name: 'Signal Pulse', milestone: 1, cooldown: 0.5, damage: 4, pair: 'thickOutline', evolvedName: 'Signal Tower', description: 'Damages everything close to you' },
  driftMines: { name: 'Drift Mines', milestone: 2, cooldown: 1.2, damage: 20, pair: 'swiftPixel', evolvedName: 'Minefield', description: 'Leaves mines as you move' },
  quakeStamp: { name: 'Quake Stamp', milestone: 2, cooldown: 2.5, damage: 25, pair: 'thickOutline', evolvedName: 'Tectonic', description: 'Slams and pushes glitches away' },
  glitterBounce: { name: 'Glitter Bounce', milestone: 2, cooldown: 1.3, damage: 7, pair: 'wideFrame', evolvedName: 'Glitter Storm', description: 'Bounces between glitches' },
  voidBeam: { name: 'Void Beam', milestone: 2, cooldown: 3, damage: 6, pair: 'sharpEdge', evolvedName: 'Null Line', description: 'A beam that pierces every glitch in line' },
};
export const WEAPON_MAX_LEVEL = 8;

export type PassiveDef = Readonly<{ name: string; perLevel: number; description: string }>;
export const PASSIVES: Readonly<Record<PassiveId, PassiveDef>> = {
  swiftPixel: { name: 'Swift Pixel', perLevel: 0.08, description: '+8% speed per level' },
  thickOutline: { name: 'Thick Outline', perLevel: 20, description: '+20 max HP per level' },
  magnet: { name: 'Magnet', perLevel: 0.25, description: '+25% pickup range per level' },
  overclock: { name: 'Overclock', perLevel: 0.06, description: '−6% cooldown per level' },
  sharpEdge: { name: 'Sharp Edge', perLevel: 0.08, description: '+8% damage per level' },
  wideFrame: { name: 'Wide Frame', perLevel: 0.08, description: '+8% area per level' },
};
export const PASSIVE_MAX_LEVEL = 5;

export type EnemyDef = Readonly<{ hp: number; speed: number; damage: number; xp: number; radius: number; milestone: Milestone }>;
export const ENEMIES: Readonly<Record<EnemyKind, EnemyDef>> = {
  mote: { hp: 10, speed: 70, damage: 9, xp: 1, radius: 12, milestone: 1 },
  swarm: { hp: 4, speed: 130, damage: 4, xp: 1, radius: 8, milestone: 1 },
  block: { hp: 60, speed: 40, damage: 15, xp: 5, radius: 22, milestone: 1 },
  scanline: { hp: 20, speed: 55, damage: 6, xp: 3, radius: 12, milestone: 1 },
  splitter: { hp: 30, speed: 60, damage: 10, xp: 3, radius: 14, milestone: 2 },
  blinker: { hp: 25, speed: 50, damage: 10, xp: 3, radius: 12, milestone: 2 },
};

export type BossDef = Readonly<{ name: string; hp: number; speed: number; damage: number; bullet: number; radius: number; milestone: Milestone }>;
export const BOSSES: Readonly<Record<BossKind, BossDef>> = {
  bigStatic: { name: 'Big Static', hp: 450, speed: 60, damage: 16, bullet: 0, radius: 40, milestone: 1 },
  brokenGlyph: { name: 'Broken Glyph', hp: 650, speed: 40, damage: 15, bullet: 8, radius: 40, milestone: 1 },
  deadPixelGrid: { name: 'Dead Pixel Grid', hp: 800, speed: 30, damage: 15, bullet: 0, radius: 48, milestone: 1 },
  corruptor: { name: 'The Corruptor', hp: 1500, speed: 90, damage: 20, bullet: 8, radius: 36, milestone: 2 },
};
export const BOSS_ROTATION: readonly BossKind[] = ['bigStatic', 'brokenGlyph', 'deadPixelGrid', 'corruptor'];

export const DIRECTOR = {
  waveSeconds: 75, baseRate: 1.6, cycleRate: 0.35, hpPerCycle: 0.6, damagePerCycle: 0.25, bossHpPerCycle: 0.5,
  bossPhaseRate: 0.5, maxEnemies: 400, spawnDistance: 600, bossDistance: 480, swarmSize: 6, swarmFromSecond: 30, scanlineFromSecond: 20,
} as const;
export const CAPSULE = { commonPct: 70, rarePct: 25, healAmount: 20 } as const;
export const BOSS_REWARD = { healFraction: 0.3 } as const;
/** Health patch from a broken prop: heals a fraction of max HP when you walk over it. */
export const PATCH = { heal: 0.25, reach: 26, dropChance: 0.5 } as const;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number { return 5 + 4 * level + Math.floor(level * level / 2); }

export function startingWeapon(familyId: FamilyId, milestone: Milestone): WeaponId {
  const weapon = FAMILIES[familyId].weapon;
  return WEAPONS[weapon].milestone <= milestone ? weapon : 'signalPulse';
}

export function familyInfo(familyId: FamilyId, milestone: Milestone) {
  const family = FAMILIES[familyId], weapon = WEAPONS[startingWeapon(familyId, milestone)];
  return { name: family.name, weaponName: weapon.name, weaponDescription: weapon.description, passive: family.passive } as const;
}
