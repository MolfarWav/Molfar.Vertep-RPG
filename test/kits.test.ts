import { expect, test } from "bun:test";
import { BELT_SLOTS, initialKit, toBackpack, toBelt } from "../src/lib/kits";
import { CATEGORIES, KINDS, exampleBackpack, kindOf, makeItem } from "../src/data/items";
import { parseEffect } from "../src/rules";

const kit = () => ({ backpack: [makeItem("bandage", 1), makeItem("herbs", 1), makeItem("moss", 1), makeItem("tonic", 1)], belt: [] });

test("an item moves to the belt and back, and nothing is lost or doubled", () => {
  const start = kit();
  const r = toBelt(start, "bandage#1");
  if (!("kit" in r)) throw new Error("refused");
  expect(r.kit.belt.map((i) => i.id)).toEqual(["bandage#1"]);
  expect(r.kit.backpack.length).toBe(3);
  const back = toBackpack(r.kit, "bandage#1");
  if (!("kit" in back)) throw new Error("refused");
  expect(back.kit.belt).toEqual([]);
  expect([...back.kit.backpack.map((i) => i.id)].sort()).toEqual(start.backpack.map((i) => i.id).sort());
  expect(start.backpack.length).toBe(4); // the input kit is never changed
});

test("the belt holds three, the fourth is refused with a reason", () => {
  let k = kit();
  for (const id of ["bandage#1", "herbs#1", "moss#1"]) {
    const r = toBelt(k, id);
    if (!("kit" in r)) throw new Error("refused " + id);
    k = r.kit;
  }
  expect(k.belt.length).toBe(BELT_SLOTS);
  expect(toBelt(k, "tonic#1")).toEqual({ error: "full" });
});

test("a locked belt refuses every move, and a missing item is reported", () => {
  expect(toBelt(kit(), "bandage#1", true)).toEqual({ error: "locked" });
  const r = toBelt(kit(), "bandage#1");
  if (!("kit" in r)) throw new Error("refused");
  expect(toBackpack(r.kit, "bandage#1", true)).toEqual({ error: "locked" });
  expect(toBelt(kit(), "nope#1")).toEqual({ error: "missing" });
  expect(toBackpack(kit(), "bandage#1")).toEqual({ error: "missing" });
});

test("every example item kind has both languages, a known category, and ids are unique", () => {
  for (const [name, k] of Object.entries(KINDS)) {
    expect(CATEGORIES).toContain(k.cat);
    for (const t of [k.name, k.lore, k.from, ...(k.fx ? [k.fx] : [])]) {
      expect(t.en.trim(), name).not.toBe("");
      expect(t.uk.trim(), name).not.toBe("");
    }
    // a kind the rules cannot use has to say what it does
    if (parseEffect(k.effect) === null) expect(k.fx, name).toBeDefined();
  }
  const ids = exampleBackpack().map((i) => i.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => kindOf(id) in KINDS)).toBe(true);
  expect(ids.length).toBeGreaterThan(14); // long enough to need the search and the scrolling
});

test("example kits: the party starts with a belt of two, a real character with nothing", () => {
  expect(initialKit("ex-vlad").belt.length).toBe(2);
  expect(initialKit("ex-vlad").backpack.every((i) => !initialKit("ex-vlad").belt.some((b) => b.id === i.id))).toBe(true);
  expect(initialKit("some-card")).toEqual({ backpack: [], belt: [] });
});

import { mergeLoaded } from "../src/lib/sheets-store";
import { tableSheet } from "../src/rules";

test("the saved list arriving after a party was added keeps both, and a saved sheet wins", () => {
  const mk = (id: string, name: string) => ({ id, sheet: tableSheet(name), proposal: null });
  const saved = [mk("a", "Saved A"), mk("b", "Saved B")];
  const memory = [mk("b", "Fresh B"), mk("c", "Fresh C")];
  const out = mergeLoaded(saved, memory);
  expect(out.map((e) => e.id)).toEqual(["a", "b", "c"]);
  expect(out.find((e) => e.id === "b")?.sheet.name).toBe("Saved B");
  expect(mergeLoaded([], memory).map((e) => e.id)).toEqual(["b", "c"]);
  expect(mergeLoaded(saved, [])).toEqual(saved);
});
