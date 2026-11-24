import { fighterFromSheet, cleanSheet } from "../../src/rules/sheet";
import type { Rng } from "../../src/rules/rng";
import type { BattleState, Fighter, Stakes, Stats } from "../../src/rules/types";

export const NOW = 1_000_000_000;

export function fighter(id: string, side: "party" | "foe", over: Partial<Fighter> & { stats?: Partial<Stats>; level?: number } = {}): Fighter {
  const sheet = cleanSheet({ name: id, level: over.level ?? 1, stats: { might: 4, agility: 4, endurance: 4, wits: 3, spirit: 3, ...over.stats } });
  const f = fighterFromSheet(sheet, { id, side });
  const { stats: _s, level: _l, ...rest } = over;
  return { ...f, ...rest };
}

export function battle(fighters: Fighter[], stakes: Partial<Stakes> = {}): BattleState {
  return { round: 0, fighters, stakes: { flee: true, defeat: 2, ...stakes }, outcome: null, now: NOW };
}

/** A stub generator: every chance comes out the same way, so a test can force hits or misses. */
export function stubRng(chance: boolean, int = 0): Rng {
  return { next: () => (chance ? 0 : 0.999), int: (min) => min + int, chance: () => chance, pick: (l) => l[0] };
}
