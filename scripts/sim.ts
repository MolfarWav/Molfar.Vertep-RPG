// A command-line runner: N seeded battles of side A against side B, both led by the code opponent.
//   bun run sim -- --n 10000 --a fixtures/party4.json --b fixtures/goblins2.json [--seed 1] [--defeat 2] [--no-flee]
// Prints the win rate of A, the mean rounds and the mean injuries. Same seed, same table.
import fs from "node:fs";
import { aiChoices, cleanSheet, fighterFromSheet, makeRng, resolveRound, TIMID_COURAGE } from "../src/rules";
import type { BattleState, Fighter } from "../src/rules";

const argv = process.argv.slice(2);
const opt = (name: string, dflt: string): string => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const n = Number(opt("n", "10000"));
const seed = Number(opt("seed", "1"));
const defeat = Number(opt("defeat", "2")) as 1 | 2 | 3 | 4;
const flee = !argv.includes("--no-flee");
const load = (path: string, side: "party" | "foe", prefix: string): Fighter[] =>
  (JSON.parse(fs.readFileSync(path, "utf8")) as Record<string, unknown>[]).map((row, i) => {
    const sheet = cleanSheet({ courage: 50, ...row });
    const f = fighterFromSheet(sheet, { id: `${prefix}${i + 1}`, side, weapon: typeof row.weapon === "number" ? row.weapon : 1 });
    return { ...f, timid: sheet.courage < TIMID_COURAGE };
  });

const a = load(opt("a", "fixtures/party4.json"), "party", "a");
const b = load(opt("b", "fixtures/goblins2.json"), "foe", "b");
let won = 0;
let lost = 0;
let other = 0;
let rounds = 0;
let injuries = 0;
for (let k = 0; k < n; k++) {
  const rng = makeRng(seed * 1_000_003 + k);
  let s: BattleState = { round: 0, fighters: JSON.parse(JSON.stringify([...a, ...b])), stakes: { flee, defeat }, outcome: null, now: 0 };
  while (!s.outcome) s = resolveRound(s, aiChoices(s, rng), rng).state;
  if (s.outcome === "won") won++;
  else if (s.outcome === "lost") lost++;
  else other++;
  rounds += s.round;
  injuries += s.fighters.filter((f) => f.side === "party").reduce((x, f) => x + f.injuries.length, 0);
}
const pct = (x: number) => ((100 * x) / n).toFixed(1) + "%";
console.log(`battles ${n}, seed ${seed}, defeat step ${defeat}, flee ${flee ? "allowed" : "forbidden"}`);
console.log(`A wins ${pct(won)} | A loses ${pct(lost)} | fled or aborted ${pct(other)}`);
console.log(`mean rounds ${(rounds / n).toFixed(2)} | mean injuries on A ${(injuries / n).toFixed(2)}`);
