// Every number of the rules lives here, so balance is one file. Values are a starting proposal.

export const STATS = ["might", "agility", "endurance", "wits", "spirit"] as const;
export type StatKey = (typeof STATS)[number];

export const STAT_MIN = 1;
export const STAT_MAX = 10;
export const MAX_LEVEL = 10;
export const MAX_SKILLS = 6;
export const SKILL_RANK_MAX = 5;

/** Stat points a sheet of this level may hold in total (level 1: 18 over five stats). */
export const statBudget = (level: number): number => 15 + 3 * level;
/** Skill ranks a sheet of this level may hold in total. */
export const skillBudget = (level: number): number => 4 + level;
/** XP needed to reach level n (level 1 costs nothing): 100, 300, 600, 1000 ... */
export const xpFor = (n: number): number => 50 * n * (n - 1);
/** Max HP before injuries. */
export const baseHp = (endurance: number, level: number): number => 10 + 3 * endurance + 2 * level;
/** What a level-up gives. */
export const LEVEL_UP = { statPoints: 3, skillRanks: 1 } as const;

export const ZONES = ["head", "torso", "belly", "arms", "legs"] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_MULT: Record<Zone, number> = { head: 2.0, torso: 1.0, belly: 1.3, arms: 0.8, legs: 0.9 };
/** Base hit chance by zone, in percent. */
export const ZONE_HIT: Record<Zone, number> = { head: 45, torso: 85, belly: 70, arms: 75, legs: 75 };
/** Percent added to the hit chance per point of attacker agility over the defender's. */
export const AGILITY_HIT = 2;
export const HIT_MIN = 10;
export const HIT_MAX = 95;

/** Damage of a strike before the zone: base + might. */
export const strikeBase = (might: number): number => 4 + might;
export const GUARD_POINTS = 2;
/** A guarded hit deals this share of its damage. */
export const GUARD_SHARE = 0.25;

/** A hit of this share of max HP or more makes an injury, and the share picks the severity. */
export const INJURY_AT = 0.25;
export const SERIOUS_AT = 0.4;
export const GRAVE_AT = 0.6;
export const INJURY_EFFECT = {
  /** Percentage points off the hit chance (head). */
  headHit: 15,
  /** Share off the strike damage (arms). */
  armsDamage: 0.2,
  /** Multiplier on the flee chance (legs). */
  legsFlee: 0.5,
  /** Share off max HP (torso). */
  torsoMaxHp: 0.1,
  /** HP lost each round until treated (belly). */
  bellyBleed: 2,
};
/** Hours until an injury heals by time alone. A grave one does not heal by time until it is treated. */
export const HEAL_HOURS = { light: 24, serious: 24 * 7 } as const;

export const FLEE_BASE = 50;
export const FLEE_PER_AGILITY = 3;
/** A timid ally flees by itself below this share of max HP. */
export const TIMID_BELOW = 0.3;
/** Courage (0..100) under this makes an ally timid. */
export const TIMID_COURAGE = 35;

/** Under the deadly defeat step a fighter at 0 HP risks death each round. */
export const DEATH_ROLL = 0.25;
export const MAX_ROUNDS = 60;
