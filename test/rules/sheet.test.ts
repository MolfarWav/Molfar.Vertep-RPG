import { expect, test } from "bun:test";
import {
  addXp, canLevelUp, cleanSheet, clampStatsToBudget, courageFromSoul, freeSkillRanks, freeStatPoints, hpMax, levelUp, spendSkill,
  spendStat, sumStats, tableSheet, xpFor, statBudget, STATS, MAX_LEVEL,
} from "../../src/rules";
import type { Stats } from "../../src/rules";

const stats = (n: number): Stats => ({ might: n, agility: n, endurance: n, wits: n, spirit: n });

test("clampStatsToBudget never raises a stat and always fits the budget", () => {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    for (const s of [stats(10), stats(7), { might: 10, agility: 1, endurance: 10, wits: 1, spirit: 10 }]) {
      const out = clampStatsToBudget(s, level);
      expect(sumStats(out)).toBeLessThanOrEqual(Math.max(statBudget(level), 5));
      for (const k of STATS) {
        expect(out[k]).toBeLessThanOrEqual(s[k]);
        expect(out[k]).toBeGreaterThanOrEqual(1);
      }
    }
  }
});

test("a model's 9999 strength is clamped, junk is repaired, unknown keys dropped", () => {
  const s = cleanSheet({ name: "Goblin", level: 99, stats: { might: 9999, agility: "fast", endurance: -4 }, skills: [{ name: "Stab", rank: 40 }, { name: "stab", rank: 2 }, "x"], money: -5, evil: true });
  expect(s.level).toBe(10);
  expect(s.stats.might).toBeLessThanOrEqual(10);
  expect(s.stats.endurance).toBe(1);
  expect(s.stats.agility).toBe(3);
  expect(sumStats(s.stats)).toBeLessThanOrEqual(statBudget(10));
  expect(s.skills).toEqual([{ name: "Stab", rank: 5 }]);
  expect(s.money).toBe(0);
  expect("evil" in s).toBe(false);
  expect(cleanSheet(null, "Nobody").name).toBe("Nobody");
});

test("skills are cut to the skill budget", () => {
  const skills = Array.from({ length: 8 }, (_, i) => ({ name: "s" + i, rank: 5 }));
  const s = cleanSheet({ level: 1, skills });
  expect(s.skills.reduce((a, k) => a + k.rank, 0)).toBeLessThanOrEqual(5);
});

test("max HP follows endurance and level, and a torso injury takes a tenth", () => {
  const s = cleanSheet({ level: 1, stats: { endurance: 4 } });
  expect(hpMax(s)).toBe(10 + 3 * 4 + 2);
  const torso = [{ id: "i", zone: "torso" as const, severity: "light" as const, since: 0, healsAt: 1, treated: false }];
  expect(hpMax(s, torso)).toBe(Math.floor(24 * 0.9));
});

test("levels: the XP table, no level-up without XP, free points after it", () => {
  expect([1, 2, 3, 4, 5, 10].map(xpFor)).toEqual([0, 100, 300, 600, 1000, 4500]);
  let s = cleanSheet({ level: 1, stats: stats(3) });
  expect(freeStatPoints(s)).toBe(3);
  expect(canLevelUp(s)).toBe(false);
  expect(levelUp(s)).toBeNull();
  s = addXp(s, 99);
  expect(canLevelUp(s)).toBe(false);
  s = addXp(s, 1);
  expect(canLevelUp(s)).toBe(true);
  const up = levelUp(s)!;
  expect(up.level).toBe(2);
  expect(freeStatPoints(up)).toBe(3 + 3);
  expect(freeSkillRanks(up)).toBe(6);
  expect(hpMax(up)).toBeGreaterThan(hpMax(s));
});

test("level-up keeps current HP in step with max HP, and the cap holds", () => {
  const s = addXp(cleanSheet({ level: 1, stats: stats(3), hpNow: 5 }), 100);
  const up = levelUp(s)!;
  expect(up.hpNow).toBe(5 + (hpMax(up) - hpMax(s)));
  const top = addXp(cleanSheet({ level: 10 }), 100000);
  expect(levelUp(top)).toBeNull();
});

test("spending free points: only while free, never past the top", () => {
  let s = cleanSheet({ level: 1, stats: stats(3) });
  s = spendStat(s, "might")!;
  s = spendStat(s, "might")!;
  s = spendStat(s, "wits")!;
  expect(freeStatPoints(s)).toBe(0);
  expect(spendStat(s, "spirit")).toBeNull();
  expect(spendSkill(cleanSheet({ level: 1 }), "Stealth")?.skills).toEqual([{ name: "Stealth", rank: 1 }]);
  const none = cleanSheet({ level: 1, skills: [{ name: "a", rank: 5 }] });
  expect(spendSkill(none, "b")).toBeNull();
});

test("endurance raises current HP with max HP when a point is spent", () => {
  const s = cleanSheet({ level: 2, stats: { might: 3, agility: 3, endurance: 3, wits: 3, spirit: 3 }, hpNow: 10 });
  const next = spendStat(s, "endurance")!;
  expect(next.hpNow).toBe(13);
});

test("courage comes from the Soul's traits, 50 without one", () => {
  expect(courageFromSoul(undefined)).toBe(50);
  expect(courageFromSoul({ traits: { confidence: 90, shyness: 10 }, spectra: { cautious_reckless: 90 } })).toBe(90);
  expect(courageFromSoul({ traits: { confidence: 10, shyness: 90 }, spectra: { cautious_reckless: 10 } })).toBe(10);
});

test("the table sheet fits level 1 and needs no model", () => {
  const plain = tableSheet("Ann");
  expect(plain.level).toBe(1);
  expect(sumStats(plain.stats)).toBe(15);
  const bold = tableSheet("Rex", { traits: { dominance: 80, confidence: 80, curiosity: 80, patience: 80 }, spectra: { cautious_reckless: 80 } });
  expect(sumStats(bold.stats)).toBeLessThanOrEqual(statBudget(1));
  expect(bold.stats.might).toBe(4);
  expect(bold.courage).toBeGreaterThan(60);
});
