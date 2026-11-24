// The contract between Roleplay and the RPG app, version 0.1. The two apps update separately, so both sides check what they
// read: an unknown major version is refused in plain words, every text is cut, every number clamped, a list capped.
//
//   Roleplay -> RPG: an encounter, written to Roleplay's data as `rpg-outbox/<id>.json`; RPG reads it (manifest `reads`).
//   RPG -> Roleplay: a result, written to RPG's data as `results/<id>.json`; Roleplay reads it (its own `reads`).
//   The id travels through the shell: `molfarShell.openApp(app, id)`, heard with `onView`. It is a view name: a letter first,
//   then lower-case letters, digits and dashes, 32 at most.
//
// Roleplay keeps a mirror of these checks in plain JavaScript; docs/contract/v0.1 holds the example files both sides test with.
import { MAX_LEVEL, ZONES } from "@/rules";
import type { Zone } from "@/rules";

export const CONTRACT = "0.1";
export const ID_RULE = /^[a-z][a-z0-9-]{0,31}$/;

export const SKINS_V1 = ["fantasy", "cyberpunk", "superhero", "postapoc", "modern", "horror"] as const;
export const ARCHETYPES = ["balanced", "brute", "scout", "archer", "caster", "tank"] as const;
export type Archetype = (typeof ARCHETYPES)[number];
export type Severity = "light" | "serious" | "grave";

export interface EncParty {
  /** The registry id of the person in the chat (p1, p2 ...), or `user`. */
  id: string;
  name: string;
  hero: boolean;
  role: string;
  /** What the Soul says, kept as the numbers it holds (traits and spectra, 0..100); used once to make a sheet. */
  soul: { traits: Record<string, number>; spectra: Record<string, number> } | null;
}

export interface EncFoe {
  name: string;
  description: string;
  level: number | null;
  archetype: Archetype;
}

export interface Encounter {
  contract: string;
  id: string;
  chatId: string;
  messageId: string;
  skin: (typeof SKINS_V1)[number];
  language: "en" | "uk";
  scene: string;
  place: string;
  party: EncParty[];
  foes: EncFoe[];
  stakes: { flee: boolean; defeat: 1 | 2 | 3 | 4 };
  at: number;
}

export interface FighterResult {
  id: string;
  name: string;
  hp: number;
  hpMax: number;
  fled: boolean;
  dead: boolean;
  injuries: { zone: Zone; severity: Severity }[];
}

export interface Result {
  contract: string;
  encounterId: string;
  outcome: "won" | "lost" | "fled" | "aborted";
  /** The defeat step applied (1 to 4) when the outcome is lost, else null. */
  defeatApplied: 1 | 2 | 3 | 4 | null;
  party: FighterResult[];
  foes: { name: string; hp: number; hpMax: number }[];
  loot: { name: string }[];
  summary: string;
  rounds: number;
  seed: number;
  at: number;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const noControls = (s: string): string => Array.from(s, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch)).join("");
const text = (v: unknown, n: number): string => noControls(typeof v === "string" ? v : "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v: unknown, lo: number, hi: number, dflt: number): number => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt);

/** Plain words for a contract this side does not know. Only the major part counts (0.x are compatible with each other). */
export function checkVersion(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d+\.\d+$/.test(v)) return "the file does not say which contract version it follows";
  if (v.split(".")[0] !== CONTRACT.split(".")[0]) return `the file follows contract ${v}, this app understands ${CONTRACT}: update the app that is older`;
  return null;
}

const numbers = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v).slice(0, 16)) if (/^[a-z_]{1,30}$/.test(k) && typeof x === "number" && Number.isFinite(x)) out[k] = num(x, 0, 100, 50);
  return out;
};

export function parseEncounter(raw: unknown): Parsed<Encounter> {
  if (!isObj(raw)) return { ok: false, reason: "the encounter file is not an object" };
  const bad = checkVersion(raw.contract);
  if (bad) return { ok: false, reason: bad };
  const id = typeof raw.id === "string" && ID_RULE.test(raw.id) ? raw.id : "";
  if (!id) return { ok: false, reason: "the encounter has no usable id" };
  const party: EncParty[] = [];
  for (const p of Array.isArray(raw.party) ? raw.party : []) {
    if (!isObj(p) || party.length >= 4) continue;
    const name = text(p.name, 60);
    const pid = typeof p.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(p.id) ? p.id : "";
    if (!name || !pid || party.some((x) => x.id === pid)) continue;
    party.push({
      id: pid,
      name,
      hero: p.hero === true,
      role: text(p.role, 60),
      soul: isObj(p.soul) ? { traits: numbers(p.soul.traits), spectra: numbers(p.soul.spectra) } : null,
    });
  }
  if (party.length === 0) return { ok: false, reason: "the encounter has nobody on the party's side" };
  if (!party.some((p) => p.hero)) party[0].hero = true;
  // exactly one hero, and the hero goes first (the app treats the first fighter as the player's own)
  const heroAt = party.findIndex((p) => p.hero);
  party.forEach((p, i) => (p.hero = i === heroAt));
  party.unshift(...party.splice(heroAt, 1));
  const foes: EncFoe[] = [];
  for (const f of Array.isArray(raw.foes) ? raw.foes : []) {
    if (!isObj(f) || foes.length >= 6) continue;
    const name = text(f.name, 60);
    if (!name) continue;
    foes.push({
      name,
      description: text(f.description, 200),
      level: f.level == null ? null : num(f.level, 1, MAX_LEVEL, 1),
      archetype: (ARCHETYPES as readonly unknown[]).includes(f.archetype) ? (f.archetype as Archetype) : "balanced",
    });
  }
  if (foes.length === 0) return { ok: false, reason: "the encounter has no opponents" };
  const st = isObj(raw.stakes) ? raw.stakes : {};
  const d = num(st.defeat, 1, 4, 2);
  return {
    ok: true,
    value: {
      contract: CONTRACT,
      id,
      chatId: text(raw.chatId, 80),
      messageId: text(raw.messageId, 80),
      skin: (SKINS_V1 as readonly unknown[]).includes(raw.skin) ? (raw.skin as Encounter["skin"]) : "fantasy",
      language: raw.language === "uk" ? "uk" : "en",
      scene: text(raw.scene, 400),
      place: text(raw.place, 60),
      party,
      foes,
      stakes: { flee: st.flee !== false, defeat: d as 1 | 2 | 3 | 4 },
      at: num(raw.at, 0, 8_640_000_000_000_000, 0),
    },
  };
}

export function parseResult(raw: unknown): Parsed<Result> {
  if (!isObj(raw)) return { ok: false, reason: "the result file is not an object" };
  const bad = checkVersion(raw.contract);
  if (bad) return { ok: false, reason: bad };
  const encounterId = typeof raw.encounterId === "string" && ID_RULE.test(raw.encounterId) ? raw.encounterId : "";
  if (!encounterId) return { ok: false, reason: "the result names no encounter" };
  const outcome = raw.outcome === "won" || raw.outcome === "lost" || raw.outcome === "fled" || raw.outcome === "aborted" ? raw.outcome : null;
  if (!outcome) return { ok: false, reason: "the result has no known outcome" };
  const party: FighterResult[] = [];
  for (const p of Array.isArray(raw.party) ? raw.party : []) {
    if (!isObj(p) || party.length >= 4) continue;
    const id = typeof p.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(p.id) ? p.id : "";
    const name = text(p.name, 60);
    if (!id || !name) continue;
    const hpMax = num(p.hpMax, 1, 100000, 1);
    const injuries: FighterResult["injuries"] = [];
    for (const i of Array.isArray(p.injuries) ? p.injuries : []) {
      if (!isObj(i) || injuries.length >= 8) continue;
      if ((ZONES as readonly unknown[]).includes(i.zone) && (i.severity === "light" || i.severity === "serious" || i.severity === "grave")) injuries.push({ zone: i.zone as Zone, severity: i.severity });
    }
    party.push({ id, name, hp: num(p.hp, 0, hpMax, 0), hpMax, fled: p.fled === true, dead: p.dead === true, injuries });
  }
  const foes: Result["foes"] = [];
  for (const f of Array.isArray(raw.foes) ? raw.foes : []) {
    if (!isObj(f) || foes.length >= 6) continue;
    const name = text(f.name, 60);
    const hpMax = num(f.hpMax, 1, 100000, 1);
    if (name) foes.push({ name, hp: num(f.hp, 0, hpMax, 0), hpMax });
  }
  const loot: Result["loot"] = [];
  for (const l of Array.isArray(raw.loot) ? raw.loot : []) {
    if (!isObj(l) || loot.length >= 12) continue;
    const name = text(l.name, 60);
    if (name) loot.push({ name });
  }
  const d = raw.defeatApplied == null ? null : num(raw.defeatApplied, 1, 4, 2);
  return {
    ok: true,
    value: {
      contract: CONTRACT,
      encounterId,
      outcome,
      defeatApplied: d === null ? null : (d as 1 | 2 | 3 | 4),
      party,
      foes,
      loot,
      summary: text(raw.summary, 600),
      rounds: num(raw.rounds, 0, 1000, 0),
      seed: num(raw.seed, 0, 4_294_967_295, 0),
      at: num(raw.at, 0, 8_640_000_000_000_000, 0),
    },
  };
}
