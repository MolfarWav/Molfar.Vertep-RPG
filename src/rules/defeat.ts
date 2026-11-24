// What a lost battle costs, in four steps chosen per chat. A pure function of the final state: the app applies
// the result as proposals; nothing here deletes anything.

import { makeInjury } from "./injuries";
import { ZONES } from "./tuning";
import type { Rng } from "./rng";
import type { BattleState, Injury, Severity } from "./types";

export type LootLoss = "all" | "part" | "none";

export interface Fallen {
  id: string;
  /** HP after the fight. */
  hp: number;
  /** The injury the defeat adds, if any. */
  injury: Injury | null;
  dead: boolean;
  loot: LootLoss;
  /** Items taken from the pack and belt. */
  itemsTaken: boolean;
}

export interface DefeatResult {
  step: 1 | 2 | 3 | 4;
  fallen: Fallen[];
  /** The scene moves (captured or left for dead); the World DM writes where. */
  sceneMoves: boolean;
  /** When the player's hero is dead the app offers these; nothing is deleted, the chat before the fight is kept. */
  offer: ("continue-as" | "branch-before")[];
}

/** `heroId` is the player's own hero, for the offer of step 4. */
export function applyDefeat(state: BattleState, rng: Rng, heroId?: string): DefeatResult {
  const step = state.stakes.defeat;
  const fallen: Fallen[] = [];
  for (const f of state.fighters) {
    if (f.side !== "party" || f.fled) continue;
    if (f.hp > 0 && !f.dead) continue;
    const injure = (severity: Severity): Injury => makeInjury(`d-${f.id}`, rng.pick(ZONES), severity, state.now);
    if (step === 1) fallen.push({ id: f.id, hp: 1, injury: null, dead: false, loot: "all", itemsTaken: false });
    else if (step === 2) fallen.push({ id: f.id, hp: 1, injury: injure("serious"), dead: false, loot: "part", itemsTaken: false });
    else if (step === 3) fallen.push({ id: f.id, hp: 1, injury: injure("grave"), dead: false, loot: "all", itemsTaken: true });
    else fallen.push({ id: f.id, hp: 0, injury: null, dead: f.dead, loot: f.dead ? "all" : "part", itemsTaken: f.dead });
  }
  const heroDead = step === 4 && heroId !== undefined && fallen.some((x) => x.id === heroId && x.dead);
  return { step, fallen, sceneMoves: step >= 3, offer: heroDead ? ["continue-as", "branch-before"] : [] };
}
