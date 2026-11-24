import { t } from "@/i18n";
import type { Event, Fighter } from "@/rules";

export type Tone = "hit" | "miss" | "good" | "info" | "bad";
export interface Line {
  id: string;
  round: number;
  tone: Tone;
  text: string;
}

/** One event as a plain line, with names from the fighters. Events that carry no news (illegal choices) are shown too, so a refusal is never silent. */
export function lineOf(e: Event, round: number, who: (id: string) => string, n: number): Line | null {
  const id = `${round}-${n}`;
  const mk = (tone: Tone, text: string): Line => ({ id, round, tone, text });
  switch (e.t) {
    case "hit":
      return mk("hit", t("log.hit", { by: who(e.by), target: who(e.target), zone: t("zone." + e.zone).toLowerCase(), damage: e.damage }) + (e.guarded ? " " + t("log.guarded") : "") + (e.injury ? " " + t("log.injury", { sev: t("sev." + e.injury).toLowerCase() }) : ""));
    case "miss":
      return mk("miss", t("log.miss", { by: who(e.by), target: who(e.target) }));
    case "power":
      return mk(e.heal > 0 ? "good" : "hit", e.heal > 0 ? t("log.heal", { by: who(e.by), target: who(e.target), heal: e.heal }) : e.damage > 0 ? t("log.powerDamage", { by: who(e.by), target: who(e.target), damage: e.damage }) : t("log.powerEffect", { by: who(e.by), target: who(e.target) }));
    case "item":
      return mk("good", e.heal > 0 ? t("log.itemHeal", { by: who(e.by), target: who(e.target), heal: e.heal }) : t("log.item", { by: who(e.by), target: who(e.target) }));
    case "flee":
      return mk(e.ok ? "info" : "miss", t(e.ok ? "log.fled" : "log.fleeFailed", { by: who(e.by) }));
    case "bleed":
      return mk("bad", t("log.bleed", { who: who(e.who) }));
    case "burn":
      return mk("bad", t("log.burn", { who: who(e.who) }));
    case "down":
      return mk("bad", t("log.down", { who: who(e.who) }));
    case "death":
      return mk("bad", t("log.death", { who: who(e.who) }));
    case "illegal":
      return mk("info", t("log.illegal", { by: who(e.by), why: e.why }));
    case "end":
      return null;
  }
}

export const nameOf = (fighters: readonly Fighter[]) => (id: string) => fighters.find((f) => f.id === id)?.name ?? id;
