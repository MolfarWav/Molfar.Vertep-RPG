// One round of a battle. Every choice of both sides is collected first and then applied at once from the same
// snapshot, so two fighters can drop each other in one round. Net HP at the end of the round is
// hp - damage + healing, clamped to 0..max.

import { effectsOf, makeInjury, severityOf, treat, isSeverity } from "./injuries";
import { hpMax } from "./sheet";
import {
  AGILITY_HIT,
  DEATH_ROLL,
  FLEE_BASE,
  FLEE_PER_AGILITY,
  GUARD_POINTS,
  GUARD_SHARE,
  HIT_MAX,
  HIT_MIN,
  MAX_ROUNDS,
  powerScale,
  strikeBase,
  ZONE_HIT,
  ZONE_MULT,
  ZONES,
} from "./tuning";
import type { Rng } from "./rng";
import type { Zone } from "./tuning";
import type { BattleState, Choice, Event, Fighter, Item, Outcome, Power } from "./types";

export const maxHpOf = (f: Fighter): number => hpMax({ stats: f.stats, level: f.level }, f.injuries);
export const standing = (f: Fighter): boolean => f.hp > 0 && !f.fled && !f.dead;

/** A deep copy of plain data (a state is JSON). */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const byId = (s: BattleState, id: string) => s.fighters.find((f) => f.id === id);

interface Effect {
  key: string;
  a: number;
  b: string;
}
/** `damage:12:fire` -> { key: "damage", a: 12, b: "fire" }. A bad effect string is null: it does nothing. */
export function parseEffect(effect: string): Effect | null {
  const [key, a, b] = String(effect).split(":");
  const n = Number(a);
  if (key === "treat") return isSeverity(a) ? { key, a: 0, b: a } : null;
  if (!["damage", "heal", "hit_mod", "burn"].includes(key) || !Number.isFinite(n)) return null;
  return { key, a: n, b: b ?? "" };
}

interface Legal {
  choice: Choice;
  guard: Zone[];
  item?: Item;
  power?: Power;
}

function uniqueGuard(guard: readonly Zone[] | undefined, max: number): Zone[] {
  const out: Zone[] = [];
  for (const z of guard ?? []) if (ZONES.includes(z) && !out.includes(z) && out.length < max) out.push(z);
  return out;
}

/** A choice made legal, or an event saying why it is not. An illegal choice becomes a skip with no guard. */
function legalize(state: BattleState, c: Choice, events: Event[]): Legal | null {
  const f = byId(state, c.by);
  if (!f || !standing(f)) return null;
  const refuse = (why: string): Legal => {
    events.push({ t: "illegal", by: c.by, why });
    return { choice: { kind: "skip", by: c.by, guard: [] }, guard: [] };
  };
  if (c.kind === "skip") return { choice: c, guard: uniqueGuard(c.guard, GUARD_POINTS) };
  if (c.kind === "flee") return state.stakes.flee ? { choice: c, guard: [] } : refuse("fleeing is not allowed here");
  const target = byId(state, (c as { target: string }).target);
  if (!target || !standing(target)) return refuse("no such target");
  if (c.kind === "strike") {
    if (target.side === f.side) return refuse("a strike needs an enemy");
    if (!ZONES.includes(c.zone)) return refuse("no such zone");
    return { choice: c, guard: uniqueGuard(c.guard, GUARD_POINTS) };
  }
  if (c.kind === "power") {
    const p = f.powers.find((x) => x.id === c.power);
    const fx = p ? parseEffect(p.effect) : null;
    if (!p || !fx) return refuse("no such power");
    if (p.uses !== undefined && p.uses <= 0) return refuse("the power is spent");
    const harmful = fx.key === "damage" || fx.key === "burn" || fx.key === "hit_mod";
    if (harmful && target.side === f.side) return refuse("that power needs an enemy");
    if (!harmful && target.side !== f.side) return refuse("that power needs an ally");
    return { choice: c, guard: uniqueGuard(c.guard, GUARD_POINTS), power: p };
  }
  // an item: from the belt it costs nothing, from the backpack it costs one guard point
  const pool = c.from === "belt" ? f.belt : f.backpack;
  const item = pool.find((x) => x.id === c.item);
  const fx = item ? parseEffect(item.effect) : null;
  if (!item || !fx) return refuse("no such item");
  if (target.side !== f.side) return refuse("an item goes to an ally");
  const cost = c.from === "backpack" ? 1 : 0;
  return { choice: c, guard: uniqueGuard(c.guard, GUARD_POINTS - cost), item };
}

/** Hit chance in percent for one strike. */
export function hitChance(att: Fighter, def: Fighter, zone: Zone): number {
  const fx = effectsOf(att.injuries);
  const mod = att.statuses.filter((s) => s.kind === "hit_mod").reduce((a, s) => a + s.n, 0);
  return clamp(ZONE_HIT[zone] + AGILITY_HIT * (att.stats.agility - def.stats.agility) + mod - fx.hitPenalty, HIT_MIN, HIT_MAX);
}

/** Flee chance in percent: 50 + 3 per agility point over the fastest foe, halved by a leg injury. */
export function fleeChance(f: Fighter, state: BattleState): number {
  const foes = state.fighters.filter((x) => x.side !== f.side && standing(x));
  const fastest = foes.reduce((a, x) => Math.max(a, x.stats.agility), 0);
  const raw = FLEE_BASE + FLEE_PER_AGILITY * (f.stats.agility - fastest);
  return clamp(Math.round(raw * effectsOf(f.injuries).fleeFactor), 5, 95);
}

export function strikeDamage(att: Fighter, zone: Zone): number {
  return Math.max(1, Math.round(strikeBase(att.stats.might) * ZONE_MULT[zone] * att.weapon * effectsOf(att.injuries).damageFactor));
}

export function outcomeOf(state: BattleState): Outcome | null {
  const party = state.fighters.filter((f) => f.side === "party");
  const foes = state.fighters.filter((f) => f.side === "foe");
  if (!foes.some(standing)) return party.some(standing) || party.length === 0 ? "won" : "lost";
  if (party.some(standing)) return state.round >= MAX_ROUNDS ? "aborted" : null;
  // nobody of the party stands: fled when none of them is down (all who are left ran away), else lost
  const down = party.some((f) => !f.fled && !f.dead && f.hp <= 0) || party.some((f) => f.dead);
  return !down && party.some((f) => f.fled) ? "fled" : "lost";
}

/** Applies one round. The input state is not changed. */
export function resolveRound(input: BattleState, choices: readonly Choice[], rng: Rng): { state: BattleState; events: Event[] } {
  const events: Event[] = [];
  if (input.outcome) return { state: input, events };
  const state: BattleState = clone(input);
  state.round++;
  const legal = new Map<string, Legal>();
  for (const c of choices) {
    if (legal.has(c.by)) continue; // one choice per fighter per round: the first counts
    const l = legalize(state, c, events);
    if (l) legal.set(c.by, l);
  }
  const startDown = new Set(state.fighters.filter((f) => f.hp <= 0 && !f.dead).map((f) => f.id));

  // 1. flee: a fighter who gets away takes no other part
  const gone = new Set<string>();
  for (const [id, l] of legal) {
    if (l.choice.kind !== "flee") continue;
    const f = byId(state, id) as Fighter;
    const ok = rng.chance(fleeChance(f, state) / 100);
    events.push({ t: "flee", by: id, ok });
    if (ok) {
      f.fled = true;
      gone.add(id);
    }
  }

  const damage = new Map<string, number>();
  const heal = new Map<string, number>();
  const add = (m: Map<string, number>, id: string, n: number) => m.set(id, (m.get(id) ?? 0) + n);
  const guardOf = (id: string): Zone[] => legal.get(id)?.guard ?? [];
  const snapshot = new Map(state.fighters.map((f) => [f.id, clone(f)]));
  const later: (() => void)[] = [];

  // 2. powers and items, then strikes, all read from the snapshot
  for (const [id, l] of legal) {
    if (gone.has(id)) continue;
    const att = snapshot.get(id) as Fighter;
    const c = l.choice;
    if (c.kind === "power" && l.power) {
      const fx = parseEffect(l.power.effect) as Effect;
      const tgt = byId(state, c.target) as Fighter;
      let dmg = 0;
      let hl = 0;
      if (fx.key === "damage") {
        dmg = Math.max(1, Math.round(fx.a * powerScale(att.stats.wits)));
        add(damage, tgt.id, dmg);
      } else if (fx.key === "heal") {
        hl = Math.max(0, Math.round(fx.a * powerScale(att.stats.spirit)));
        add(heal, tgt.id, hl);
      } else {
        const rounds = Math.max(1, Math.round(Number(fx.b) || 1));
        const scale = powerScale(fx.key === "burn" ? att.stats.wits : att.stats.spirit);
        tgt.statuses.push({ kind: fx.key as "hit_mod" | "burn", n: Math.round(fx.a * scale), rounds });
      }
      const src = byId(state, id) as Fighter;
      const p = src.powers.find((x) => x.id === l.power?.id);
      if (p && p.uses !== undefined) p.uses--;
      events.push({ t: "power", by: id, power: l.power.id, target: tgt.id, damage: dmg, heal: hl });
    } else if (c.kind === "item" && l.item) {
      const fx = parseEffect(l.item.effect) as Effect;
      const tgt = byId(state, c.target) as Fighter;
      let hl = 0;
      let treated = false;
      if (fx.key === "heal") {
        hl = Math.max(0, Math.round(fx.a));
        add(heal, tgt.id, hl);
      } else if (fx.key === "treat" && isSeverity(fx.b)) {
        const sev = fx.b;
        const before = tgt.injuries.length;
        later.push(() => {
          tgt.injuries = treat(tgt.injuries, sev, state.now);
        });
        treated = before > 0;
      }
      const src = byId(state, id) as Fighter;
      const pool = c.from === "belt" ? src.belt : src.backpack;
      pool.splice(pool.findIndex((x) => x.id === l.item?.id), 1);
      events.push({ t: "item", by: id, item: l.item.id, target: tgt.id, heal: hl, treated });
    } else if (c.kind === "strike") {
      const def = snapshot.get(c.target) as Fighter;
      if (!rng.chance(hitChance(att, def, c.zone) / 100)) {
        events.push({ t: "miss", by: id, target: c.target, zone: c.zone });
        continue;
      }
      let dmg = strikeDamage(att, c.zone);
      const guarded = guardOf(c.target).includes(c.zone);
      if (guarded) dmg = Math.max(1, Math.round(dmg * GUARD_SHARE));
      add(damage, c.target, dmg);
      const sev = severityOf(dmg, maxHpOf(def));
      const ev: Event = { t: "hit", by: id, target: c.target, zone: c.zone, damage: dmg, guarded };
      if (sev) {
        ev.injury = sev;
        const tgt = byId(state, c.target) as Fighter;
        tgt.injuries.push(makeInjury(`i${state.round}-${id}-${tgt.injuries.length}`, c.zone, sev, state.now));
      }
      events.push(ev);
    }
  }

  // 3. net HP, then what ticks at the end of the round (bleeding, burning)
  for (const f of state.fighters) {
    if (f.dead) continue;
    const before = f.hp;
    const net = f.hp - (damage.get(f.id) ?? 0) + (heal.get(f.id) ?? 0);
    f.hp = clamp(net, 0, maxHpOf(f));
    if (before > 0 && f.hp <= 0) events.push({ t: "down", who: f.id });
  }
  for (const fn of later) fn();
  for (const f of state.fighters) {
    if (f.dead || f.hp <= 0) continue;
    const bleed = effectsOf(f.injuries).bleed;
    if (bleed > 0) {
      f.hp = Math.max(0, f.hp - bleed);
      events.push({ t: "bleed", who: f.id, hp: f.hp });
    }
    const burn = f.statuses.filter((s) => s.kind === "burn").reduce((a, s) => a + s.n, 0);
    if (burn > 0) {
      f.hp = Math.max(0, f.hp - burn);
      events.push({ t: "burn", who: f.id, hp: f.hp });
    }
    f.hp = Math.min(f.hp, maxHpOf(f));
    if (f.hp <= 0) events.push({ t: "down", who: f.id });
  }
  for (const f of state.fighters) f.statuses = f.statuses.map((s) => ({ ...s, rounds: s.rounds - 1 })).filter((s) => s.rounds > 0);

  // 4. the deadly step: a fighter who was already down at the start of the round risks death
  if (state.stakes.defeat === 4) {
    for (const f of state.fighters) {
      if (f.side === "party" && f.hp <= 0 && !f.dead && !f.fled && startDown.has(f.id) && rng.chance(DEATH_ROLL)) {
        f.dead = true;
        events.push({ t: "death", who: f.id });
      }
    }
  }

  state.outcome = outcomeOf(state);
  if (state.outcome) events.push({ t: "end", outcome: state.outcome });
  return { state, events };
}
