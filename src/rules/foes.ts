// Opponents arrive from a chat with a name, a few words, maybe a level and an archetype, and no numbers. Code makes the sheet:
// the level's stat budget spread by the archetype's weights. A model never sets a foe's numbers.
import { cleanSheet, statBudget, STAT_MAX, STAT_MIN, STATS } from "./index";
import type { Sheet, Stats } from "./index";

export type FoeArchetype = "balanced" | "brute" | "scout" | "archer" | "caster" | "tank";

/** Weights over might, agility, endurance, wits, spirit. */
const WEIGHTS: Record<FoeArchetype, [number, number, number, number, number]> = {
  balanced: [1, 1, 1, 1, 1],
  brute: [3, 1, 2, 0.5, 0.5],
  scout: [1.5, 3, 1, 1, 0.5],
  archer: [2, 2.5, 1, 1, 0.5],
  caster: [0.5, 1.5, 1, 3, 2],
  tank: [2, 0.5, 3, 0.5, 1],
};

/**
 * Spreads the budget of `level` over the stats by the weights, each stat inside 1..10. Points go out in rounds by weight among
 * the stats still under the top; what a capped stat cannot take goes to the others, so the sum is always the budget.
 */
export function foeStats(level: number, archetype: FoeArchetype): Stats {
  const w = WEIGHTS[archetype] ?? WEIGHTS.balanced;
  const out = STATS.map(() => STAT_MIN);
  let left = Math.min(statBudget(level), STATS.length * STAT_MAX) - out.reduce((a, b) => a + b, 0);
  for (let guard = 0; left > 0 && guard < 100; guard++) {
    const open = out.map((v, i) => (v < STAT_MAX ? i : -1)).filter((i) => i >= 0);
    if (open.length === 0) break;
    const total = open.reduce((a, i) => a + w[i], 0);
    const shares = open.map((i) => ({ i, raw: (w[i] / total) * left }));
    let given = 0;
    for (const sh of shares) {
      const take = Math.min(Math.floor(sh.raw), STAT_MAX - out[sh.i]);
      out[sh.i] += take;
      given += take;
    }
    if (given === 0) {
      // fewer points than stats left: the biggest remainders take one each
      for (const sh of shares.sort((a, b) => b.raw - a.raw)) {
        if (left - given <= 0) break;
        out[sh.i]++;
        given++;
      }
    }
    left -= given;
  }
  return { might: out[0], agility: out[1], endurance: out[2], wits: out[3], spirit: out[4] };
}

/** A foe's sheet: its level (else one under the party's average, at least 1), the archetype's stats, a middling courage. */
export function foeSheet(foe: { name: string; level: number | null; archetype: FoeArchetype }, partyLevel: number): Sheet {
  const level = foe.level ?? Math.max(1, partyLevel - 1);
  return cleanSheet({ name: foe.name, level, stats: foeStats(Math.min(10, Math.max(1, level)), foe.archetype), courage: 50 });
}
