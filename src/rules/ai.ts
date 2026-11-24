// A simple code opponent: a random legal choice, weighted toward the weakest enemy. It never calls a model.

import { standing, maxHpOf, fleeChance } from "./resolve";
import { TIMID_BELOW, ZONES } from "./tuning";
import type { Rng } from "./rng";
import type { BattleState, Choice, Fighter } from "./types";

export function aiChoice(state: BattleState, f: Fighter, rng: Rng): Choice {
  const foes = state.fighters.filter((x) => x.side !== f.side && standing(x));
  const guard = [rng.pick(ZONES), rng.pick(ZONES)].filter((z, i, a) => a.indexOf(z) === i);
  if (foes.length === 0) return { kind: "skip", by: f.id, guard };
  if (f.timid && state.stakes.flee && f.hp / maxHpOf(f) < TIMID_BELOW && fleeChance(f, state) > 0) return { kind: "flee", by: f.id };
  // the weaker an enemy, the likelier the target: weight = 1 + missing share of its HP
  const weights = foes.map((x) => 1 + (1 - x.hp / maxHpOf(x)) * 2);
  let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
  let target = foes[foes.length - 1];
  for (let i = 0; i < foes.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      target = foes[i];
      break;
    }
  }
  return { kind: "strike", by: f.id, target: target.id, zone: rng.pick(ZONES), guard };
}

/** One choice for each standing fighter of a side (or of both). */
export function aiChoices(state: BattleState, rng: Rng, side?: "party" | "foe"): Choice[] {
  return state.fighters.filter((f) => standing(f) && (!side || f.side === side)).map((f) => aiChoice(state, f, rng));
}
