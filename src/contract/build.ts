// Pure helpers between the contract and the app: the sheets of a party that comes from a chat, and the result of a fight.
import type { Entry } from "@/data/fixtures";
import type { Lang } from "@/i18n";
import { tIn } from "@/i18n";
import { cleanSheet, maxHpOf, tableSheet } from "@/rules";
import type { BattleState, DefeatResult } from "@/rules";
import { CONTRACT } from "./index";
import type { Encounter, FighterResult, Result } from "./index";

const fnv = (s: string): string => {
  let h = 0x811c9dc5;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(36);
};

/** The id of a sheet made for a person of a chat: the same chat and person always give the same id, and it is a safe file name. */
export const entryIdFor = (enc: Pick<Encounter, "chatId" | "id">, personId: string): string => `s-${fnv(enc.chatId || enc.id)}-${personId.replace(/[^A-Za-z0-9_-]/g, "_")}`.slice(0, 60);

/** The sheets of an encounter's party, made from the table and the Soul numbers the chat sent (a sheet saved earlier wins). */
export function partyEntries(enc: Encounter): Entry[] {
  return enc.party.map((p) => {
    const base = tableSheet(p.name, p.soul ?? undefined);
    const sheet = cleanSheet({ ...base, role: p.role });
    return { id: entryIdFor(enc, p.id), sheet, proposal: JSON.parse(JSON.stringify(sheet)) };
  });
}

/** The result of a finished fight, as the contract says; `idMap` turns a sheet id back into the person's id in the chat. */
export function buildResult(enc: Encounter, battle: BattleState, idMap: Record<string, string>, defeat: DefeatResult | null, seed: number, lang: Lang): Result {
  const party: FighterResult[] = battle.fighters
    .filter((f) => f.side === "party")
    .map((f) => {
      const fallen = defeat?.fallen.find((x) => x.id === f.id);
      const injuries = [...f.injuries, ...(fallen?.injury ? [fallen.injury] : [])].map((i) => ({ zone: i.zone, severity: i.severity }));
      const dead = f.dead || fallen?.dead === true;
      const hpMax = maxHpOf(f);
      return { id: idMap[f.id] ?? f.id, name: f.name, hp: dead ? 0 : fallen ? Math.min(fallen.hp, hpMax) : f.hp, hpMax, fled: f.fled, dead, injuries };
    });
  const foes = battle.fighters.filter((f) => f.side === "foe").map((f) => ({ name: f.name, hp: f.hp, hpMax: maxHpOf(f) }));
  const outcome = battle.outcome ?? "aborted";
  const result: Result = { contract: CONTRACT, encounterId: enc.id, outcome, defeatApplied: outcome === "lost" ? enc.stakes.defeat : null, party, foes, loot: [], summary: "", rounds: battle.round, seed, at: Date.now() };
  result.summary = summaryText(lang, result);
  return result;
}

/** One short paragraph of facts for the chat, in the chat's language. The chat's own model writes the prose from it. */
export function summaryText(lang: Lang, r: Result): string {
  const t = (k: string, v?: Record<string, string | number>) => tIn(lang, k, v);
  const head = t("outcome." + r.outcome + ".text", { rounds: r.rounds });
  const who = r.party
    .map((p) => {
      const state = p.dead ? t("battle.dead") : p.fled ? t("battle.fled") : `${p.hp}/${p.hpMax}`;
      const inj = p.injuries.length ? ` (${p.injuries.map((i) => `${t("sev." + i.severity).toLowerCase()}, ${t("zone." + i.zone).toLowerCase()}`).join("; ")})` : "";
      return `${p.name} ${state}${inj}`;
    })
    .join("; ");
  const loot = r.loot.length ? t("res.loot", { items: r.loot.map((l) => l.name).join(", ") }) : t("res.noLoot");
  return `${head} ${who}. ${loot}`.slice(0, 600);
}
