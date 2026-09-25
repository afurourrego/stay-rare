import { createRun } from '../../games/stay-rare/sim/run';
import type { FamilyId, Milestone } from '../../games/stay-rare/sim/types';

export const FAMILY = { skeleton: 0, mask: 1, family: 2, cellular: 3, asymmetry: 4, hoverer: 5, colossus: 6, sparkling: 7, hollow: 8 } as const satisfies Record<string, FamilyId>;
export function freshRun(familyId: FamilyId = FAMILY.skeleton, milestone: Milestone = 1, seed = 1) { return createRun(seed, familyId, milestone); }
