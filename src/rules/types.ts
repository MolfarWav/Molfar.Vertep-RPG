import type { StatKey, Zone } from "./tuning";

export type Stats = Record<StatKey, number>;
export type Side = "party" | "foe";
export type Severity = "light" | "serious" | "grave";

export interface Injury {
  id: string;
  zone: Zone;
  severity: Severity;
  /** The story clock (ms) when it was made. */
  since: number;
  /** When time alone heals it; null for a grave injury that is not treated yet. */
  healsAt: number | null;
  treated: boolean;
}

/** An item carries one effect key with a number: `heal:18`, `treat:serious`. Data never adds code. */
export interface Item {
  id: string;
  name: string;
  effect: string;
}

/** A power replaces the strike. Effects: `damage:<n>:<type>`, `heal:<n>`, `hit_mod:<n>:<rounds>`, `burn:<n>:<rounds>`. */
export interface Power {
  id: string;
  name: string;
  effect: string;
  /** Uses left in this battle; missing means no limit. */
  uses?: number;
}

export interface Status {
  kind: "hit_mod" | "burn";
  n: number;
  rounds: number;
}

export interface Skill {
  name: string;
  rank: number;
}

/** One character's sheet for one story. `hp.max` is never stored: it follows from endurance, level and injuries. */
export interface Sheet {
  v: 1;
  name: string;
  role: string;
  level: number;
  xp: number;
  stats: Stats;
  skills: Skill[];
  money: number;
  currency: string;
  /** Current HP; null means full. */
  hpNow: number | null;
  /** 0..100, derived once from the Soul; low means a timid fighter. */
  courage: number;
  note: string;
}

export interface Fighter {
  id: string;
  name: string;
  side: Side;
  level: number;
  stats: Stats;
  hp: number;
  injuries: Injury[];
  belt: Item[];
  backpack: Item[];
  powers: Power[];
  statuses: Status[];
  /** Strike multiplier of the weapon. */
  weapon: number;
  timid: boolean;
  fled: boolean;
  dead: boolean;
}

export interface Stakes {
  flee: boolean;
  /** 1 robbed, 2 wounded, 3 captured or left for dead, 4 death is possible. */
  defeat: 1 | 2 | 3 | 4;
}

export type Outcome = "won" | "lost" | "fled" | "aborted";

export interface BattleState {
  round: number;
  fighters: Fighter[];
  stakes: Stakes;
  outcome: Outcome | null;
  /** The story clock (ms), used to date injuries. */
  now: number;
}

export type Choice =
  | { kind: "strike"; by: string; target: string; zone: Zone; guard: Zone[] }
  | { kind: "power"; by: string; power: string; target: string; guard: Zone[] }
  | { kind: "item"; by: string; from: "belt" | "backpack"; item: string; target: string; guard: Zone[] }
  | { kind: "flee"; by: string }
  | { kind: "skip"; by: string; guard: Zone[] };

export type Event =
  | { t: "illegal"; by: string; why: string }
  | { t: "hit"; by: string; target: string; zone: Zone; damage: number; guarded: boolean; injury?: Severity }
  | { t: "miss"; by: string; target: string; zone: Zone }
  | { t: "power"; by: string; power: string; target: string; damage: number; heal: number }
  | { t: "item"; by: string; item: string; target: string; heal: number; treated: boolean }
  | { t: "flee"; by: string; ok: boolean }
  | { t: "bleed"; who: string; hp: number }
  | { t: "burn"; who: string; hp: number }
  | { t: "down"; who: string }
  | { t: "death"; who: string }
  | { t: "end"; outcome: Outcome };
