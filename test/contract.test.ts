import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { CONTRACT, checkVersion, parseEncounter, parseResult } from "../src/contract";
import { foeSheet, foeStats } from "../src/rules/foes";
import { hpMax, statBudget, sumStats } from "../src/rules";

const dir = path.resolve(import.meta.dir, "../docs/contract/v0.1");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));

test("the example encounter and result are valid and survive a parse unchanged in shape", () => {
  const e = parseEncounter(read("encounter.example.json"));
  expect(e.ok).toBe(true);
  if (!e.ok) return;
  expect(e.value.party.map((p) => p.name)).toEqual(["Vlad", "Medli", "Ember"]);
  expect(e.value.party[0].hero).toBe(true);
  expect(e.value.foes[0].archetype).toBe("scout");
  expect(e.value.stakes).toEqual({ flee: true, defeat: 2 });
  const r = parseResult(read("result.example.json"));
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.party[0].injuries).toEqual([{ zone: "arms", severity: "light" }]);
  expect(r.value.contract).toBe(CONTRACT);
});

test("an unknown major version is refused in plain words, a newer minor is read", () => {
  expect(checkVersion("1.0")).toContain("1.0");
  expect(checkVersion("0.9")).toBeNull();
  expect(checkVersion(undefined)).toContain("does not say");
  const bad = parseEncounter({ ...read("encounter.example.json"), contract: "2.1" });
  expect(bad.ok).toBe(false);
  if (!bad.ok) expect(bad.reason).toContain("update the app that is older");
});

test("a hostile or sloppy encounter is cut down, never trusted", () => {
  const raw = {
    ...read("encounter.example.json"),
    id: "enc-ok1",
    scene: "<b>x</b>".repeat(500),
    party: [{ id: "a b", name: "Bad id" }, { id: "p1", name: "A", hero: false }, { id: "p1", name: "Dup" }, { id: "p2", name: "B", hero: true }, ...Array.from({ length: 10 }, (_, i) => ({ id: "x" + i, name: "n" + i }))],
    foes: Array.from({ length: 20 }, (_, i) => ({ name: "Foe " + i, level: 99, archetype: "dragon" })),
    stakes: { flee: "yes", defeat: 9 },
    skin: "steampunk",
    language: "fr",
  };
  const r = parseEncounter(raw);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.scene.length).toBeLessThanOrEqual(400);
  expect(r.value.scene).not.toContain("<");
  expect(r.value.party.length).toBeLessThanOrEqual(4);
  expect(r.value.party[0].id).toBe("p2"); // the hero goes first
  expect(r.value.party.filter((p) => p.hero).length).toBe(1);
  expect(new Set(r.value.party.map((p) => p.id)).size).toBe(r.value.party.length);
  expect(r.value.foes.length).toBe(6);
  expect(r.value.foes[0]).toMatchObject({ level: 10, archetype: "balanced" });
  expect(r.value.stakes).toEqual({ flee: true, defeat: 4 });
  expect(r.value.skin).toBe("fantasy");
  expect(r.value.language).toBe("en");
});

test("an encounter without an id, a party or foes is refused with a reason", () => {
  const base = read("encounter.example.json");
  for (const [patch, word] of [[{ id: "Bad Id" }, "id"], [{ party: [] }, "party"], [{ foes: [] }, "opponents"], [{ party: "x" }, "party"]] as const) {
    const r = parseEncounter({ ...base, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(word);
  }
  expect(parseEncounter(null).ok).toBe(false);
  expect(parseEncounter("x").ok).toBe(false);
});

test("a result is clamped: hp inside its max, bad injuries dropped, outcome required", () => {
  const raw = { ...read("result.example.json"), party: [{ id: "user", name: "V", hp: 999, hpMax: 10, injuries: [{ zone: "tail", severity: "light" }, { zone: "arms", severity: "doom" }, { zone: "legs", severity: "grave" }] }], loot: Array.from({ length: 30 }, (_, i) => ({ name: "i" + i })), summary: "s".repeat(2000) };
  const r = parseResult(raw);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.party[0].hp).toBe(10);
  expect(r.value.party[0].injuries).toEqual([{ zone: "legs", severity: "grave" }]);
  expect(r.value.loot.length).toBe(12);
  expect(r.value.summary.length).toBeLessThanOrEqual(600);
  expect(parseResult({ ...raw, outcome: "draw" }).ok).toBe(false);
  expect(parseResult({ ...raw, encounterId: "Bad" }).ok).toBe(false);
});

test("foe stats follow the archetype and always fit the level's budget", () => {
  for (let level = 1; level <= 10; level++) {
    for (const a of ["balanced", "brute", "scout", "archer", "caster", "tank"] as const) {
      const s = foeStats(level, a);
      expect(sumStats(s)).toBe(statBudget(level));
      for (const v of Object.values(s)) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      }
    }
  }
  expect(foeStats(3, "brute").might).toBeGreaterThan(foeStats(3, "brute").wits);
  expect(foeStats(3, "scout").agility).toBeGreaterThan(foeStats(3, "scout").endurance);
  expect(foeStats(3, "caster").wits).toBeGreaterThan(foeStats(3, "caster").might);
});

test("a foe sheet takes its own level, else one under the party's, and has HP", () => {
  expect(foeSheet({ name: "A", level: 4, archetype: "brute" }, 1).level).toBe(4);
  expect(foeSheet({ name: "B", level: null, archetype: "scout" }, 3).level).toBe(2);
  expect(foeSheet({ name: "C", level: null, archetype: "scout" }, 1).level).toBe(1);
  expect(hpMax(foeSheet({ name: "D", level: 2, archetype: "tank" }, 2))).toBeGreaterThan(10);
});

import { buildResult, entryIdFor, partyEntries, summaryText } from "../src/contract/build";
import { aiChoices, applyDefeat, fighterFromSheet, makeRng, resolveRound } from "../src/rules";
import type { BattleState } from "../src/rules";

const encounter = () => {
  const p = parseEncounter(read("encounter.example.json"));
  if (!p.ok) throw new Error(p.reason);
  return p.value;
};

test("a party from a chat gets sheets: stable ids, the role kept, the Soul turned into numbers, one hero first", () => {
  const enc = encounter();
  const list = partyEntries(enc);
  expect(list.map((e) => e.sheet.name)).toEqual(["Vlad", "Medli", "Ember"]);
  expect(list[0].sheet.role).toBe("Swordsman");
  expect(list.every((e) => /^[A-Za-z0-9_-]{1,60}$/.test(e.id))).toBe(true);
  expect(new Set(list.map((e) => e.id)).size).toBe(3);
  expect(list[0].id).toBe(entryIdFor(enc, "user"));
  expect(entryIdFor(enc, "user")).toBe(entryIdFor({ ...enc }, "user"));
  expect(list[1].sheet.courage).toBeLessThan(50); // Medli: unsure and shy
  expect(list[2].sheet.courage).toBeGreaterThan(50); // Ember: bold and reckless
});

function played(seed: number) {
  const enc = encounter();
  const party = partyEntries(enc).map((e) => fighterFromSheet(e.sheet, { id: e.id, side: "party" }));
  const foes = enc.foes.map((f, i) => fighterFromSheet(foeSheet(f, 1), { id: `foe-${i}`, side: "foe" }));
  let s: BattleState = { round: 0, fighters: [...party, ...foes], stakes: enc.stakes, outcome: null, now: 0 };
  const rng = makeRng(seed);
  while (!s.outcome) s = resolveRound(s, aiChoices(s, rng), rng).state;
  return { enc, s };
}

test("the result of a fight follows the contract and names people by their id in the chat", () => {
  const { enc, s } = played(11);
  const idMap = Object.fromEntries(enc.party.map((p) => [entryIdFor(enc, p.id), p.id]));
  const defeat = s.outcome === "lost" ? applyDefeat(s, makeRng(5), entryIdFor(enc, "user")) : null;
  const r = buildResult(enc, s, idMap, defeat, 11, "en");
  const back = parseResult(r);
  expect(back.ok).toBe(true);
  expect(r.encounterId).toBe(enc.id);
  expect(r.party.map((p) => p.id)).toEqual(["user", "p1", "p2"]);
  expect(r.foes.length).toBe(2);
  expect(r.rounds).toBe(s.round);
  expect(r.summary.length).toBeGreaterThan(10);
  for (const p of r.party) expect(p.hp).toBeLessThanOrEqual(p.hpMax);
  expect(r.defeatApplied).toBe(r.outcome === "lost" ? 2 : null);
});

test("a lost fight adds the defeat step's wounds and keeps the dead dead", () => {
  const enc = encounter();
  const base = played(3).s;
  const lost: BattleState = { ...base, outcome: "lost", stakes: { flee: true, defeat: 4 }, fighters: base.fighters.map((f) => (f.side === "party" ? { ...f, hp: 0, dead: f.name === "Ember" } : f)) };
  const idMap = Object.fromEntries(enc.party.map((p) => [entryIdFor(enc, p.id), p.id]));
  const d = applyDefeat(lost, makeRng(1), entryIdFor(enc, "user"));
  const r = buildResult({ ...enc, stakes: { flee: true, defeat: 4 } }, lost, idMap, d, 1, "uk");
  expect(r.outcome).toBe("lost");
  expect(r.defeatApplied).toBe(4);
  expect(r.party.find((p) => p.id === "p2")?.dead).toBe(true);
  expect(r.party.find((p) => p.id === "p2")?.hp).toBe(0);
  expect(r.summary).toContain("Ember");
});

test("the summary is written in the chat's language, with the wounds and the loot", () => {
  const r = parseResult(read("result.example.json"));
  if (!r.ok) throw new Error(r.reason);
  const en = summaryText("en", r.value);
  const uk = summaryText("uk", r.value);
  expect(en).toContain("Vlad 22/34 (light, arms)");
  expect(en).toContain("No loot.");
  expect(uk).toContain("Vlad 22/34 (легке, руки)");
  expect(uk).toContain("Без здобичі.");
  expect(uk).not.toBe(en);
});
