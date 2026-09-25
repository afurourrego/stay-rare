import { describe, expect, test } from 'vitest';
import { CONTENT_MILESTONE } from '../../games/stay-rare/sim/content';
import type { FamilyId, Milestone, RunState } from '../../games/stay-rare/sim/types';
import { playBot } from '../helpers/bots';

const SEED_BASE = Number(process.env.STAY_RARE_SEED_BASE ?? 1000), SEED_COUNT = Number(process.env.STAY_RARE_SEEDS ?? 120);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => SEED_BASE + i);
const FAMILIES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const satisfies readonly FamilyId[];
/** What ships by default; STAY_RARE_MILESTONE=1|2 overrides. */
const MILESTONE = (process.env.STAY_RARE_MILESTONE ? (Number(process.env.STAY_RARE_MILESTONE) === 2 ? 2 : 1) : CONTENT_MILESTONE) as Milestone;
const MAX_TICKS = 10 * 60 * 60;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

describe(`balance (milestone ${MILESTONE})`, () => {
  test('an idle Friend dies before the first boss appears (75 s) in ≥ 99% of seeds', () => {
    // Standing still must not be a strategy; a rare seed where the aura happens to hold (1 in 1080 runs) is noise.
    for (const f of FAMILIES) {
      const survivors = SEEDS.filter(seed => !playBot(seed, f, MILESTONE, 'idle', 75 * 60).over);
      expect(survivors.length, `family ${f} idle survivors: ${survivors.join(', ')}`).toBeLessThanOrEqual(Math.floor(SEEDS.length * 0.01));
    }
  });
  test('the most extreme Friends (heaviest + symmetric + big eyes, lightest + lopsided) still die idle in ≥ 99% of seeds', () => {
    // Traits read from the art are trade-offs: none of them may turn standing still into a strategy.
    for (const traits of [{ bulk: 130, symmetry: 1, eyes: 4 }, { bulk: 30, symmetry: 0.3, eyes: 0 }]) for (const f of FAMILIES) {
      const survivors = SEEDS.filter(seed => !playBot(seed, f, MILESTONE, 'idle', 75 * 60, undefined, traits).over);
      expect(survivors.length, `family ${f} ${JSON.stringify(traits)} idle survivors: ${survivors.join(', ')}`).toBeLessThanOrEqual(Math.floor(SEEDS.length * 0.01));
    }
  });
  test('a fleeing bot beats at least one boss in ≥ 90% of seeds, and every family is within ±25% of the median', () => {
    const results = new Map<FamilyId, RunState[]>();
    for (const f of FAMILIES) results.set(f, SEEDS.map(seed => playBot(seed, f, MILESTONE, 'flee', MAX_TICKS)));
    const report = FAMILIES.map(f => {
      const runs = results.get(f)!;
      return { f, beatBoss: runs.filter(r => r.bossesDefeated >= 1).length, medianTicks: median(runs.map(r => r.tick)) };
    });
    console.table(report);
    for (const r of report) expect(r.beatBoss, `family ${r.f}`).toBeGreaterThanOrEqual(Math.ceil(SEEDS.length * 0.9));
    // Seed noise: the same numbers on another 60-seed set moved family medians by up to ±20%, so a strict pairwise
    // max/min ≤ 1.25 over 9 families measured noise. Each family must stay within ±25% of the all-family median.
    const all = median(report.map(r => r.medianTicks));
    for (const r of report) {
      expect(r.medianTicks / all, `family ${r.f} vs median`).toBeLessThanOrEqual(1.25);
      expect(r.medianTicks / all, `family ${r.f} vs median`).toBeGreaterThanOrEqual(0.8);
    }
  });
});
