import { expect, test } from "bun:test";
import { aiChoices, hitChance, fleeChance, makeRng, maxHpOf, resolveRound, strikeDamage } from "../../src/rules";
import type { Choice } from "../../src/rules";
import { battle, fighter, stubRng } from "./helpers";

const strike = (by: string, target: string, zone: "torso" | "head" = "torso", guard: ("torso" | "head" | "legs")[] = []): Choice => ({ kind: "strike", by, target, zone, guard });

test("the same seed and choices give the same events (replay)", () => {
  const run = (seed: number) => {
    const rng = makeRng(seed);
    let s = battle([fighter("a", "party"), fighter("b", "party"), fighter("x", "foe"), fighter("y", "foe")]);
    const log: unknown[] = [];
    while (!s.outcome) {
      const r = resolveRound(s, aiChoices(s, rng), rng);
      s = r.state;
      log.push(r.events);
    }
    return JSON.stringify([log, s]);
  };
  expect(run(7)).toBe(run(7));
  expect(run(7)).not.toBe(run(8));
});

test("both sides resolve at once: two fighters drop each other in one round", () => {
  const s = battle([fighter("a", "party", { hp: 1 }), fighter("x", "foe", { hp: 1 })]);
  const { state, events } = resolveRound(s, [strike("a", "x"), strike("x", "a")], stubRng(true));
  expect(state.fighters.map((f) => f.hp)).toEqual([0, 0]);
  expect(events.filter((e) => e.t === "down").length).toBe(2);
  expect(state.outcome).toBe("lost");
});

test("the input state is never changed", () => {
  const s = battle([fighter("a", "party"), fighter("x", "foe")]);
  const copy = JSON.stringify(s);
  resolveRound(s, [strike("a", "x")], stubRng(true));
  expect(JSON.stringify(s)).toBe(copy);
});

test("guard: a guarded zone takes a quarter, an open one takes full damage", () => {
  const base = battle([fighter("a", "party", { stats: { might: 4 } }), fighter("x", "foe", { stats: { endurance: 10 } })]);
  const full = strikeDamage(base.fighters[0], "torso");
  const guarded = resolveRound(base, [strike("a", "x"), { kind: "skip", by: "x", guard: ["torso", "head"] }], stubRng(true));
  const open = resolveRound(base, [strike("a", "x"), { kind: "skip", by: "x", guard: ["legs"] }], stubRng(true));
  const hpOf = (r: typeof open) => r.state.fighters[1].hp;
  expect(base.fighters[1].hp - hpOf(guarded)).toBe(Math.max(1, Math.round(full * 0.25)));
  expect(base.fighters[1].hp - hpOf(open)).toBe(full);
});

test("only two guard points; a third zone is ignored", () => {
  const s = battle([fighter("a", "party"), fighter("x", "foe", { stats: { endurance: 10 } })]);
  const r = resolveRound(s, [strike("a", "x", "legs" as never), { kind: "skip", by: "x", guard: ["head", "torso", "legs"] as never }], stubRng(true));
  const ev = r.events.find((e) => e.t === "hit");
  expect(ev && ev.t === "hit" && ev.guarded).toBe(false);
});

test("a backpack item costs one guard point, a belt item costs none", () => {
  const potion = { id: "p", name: "Potion", effect: "heal:5" };
  const mk = () => battle([fighter("a", "party", { backpack: [{ ...potion }], belt: [{ ...potion, id: "b" }] }), fighter("x", "foe", { stats: { might: 8 } })]);
  const hitLegs = (from: "belt" | "backpack", item: string) => {
    const r = resolveRound(mk(), [{ kind: "item", by: "a", from, item, target: "a", guard: ["head", "legs"] }, strike("x", "a", "legs" as never)], stubRng(true));
    const ev = r.events.find((e) => e.t === "hit");
    return ev && ev.t === "hit" ? ev.guarded : null;
  };
  expect(hitLegs("belt", "b")).toBe(true); // both guard points kept
  expect(hitLegs("backpack", "p")).toBe(false); // the second point (legs) was lost
});

test("belt lock: a belt item is only the belt's; an item that is not there is refused", () => {
  const s = battle([fighter("a", "party", { backpack: [{ id: "p", name: "Potion", effect: "heal:5" }] }), fighter("x", "foe")]);
  const r = resolveRound(s, [{ kind: "item", by: "a", from: "belt", item: "p", target: "a", guard: [] }], stubRng(true));
  expect(r.events.some((e) => e.t === "illegal")).toBe(true);
  expect(r.state.fighters[0].backpack.length).toBe(1);
});

test("one power per round: a second choice of the same fighter is ignored; uses run out", () => {
  const power = { id: "spark", name: "Spark", effect: "damage:6:fire", uses: 1 };
  const s = battle([fighter("a", "party", { powers: [power] }), fighter("x", "foe", { stats: { endurance: 10 } })]);
  const pw: Choice = { kind: "power", by: "a", power: "spark", target: "x", guard: [] };
  const r = resolveRound(s, [pw, pw, strike("a", "x")], stubRng(true));
  expect(r.events.filter((e) => e.t === "power").length).toBe(1);
  expect(r.events.filter((e) => e.t === "hit").length).toBe(0);
  expect(r.state.fighters[0].powers[0].uses).toBe(0);
  const again = resolveRound(r.state, [pw], stubRng(true));
  expect(again.events.some((e) => e.t === "illegal")).toBe(true);
});

test("a heal power cannot target an enemy and a damage power cannot target an ally", () => {
  const s = battle([fighter("a", "party", { powers: [{ id: "h", name: "Mend", effect: "heal:5" }, { id: "d", name: "Zap", effect: "damage:5:energy" }] }), fighter("b", "party"), fighter("x", "foe")]);
  expect(resolveRound(s, [{ kind: "power", by: "a", power: "h", target: "x", guard: [] }], stubRng(true)).events.some((e) => e.t === "illegal")).toBe(true);
  expect(resolveRound(s, [{ kind: "power", by: "a", power: "d", target: "b", guard: [] }], stubRng(true)).events.some((e) => e.t === "illegal")).toBe(true);
});

test("heal and damage net out inside a round and HP stays in 0..max", () => {
  const s = battle([fighter("a", "party", { hp: 5, backpack: [{ id: "p", name: "Big", effect: "heal:999" }] }), fighter("x", "foe")]);
  const r = resolveRound(s, [{ kind: "item", by: "a", from: "backpack", item: "p", target: "a", guard: [] }], stubRng(false));
  expect(r.state.fighters[0].hp).toBe(maxHpOf(r.state.fighters[0]));
});

test("a hit of a quarter of max HP or more injures, and the zone effect applies", () => {
  const s = battle([fighter("a", "party", { stats: { might: 10 } }), fighter("x", "foe", { stats: { endurance: 1 } })]);
  const r = resolveRound(s, [strike("a", "x", "head")], stubRng(true));
  const hit = r.events.find((e) => e.t === "hit");
  expect(hit && hit.t === "hit" && hit.injury).toBeTruthy();
  expect(r.state.fighters[1].injuries[0]?.zone).toBe("head");
  expect(hitChance(fighter("y", "foe", { injuries: r.state.fighters[1].injuries }), fighter("z", "party"), "torso")).toBe(85 - 15);
});

test("a belly injury bleeds each round until it is treated", () => {
  const f = fighter("a", "party", { injuries: [{ id: "i", zone: "belly", severity: "serious", since: 0, healsAt: null, treated: false }] });
  const s = battle([f, fighter("x", "foe", { stats: { endurance: 10 } })]);
  const r = resolveRound(s, [{ kind: "skip", by: "a", guard: [] }, { kind: "skip", by: "x", guard: [] }], stubRng(false));
  expect(r.state.fighters[0].hp).toBe(f.hp - 2);
  expect(r.events.some((e) => e.t === "bleed")).toBe(true);
});

test("an item with treat:serious lowers a grave injury to serious and stops the bleeding", () => {
  const f = fighter("a", "party", {
    injuries: [{ id: "i", zone: "belly", severity: "grave", since: 0, healsAt: null, treated: false }],
    belt: [{ id: "kit", name: "Kit", effect: "treat:grave" }],
  });
  const s = battle([f, fighter("x", "foe", { stats: { endurance: 10 } })]);
  const r = resolveRound(s, [{ kind: "item", by: "a", from: "belt", item: "kit", target: "a", guard: [] }], stubRng(false));
  expect(r.state.fighters[0].injuries[0].severity).toBe("serious");
  expect(r.state.fighters[0].injuries[0].treated).toBe(true);
});

test("fleeing: not allowed when the stakes forbid it; a legs injury halves the chance", () => {
  const s = battle([fighter("a", "party"), fighter("x", "foe")], { flee: false });
  expect(resolveRound(s, [{ kind: "flee", by: "a" }], stubRng(true)).events.some((e) => e.t === "illegal")).toBe(true);
  const base = battle([fighter("a", "party"), fighter("x", "foe")]);
  const hurt = battle([fighter("a", "party", { injuries: [{ id: "i", zone: "legs", severity: "light", since: 0, healsAt: 1, treated: false }] }), fighter("x", "foe")]);
  expect(fleeChance(hurt.fighters[0], hurt)).toBe(Math.round(fleeChance(base.fighters[0], base) * 0.5));
});

test("when the whole party flees the outcome is fled; a fallen member makes it lost", () => {
  const s = battle([fighter("a", "party"), fighter("x", "foe")]);
  const r = resolveRound(s, [{ kind: "flee", by: "a" }], stubRng(true));
  expect(r.state.outcome).toBe("fled");
  const two = battle([fighter("a", "party"), fighter("b", "party", { hp: 0 }), fighter("x", "foe")]);
  expect(resolveRound(two, [{ kind: "flee", by: "a" }], stubRng(true)).state.outcome).toBe("lost");
});

test("a timid ally under 30% HP flees by itself", () => {
  const s = battle([fighter("a", "party", { timid: true, hp: 2 }), fighter("x", "foe")]);
  const rng = makeRng(1);
  const picks = aiChoices(s, rng, "party");
  expect(picks[0].kind).toBe("flee");
});

test("the deadly step: a fighter already down can die, others in the round cannot; steps 1-3 never kill", () => {
  const mk = (defeat: 1 | 2 | 3 | 4) => battle([fighter("a", "party", { hp: 0 }), fighter("b", "party"), fighter("x", "foe")], { defeat });
  const four = resolveRound(mk(4), [{ kind: "skip", by: "b", guard: [] }], stubRng(true));
  expect(four.state.fighters[0].dead).toBe(true);
  expect(four.events.some((e) => e.t === "death")).toBe(true);
  const two = resolveRound(mk(2), [{ kind: "skip", by: "b", guard: [] }], stubRng(true));
  expect(two.state.fighters[0].dead).toBe(false);
  const fresh = battle([fighter("a", "party", { hp: 1 }), fighter("x", "foe", { stats: { might: 10 } })], { defeat: 4 });
  expect(resolveRound(fresh, [strike("x", "a")], stubRng(true)).state.fighters[0].dead).toBe(false);
});

test("property: 2000 random battles keep HP in range, end within 60 rounds, and name only known fighters", () => {
  const rng = makeRng(2024);
  for (let n = 0; n < 2000; n++) {
    const mk = (id: string, side: "party" | "foe") =>
      fighter(id, side, {
        level: rng.int(1, 5),
        stats: { might: rng.int(1, 8), agility: rng.int(1, 8), endurance: rng.int(1, 8) },
        timid: rng.chance(0.3),
        backpack: rng.chance(0.5) ? [{ id: "p", name: "Potion", effect: "heal:6" }] : [],
        powers: rng.chance(0.4) ? [{ id: "w", name: "Burn", effect: "burn:2:3", uses: 2 }] : [],
      });
    let s = battle([mk("a", "party"), mk("b", "party"), mk("x", "foe"), mk("y", "foe")], { defeat: rng.int(1, 4) as 1 | 2 | 3 | 4, flee: rng.chance(0.7) });
    const ids = new Set(s.fighters.map((f) => f.id));
    let rounds = 0;
    while (!s.outcome) {
      const r = resolveRound(s, aiChoices(s, rng), rng);
      s = r.state;
      rounds++;
      for (const f of s.fighters) {
        expect(f.hp).toBeGreaterThanOrEqual(0);
        expect(f.hp).toBeLessThanOrEqual(maxHpOf(f));
      }
      for (const e of r.events) {
        for (const k of ["by", "target", "who"] as const) {
          const id = (e as unknown as Record<string, string | undefined>)[k];
          if (id !== undefined) expect(ids.has(id)).toBe(true);
        }
      }
      expect(rounds).toBeLessThanOrEqual(61);
    }
    expect(["won", "lost", "fled", "aborted"]).toContain(s.outcome as string);
  }
});
