// A character's sheet for one story: the numbers, the budget they must fit, and levels.
// Code judges: a model or a user proposes numbers, `cleanSheet` makes them legal.

import {
  baseHp,
  LEVEL_UP,
  MAX_LEVEL,
  MAX_SKILLS,
  SKILL_RANK_MAX,
  skillBudget,
  STAT_MAX,
  STAT_MIN,
  STATS,
  statBudget,
  TIMID_COURAGE,
  xpFor,
} from "./tuning";
import type { StatKey } from "./tuning";
import { effectsOf } from "./injuries";
import type { Fighter, Injury, Item, Power, Sheet, Skill, Stats } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const int = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : dflt;
  return Math.min(hi, Math.max(lo, n));
};
const text = (v: unknown, n: number): string =>
  (typeof v === "string" ? v : "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);

export const sumStats = (s: Stats): number => STATS.reduce((a, k) => a + s[k], 0);
export const sumRanks = (skills: readonly Skill[]): number => skills.reduce((a, s) => a + s.rank, 0);

/**
 * Brings stats inside the budget by taking points off the highest stat, one at a time (the first of a tie, in
 * STATS order), never below the minimum. It never raises a stat. Under budget is left alone: the rest is free points.
 */
export function clampStatsToBudget(stats: Stats, level: number): Stats {
  const out = { ...stats };
  const budget = statBudget(level);
  while (sumStats(out) > budget) {
    let top: StatKey | null = null;
    for (const k of STATS) if (out[k] > STAT_MIN && (top === null || out[k] > out[top])) top = k;
    if (top === null) break;
    out[top]--;
  }
  return out;
}

/** Max HP of a sheet: endurance and level, less what a torso injury takes. */
export function hpMax(sheet: Pick<Sheet, "stats" | "level">, injuries: readonly Injury[] = []): number {
  return Math.max(1, Math.floor(baseHp(sheet.stats.endurance, sheet.level) * effectsOf(injuries).maxHpFactor));
}

/** Current HP, `null` meaning full. */
export const hpNowOf = (sheet: Sheet, injuries: readonly Injury[] = []): number => Math.min(sheet.hpNow ?? hpMax(sheet, injuries), hpMax(sheet, injuries));

export const freeStatPoints = (s: Sheet): number => Math.max(0, statBudget(s.level) - sumStats(s.stats));
export const freeSkillRanks = (s: Sheet): number => Math.max(0, skillBudget(s.level) - sumRanks(s.skills));

/**
 * A sheet from anything (a model's answer, a client's save, an old file): unknown keys dropped, every value clamped,
 * stats scaled into the budget of the level, skills cut to the skill budget. Never throws.
 */
export function cleanSheet(raw: unknown, fallbackName = ""): Sheet {
  const r = isObj(raw) ? raw : {};
  const level = int(r.level, 1, MAX_LEVEL, 1);
  const rs = isObj(r.stats) ? r.stats : {};
  const stats = {} as Stats;
  for (const k of STATS) stats[k] = int(rs[k], STAT_MIN, STAT_MAX, 3);
  const skills: Skill[] = [];
  const seen = new Set<string>();
  for (const s of Array.isArray(r.skills) ? r.skills : []) {
    if (!isObj(s) || skills.length >= MAX_SKILLS) continue;
    const name = text(s.name, 40);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    skills.push({ name, rank: int(s.rank, 1, SKILL_RANK_MAX, 1) });
  }
  const budget = skillBudget(level);
  while (sumRanks(skills) > budget && skills.length) {
    const last = skills[skills.length - 1];
    if (last.rank > 1) last.rank--;
    else skills.pop();
  }
  const sheet: Sheet = {
    v: 1,
    name: text(r.name, 80) || text(fallbackName, 80),
    role: text(r.role, 60),
    level,
    xp: int(r.xp, 0, 1_000_000, 0),
    stats: clampStatsToBudget(stats, level),
    skills,
    money: int(r.money, 0, 1_000_000_000, 0),
    currency: text(r.currency, 20) || "coins",
    hpNow: r.hpNow === null || r.hpNow === undefined ? null : int(r.hpNow, 0, 100000, 0),
    courage: int(r.courage, 0, 100, 50),
    note: text(r.note, 300),
  };
  if (sheet.hpNow !== null) sheet.hpNow = Math.min(sheet.hpNow, hpMax(sheet));
  return sheet;
}

// ---------- levels ----------

export const nextLevelXp = (s: Sheet): number | null => (s.level >= MAX_LEVEL ? null : xpFor(s.level + 1));
export const canLevelUp = (s: Sheet): boolean => s.level < MAX_LEVEL && s.xp >= xpFor(s.level + 1);

/** XP added by hand or by a fight. It never changes the level by itself: the user presses "Level up". */
export function addXp(s: Sheet, n: number): Sheet {
  return { ...s, xp: Math.max(0, Math.min(1_000_000, s.xp + Math.round(n))) };
}

/**
 * One level up: +3 stat points and +1 skill rank become free (the user spends them), max HP rises, and current HP
 * rises by the same amount so a level-up is not a loss of health. Not allowed without the XP.
 */
export function levelUp(s: Sheet): Sheet | null {
  if (!canLevelUp(s)) return null;
  const before = hpMax(s);
  const next: Sheet = { ...s, level: s.level + 1 };
  const gain = hpMax(next) - before;
  return { ...next, hpNow: s.hpNow === null ? null : Math.min(hpMax(next), s.hpNow + gain) };
}

export const LEVEL_GAIN = LEVEL_UP;

/** One free stat point into a stat. Null when there is none free or the stat is at its top. */
export function spendStat(s: Sheet, key: StatKey): Sheet | null {
  if (freeStatPoints(s) < 1 || s.stats[key] >= STAT_MAX) return null;
  const next: Sheet = { ...s, stats: { ...s.stats, [key]: s.stats[key] + 1 } };
  if (key !== "endurance" || s.hpNow === null) return next;
  // endurance raises max HP, and the current HP follows by the same amount
  return { ...next, hpNow: Math.min(hpMax(next), s.hpNow + (hpMax(next) - hpMax(s))) };
}

/** One free skill rank into a skill (added at rank 1 when new). Null when none is free or the skill is at its top. */
export function spendSkill(s: Sheet, name: string): Sheet | null {
  const n = text(name, 40);
  if (!n || freeSkillRanks(s) < 1) return null;
  const at = s.skills.findIndex((k) => k.name.toLowerCase() === n.toLowerCase());
  if (at >= 0) {
    if (s.skills[at].rank >= SKILL_RANK_MAX) return null;
    return { ...s, skills: s.skills.map((k, i) => (i === at ? { ...k, rank: k.rank + 1 } : k)) };
  }
  if (s.skills.length >= MAX_SKILLS) return null;
  return { ...s, skills: [...s.skills, { name: n, rank: 1 }] };
}

// ---------- the table sheet (no model) ----------

/** Courage 0..100 from a Soul: confidence, boldness (100 - shyness) and recklessness, averaged. Missing parts count as 50. */
export function courageFromSoul(soul: unknown): number {
  const s = isObj(soul) ? soul : {};
  const traits = isObj(s.traits) ? s.traits : {};
  const spectra = isObj(s.spectra) ? s.spectra : {};
  const n = (v: unknown) => int(v, 0, 100, 50);
  return Math.round((n(traits.confidence) + (100 - n(traits.shyness)) + n(spectra.cautious_reckless)) / 3);
}

/**
 * A plain sheet for a character with no model's proposal: level 1, every stat 3, nudged by the Soul's traits.
 * Fits the level-1 budget (18) exactly or leaves points free.
 */
export function tableSheet(name: string, soul?: unknown): Sheet {
  const s = isObj(soul) ? soul : {};
  const traits = isObj(s.traits) ? s.traits : {};
  const spectra = isObj(s.spectra) ? s.spectra : {};
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
  // each nudge has a strength (how far the trait is from the middle); the strongest are applied first, and a raise
  // only while the level-1 budget has room, so no stat is cut afterwards
  const nudges: { stat: StatKey; delta: number; strength: number }[] = [];
  const push = (stat: StatKey, v: unknown, goodHigh: boolean) => {
    const n = num(v);
    if (n === null) return;
    if (goodHigh ? n >= 65 : n <= 35) nudges.push({ stat, delta: 1, strength: Math.abs(n - 50) });
  };
  push("might", traits.dominance, true);
  push("wits", traits.curiosity, true);
  push("endurance", traits.patience, true);
  push("agility", spectra.cautious_reckless, true);
  push("spirit", traits.confidence, true);
  const stats: Stats = { might: 3, agility: 3, endurance: 3, wits: 3, spirit: 3 };
  if ((num(traits.confidence) ?? 50) <= 35 || (num(traits.shyness) ?? 50) >= 65) stats.spirit--;
  nudges.sort((a, b) => b.strength - a.strength);
  for (const n of nudges) if (sumStats(stats) < statBudget(1)) stats[n.stat] += n.delta;
  return cleanSheet({ name, level: 1, stats, courage: courageFromSoul(soul), note: "A plain sheet made from the table, without a model." });
}

// ---------- from a sheet to a fighter ----------

export interface FighterKit {
  id: string;
  side: "party" | "foe";
  injuries?: Injury[];
  belt?: Item[];
  backpack?: Item[];
  powers?: Power[];
  weapon?: number;
}

export function fighterFromSheet(sheet: Sheet, kit: FighterKit): Fighter {
  const injuries = kit.injuries ?? [];
  return {
    id: kit.id,
    name: sheet.name,
    side: kit.side,
    level: sheet.level,
    stats: { ...sheet.stats },
    hp: hpNowOf(sheet, injuries),
    injuries,
    belt: kit.belt ?? [],
    backpack: kit.backpack ?? [],
    powers: kit.powers ?? [],
    statuses: [],
    weapon: kit.weapon ?? 1,
    timid: sheet.courage < TIMID_COURAGE,
    fled: false,
    dead: false,
  };
}
