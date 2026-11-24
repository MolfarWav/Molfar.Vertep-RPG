import { expect, test } from "bun:test";
import { effectsOf, healByTime, makeInjury, severityOf, treat, applyDefeat, makeRng } from "../../src/rules";
import { battle, fighter, NOW } from "./helpers";

const HOUR = 3600 * 1000;

test("severity by the share of max HP: 25 light, 40 serious, 60 grave, under 25 none", () => {
  expect(severityOf(24, 100)).toBeNull();
  expect(severityOf(25, 100)).toBe("light");
  expect(severityOf(39, 100)).toBe("light");
  expect(severityOf(40, 100)).toBe("serious");
  expect(severityOf(60, 100)).toBe("grave");
  expect(severityOf(5, 0)).toBeNull();
});

test("each zone has its own effect", () => {
  const mk = (zone: "head" | "arms" | "legs" | "torso" | "belly") => effectsOf([makeInjury("i", zone, "light", NOW)]);
  expect(mk("head").hitPenalty).toBe(15);
  expect(mk("arms").damageFactor).toBeCloseTo(0.8);
  expect(mk("legs").fleeFactor).toBe(0.5);
  expect(mk("torso").maxHpFactor).toBeCloseTo(0.9);
  expect(mk("belly").bleed).toBe(2);
  expect(effectsOf([])).toEqual({ hitPenalty: 0, damageFactor: 1, fleeFactor: 1, maxHpFactor: 1, bleed: 0 });
});

test("healing by time: light in a day, serious in a week, grave not at all", () => {
  const list = [makeInjury("l", "arms", "light", NOW), makeInjury("s", "arms", "serious", NOW), makeInjury("g", "arms", "grave", NOW)];
  expect(healByTime(list, NOW + 23 * HOUR).length).toBe(3);
  expect(healByTime(list, NOW + 25 * HOUR).map((i) => i.id)).toEqual(["s", "g"]);
  expect(healByTime(list, NOW + 24 * 8 * HOUR).map((i) => i.id)).toEqual(["g"]);
  expect(healByTime(list, NOW + 24 * 365 * HOUR).map((i) => i.id)).toEqual(["g"]);
});

test("treatment lowers one step, only injuries of that severity or lower, and restarts the clock", () => {
  const list = [makeInjury("l", "arms", "light", NOW), makeInjury("s", "legs", "serious", NOW), makeInjury("g", "head", "grave", NOW)];
  const out = treat(list, "serious", NOW + HOUR);
  expect(out.map((i) => [i.id, i.severity])).toEqual([["s", "light"], ["g", "grave"]]);
  expect(out[0].treated).toBe(true);
  expect(out[0].healsAt).toBe(NOW + HOUR + 24 * HOUR);
  const grave = treat(list, "grave", NOW);
  expect(grave.find((i) => i.id === "g")?.severity).toBe("serious");
  expect(grave.find((i) => i.id === "g")?.healsAt).not.toBeNull();
});

test("defeat ladder: step 1 robbed, 2 wounded, 3 captured, 4 deadly", () => {
  const down = () => battle([fighter("a", "party", { hp: 0 }), fighter("b", "party", { hp: 0, dead: true }), fighter("c", "party"), fighter("x", "foe")], { defeat: 1 });
  const at = (step: 1 | 2 | 3 | 4) => {
    const s = down();
    s.stakes.defeat = step;
    return applyDefeat(s, makeRng(1), "b");
  };
  const one = at(1);
  expect(one.fallen.find((f) => f.id === "a")).toMatchObject({ hp: 1, injury: null, loot: "all", dead: false });
  expect(one.sceneMoves).toBe(false);
  const two = at(2);
  expect(two.fallen.find((f) => f.id === "a")?.injury?.severity).toBe("serious");
  expect(two.fallen.find((f) => f.id === "a")?.loot).toBe("part");
  const three = at(3);
  expect(three.fallen.find((f) => f.id === "a")?.injury?.severity).toBe("grave");
  expect(three.fallen.find((f) => f.id === "a")?.itemsTaken).toBe(true);
  expect(three.sceneMoves).toBe(true);
  const four = at(4);
  expect(four.fallen.find((f) => f.id === "b")?.dead).toBe(true);
  expect(four.fallen.find((f) => f.id === "a")?.dead).toBe(false);
  expect(four.offer).toEqual(["continue-as", "branch-before"]);
  expect(one.fallen.some((f) => f.id === "c")).toBe(false);
  expect(at(2).offer).toEqual([]);
});
