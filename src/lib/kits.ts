// What each fighter carries: a backpack (everything gathered; taking from it in a fight burns one guard point) and a belt
// (three slots, free to use, filled only before the fight). The pure functions are what the muster screen and the tests use;
// the hook keeps the kits per fighter and remembers them in this browser.
import { useCallback, useEffect, useState } from "react";
import { exampleBackpack, makeItem } from "@/data/items";
import type { Item } from "@/rules";

export const BELT_SLOTS = 3;

export interface Kit {
  backpack: Item[];
  belt: Item[];
}

export type MoveResult = { kit: Kit } | { error: "full" | "missing" | "locked" };

export function toBelt(kit: Kit, itemId: string, locked = false): MoveResult {
  if (locked) return { error: "locked" };
  const item = kit.backpack.find((i) => i.id === itemId);
  if (!item) return { error: "missing" };
  if (kit.belt.length >= BELT_SLOTS) return { error: "full" };
  return { kit: { backpack: kit.backpack.filter((i) => i.id !== itemId), belt: [...kit.belt, item] } };
}

export function toBackpack(kit: Kit, itemId: string, locked = false): MoveResult {
  if (locked) return { error: "locked" };
  const item = kit.belt.find((i) => i.id === itemId);
  if (!item) return { error: "missing" };
  return { kit: { backpack: [...kit.backpack, item], belt: kit.belt.filter((i) => i.id !== itemId) } };
}

/** The example kit of an example hero; a real character starts with an empty one. */
export function initialKit(id: string): Kit {
  if (!id.startsWith("ex-")) return { backpack: [], belt: [] };
  if (id === "ex-ember") return { backpack: [makeItem("herbs", 9), makeItem("charm", 9)], belt: [] };
  return { backpack: exampleBackpack().filter((i) => !["bandage#1", "moss#1"].includes(i.id)), belt: [makeItem("bandage", 1), makeItem("moss", 1)] };
}

const KEY = "rpg:kits";
const isItem = (v: unknown): v is Item => !!v && typeof v === "object" && typeof (v as Item).id === "string" && typeof (v as Item).effect === "string" && typeof (v as Item).name === "string";

function load(): Record<string, Kit> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, { backpack?: unknown; belt?: unknown }>;
    const out: Record<string, Kit> = {};
    for (const [id, k] of Object.entries(raw)) {
      if (Array.isArray(k?.backpack) && Array.isArray(k?.belt)) out[id] = { backpack: k.backpack.filter(isItem), belt: k.belt.filter(isItem).slice(0, BELT_SLOTS) };
    }
    return out;
  } catch {
    return {};
  }
}

export interface KitsApi {
  kitOf: (id: string) => Kit;
  /** The reason a move was refused, or "" when it worked. */
  move: (id: string, itemId: string, to: "belt" | "backpack", locked: boolean) => "" | "full" | "missing" | "locked";
  /** A key that changes whenever any kit does, for an effect that has to follow them. */
  version: number;
}

export function useKits(): KitsApi {
  const [kits, setKits] = useState<Record<string, Kit>>(load);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(kits));
    } catch {
      // storage can be blocked
    }
  }, [kits]);
  const kitOf = useCallback((id: string): Kit => kits[id] ?? initialKit(id), [kits]);
  const move = useCallback(
    (id: string, itemId: string, to: "belt" | "backpack", locked: boolean) => {
      const base = kits[id] ?? initialKit(id);
      const r = to === "belt" ? toBelt(base, itemId, locked) : toBackpack(base, itemId, locked);
      if ("error" in r) return r.error;
      setKits((old) => ({ ...old, [id]: r.kit }));
      setVersion((v) => v + 1);
      return "";
    },
    [kits],
  );
  return { kitOf, move, version };
}
