import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { dictionary } from "@/i18n/index";
import { SKIN_WORDS, SKINS } from "@/data/skins";
import { STATS, ZONES } from "@/rules";

const root = path.resolve(import.meta.dir, "..");
const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name === "node_modules" || e.name === ".git" ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

test("app manifest is an RPG app and names the app contract, not an engine release", () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  expect(m.kind).toBe("app");
  expect(m.name).toBe("RPG");
  expect(m.repository).toContain("Molfar.Vertep-RPG");
  expect(m.engine).toBe(">=1.0.0");
});

test("English and Ukrainian strings have the same keys", () => {
  expect(Object.keys(dictionary.uk).sort()).toEqual(Object.keys(dictionary.en).sort());
  for (const lang of ["en", "uk"] as const) for (const [k, v] of Object.entries(dictionary[lang])) expect(v.trim(), `${lang} ${k}`).not.toBe("");
});

test("every key the UI asks for exists, and so does every key built from a list", () => {
  const used = new Set<string>();
  for (const f of walk(path.join(root, "src")).filter((x) => /\.tsx?$/.test(x))) {
    const text = fs.readFileSync(f, "utf8");
    for (const m of text.matchAll(/\bt\("([A-Za-z0-9_.]+)"\s*[,)]/g)) used.add(m[1]);
  }
  for (const k of STATS) {
    used.add("stat." + k);
    used.add("stat." + k + ".hint");
  }
  for (const z of ZONES) used.add("zone." + z);
  for (const s of ["light", "serious", "grave"]) used.add("sev." + s);
  for (const s of SKINS) {
    used.add("skin." + s);
    for (const w of SKIN_WORDS) used.add(`skin.${s}.${w}`);
  }
  for (const o of ["won", "lost", "fled", "aborted"]) {
    used.add("outcome." + o);
    used.add("outcome." + o + ".text");
  }
  for (let i = 1; i <= 4; i++) used.add("defeat.step" + i);
  const missing = [...used].filter((k) => !(k in dictionary.en) && !k.endsWith("."));
  expect(missing).toEqual([]);
});

test("a string that takes a value has the same placeholders in both languages (the guard hint's {word} may differ)", () => {
  for (const [k, en] of Object.entries(dictionary.en)) {
    if (k === "battle.guardHint") continue;
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    expect(ph(dictionary.uk[k]), k).toEqual(ph(en));
  }
});

test("no model names or personal paths in repo text files", () => {
  const bad = new RegExp("claude-(opus|sonnet|haiku|fable)|C:" + String.fromCharCode(92, 92) + "Users", "i");
  for (const f of walk(root).filter((x) => /\.(ts|tsx|md|json|css|js|html)$/.test(x) && !x.endsWith("skeleton.test.ts") && !x.endsWith("bun.lock"))) {
    expect(bad.test(fs.readFileSync(f, "utf8")), f).toBe(false);
  }
});
