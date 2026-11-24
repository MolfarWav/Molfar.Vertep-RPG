import { GRAVE_AT, HEAL_HOURS, INJURY_AT, INJURY_EFFECT, SERIOUS_AT } from "./tuning";
import type { Zone } from "./tuning";
import type { Injury, Severity } from "./types";

const HOUR = 3600 * 1000;
const RANK: Record<Severity, number> = { light: 1, serious: 2, grave: 3 };

/** The severity a hit of `damage` makes against a target with `maxHp`, or null when it is too small to injure. */
export function severityOf(damage: number, maxHp: number): Severity | null {
  if (maxHp <= 0) return null;
  const share = damage / maxHp;
  if (share < INJURY_AT) return null;
  if (share >= GRAVE_AT) return "grave";
  if (share >= SERIOUS_AT) return "serious";
  return "light";
}

export function makeInjury(id: string, zone: Zone, severity: Severity, now: number): Injury {
  const hours = severity === "grave" ? null : HEAL_HOURS[severity];
  return { id, zone, severity, since: now, healsAt: hours === null ? null : now + hours * HOUR, treated: false };
}

export interface InjuryEffects {
  /** Percentage points off the hit chance. */
  hitPenalty: number;
  /** Multiplier on strike damage. */
  damageFactor: number;
  /** Multiplier on the flee chance. */
  fleeFactor: number;
  /** Multiplier on max HP. */
  maxHpFactor: number;
  /** HP lost each round. */
  bleed: number;
}

/** What a list of injuries does to a fighter. Each injury of a kind counts once. */
export function effectsOf(injuries: readonly Injury[]): InjuryEffects {
  const at = (z: Zone) => injuries.filter((i) => i.zone === z).length;
  return {
    hitPenalty: at("head") * INJURY_EFFECT.headHit,
    damageFactor: Math.max(0, 1 - at("arms") * INJURY_EFFECT.armsDamage),
    fleeFactor: at("legs") > 0 ? INJURY_EFFECT.legsFlee : 1,
    maxHpFactor: Math.max(0.1, 1 - at("torso") * INJURY_EFFECT.torsoMaxHp),
    bleed: injuries.filter((i) => i.zone === "belly" && !i.treated).length * INJURY_EFFECT.bellyBleed,
  };
}

/** Injuries that time has healed are dropped. A grave injury (healsAt null) stays until it is treated. */
export function healByTime(injuries: readonly Injury[], now: number): Injury[] {
  return injuries.filter((i) => i.healsAt === null || i.healsAt > now);
}

/**
 * A treatment of `severity` works on every injury of that severity or lower and lowers each one step:
 * grave becomes serious, serious becomes light, light is healed. A treated injury stops bleeding and its
 * healing clock restarts from `now`.
 */
export function treat(injuries: readonly Injury[], severity: Severity, now: number): Injury[] {
  const out: Injury[] = [];
  for (const i of injuries) {
    if (RANK[i.severity] > RANK[severity]) {
      out.push(i);
      continue;
    }
    if (i.severity === "light") continue;
    const next: Severity = i.severity === "grave" ? "serious" : "light";
    out.push({ ...i, severity: next, treated: true, healsAt: now + HEAL_HOURS[next] * HOUR });
  }
  return out;
}

export const isSeverity = (v: unknown): v is Severity => v === "light" || v === "serious" || v === "grave";
