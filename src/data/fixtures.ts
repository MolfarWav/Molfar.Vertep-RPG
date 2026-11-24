// The example party and encounter. Real sheets come from Roleplay characters and real encounters from a chat
// (later phases); until then the app shows these, so every screen can be seen and tried.
import { cleanSheet } from "@/rules";
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
    hero("ex-vlad", { name: "Vlad", role: "Swordsman", level: 3, xp: 450, stats: { might: 6, agility: 5, endurance: 6, wits: 3, spirit: 4 }, skills: [{ name: "Swords", rank: 3 }, { name: "Shields", rank: 2 }], money: 42, currency: "coins", courage: 74, note: "A veteran guard: strong and durable, little magic." }),
    hero("ex-medli", { name: "Medli", role: "Healer", level: 3, xp: 340, stats: { might: 3, agility: 4, endurance: 5, wits: 5, spirit: 7 }, skills: [{ name: "Herbs", rank: 3 }, { name: "Calm", rank: 2 }], money: 18, currency: "coins", courage: 62, note: "Gentle and careful; the spirit of the party." }),
    hero("ex-garret", { name: "Garret", role: "Spearman", level: 3, xp: 120, stats: { might: 5, agility: 6, endurance: 5, wits: 4, spirit: 4 }, skills: [{ name: "Spears", rank: 3 }], money: 12, currency: "coins", courage: 58, note: "Quick on his feet, keeps the enemy at a spear's length." }),
    hero("ex-ember", { name: "Ember", role: "Fire mage", level: 3, xp: 600, stats: { might: 3, agility: 4, endurance: 4, wits: 8, spirit: 5 }, skills: [{ name: "Fire", rank: 4 }], money: 6, currency: "coins", courage: 22, note: "Quick-witted and reckless with her fire, but easily frightened." }),
  ];
}

/** What each example hero carries into a fight (the muster screen comes later). */
const POWERS: Record<string, Power[]> = {
  "ex-medli": [{ id: "warm", name: "Warm word", effect: "heal:14" }],
  "ex-ember": [{ id: "spark", name: "Spark", effect: "damage:9:fire" }, { id: "fog", name: "Thick fog", effect: "hit_mod:-15:1" }],
};
const BACKPACK = (): Item[] => [
  { id: "knife", name: "Crooked knife", effect: "weapon:1.15" },
  { id: "bandage", name: "Strong bandage", effect: "heal:18" },
  { id: "moss", name: "Dried mushroom", effect: "treat:light" },
];
const BELT = (): Item[] => [
  { id: "belt-bandage", name: "Bandage from the belt", effect: "heal:18" },
  { id: "belt-moss", name: "Mushroom from the belt", effect: "treat:light" },
];
const HAS_KIT = new Set(["ex-vlad", "ex-garret"]);

export const kitFor = (id: string, side: "party" | "foe"): FighterKit => ({
  id,
  side,
  powers: (POWERS[id] ?? []).map((p) => ({ ...p })),
  belt: side === "party" && HAS_KIT.has(id) ? BELT() : [],
  backpack: side === "party" && (HAS_KIT.has(id) || id === "ex-medli") ? BACKPACK() : [],
  weapon: id === "ex-vlad" ? 1.15 : 1,
});

/** The made-up encounter. Its scene text, loot and gear lines are strings (`enc.*`, `gear.<id>`), so they follow the language. */
export const ENCOUNTER = { contract: "v0.1" };

export interface Foe {
  id: string;
  sheet: Sheet;
}

export function exampleFoes(): Foe[] {
  return [
    { id: "foe-scout", sheet: cleanSheet({ name: "Scout", level: 2, stats: { might: 4, agility: 6, endurance: 5, wits: 2, spirit: 2 }, courage: 25 }) },
    { id: "foe-archer", sheet: cleanSheet({ name: "Archer", level: 2, stats: { might: 5, agility: 5, endurance: 4, wits: 2, spirit: 2 }, courage: 60 }) },
  ];
}
