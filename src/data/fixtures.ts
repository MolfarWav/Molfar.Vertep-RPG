// The example party and encounter. Real sheets come from Roleplay characters and real encounters from a chat
// (later phases); until then the app shows these, so every screen can be seen and tried.
import { cleanSheet, tableSheet } from "@/rules";
import type { FighterKit, Item, Power, Sheet } from "@/rules";

export interface Entry {
  id: string;
  sheet: Sheet;
  /** What the sheet was when it was made; "Reset spent points" goes back to it. */
  proposal: Sheet | null;
}

const hero = (id: string, o: Record<string, unknown>): Entry => {
  const sheet = cleanSheet(o);
  return { id, sheet, proposal: JSON.parse(JSON.stringify(sheet)) };
};

export function exampleParty(): Entry[] {
  return [
    hero("ex-garret", { name: "Garret", role: "Swordsman", level: 3, xp: 450, stats: { might: 6, agility: 5, endurance: 6, wits: 3, spirit: 4 }, skills: [{ name: "Swords", rank: 3 }, { name: "Shields", rank: 2 }], money: 42, currency: "coins", courage: 74, note: "A veteran guard: strong and durable, little magic." }),
    hero("ex-medli", { name: "Medli", role: "Healer", level: 3, xp: 340, stats: { might: 3, agility: 4, endurance: 5, wits: 5, spirit: 7 }, skills: [{ name: "Herbs", rank: 3 }, { name: "Calm", rank: 2 }], money: 18, currency: "coins", courage: 28, note: "Gentle and careful; the spirit of the party, easily frightened." }),
    hero("ex-ember", { name: "Ember", role: "Fire mage", level: 3, xp: 600, stats: { might: 3, agility: 4, endurance: 4, wits: 8, spirit: 5 }, skills: [{ name: "Fire", rank: 4 }], money: 6, currency: "coins", courage: 55, note: "Quick-witted and reckless with her fire." }),
    { id: "ex-scout", sheet: tableSheet("Scout"), proposal: null },
  ];
}

/** What each example hero carries into a fight (the muster comes later): powers and a bandage on the belt. */
const POWERS: Record<string, Power[]> = {
  "ex-medli": [{ id: "mend", name: "Mend", effect: "heal:12" }, { id: "calm", name: "Calm", effect: "hit_mod:-15:2" }],
  "ex-ember": [{ id: "spark", name: "Spark", effect: "damage:9:fire" }, { id: "scorch", name: "Scorch", effect: "burn:3:3", uses: 2 }],
};
const BELT: Item[] = [{ id: "bandage", name: "Bandage", effect: "heal:18" }];

export const kitFor = (id: string, side: "party" | "foe"): FighterKit => ({
  id,
  side,
  powers: (POWERS[id] ?? []).map((p) => ({ ...p })),
  belt: side === "party" && id === "ex-garret" ? BELT.map((i) => ({ ...i })) : [],
  weapon: id === "ex-garret" ? 1.15 : 1,
});

export interface Foe {
  id: string;
  sheet: Sheet;
}

export function exampleFoes(): Foe[] {
  return [
    { id: "foe-scout", sheet: cleanSheet({ name: "Goblin scout", level: 2, stats: { might: 4, agility: 6, endurance: 3, wits: 2, spirit: 2 }, courage: 25 }) },
    { id: "foe-brute", sheet: cleanSheet({ name: "Goblin brute", level: 2, stats: { might: 6, agility: 3, endurance: 5, wits: 2, spirit: 2 }, courage: 60 }) },
  ];
}
