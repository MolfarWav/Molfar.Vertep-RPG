// The example items of the muster screen. An item is the rules library's `Item` (id, name, effect) plus what the screen
// needs: a kind (the id up to `#`), a category for the filters, an icon and its texts in both languages.
// A kind with no effect the rules know is shown but cannot be used in a fight yet.
import { currentLang } from "@/i18n";
import type { Item } from "@/rules";

export type Category = "weapon" | "medicine" | "misc";
export const CATEGORIES: Category[] = ["weapon", "medicine", "misc"];

interface Text {
  en: string;
  uk: string;
}
interface Kind {
  cat: Category;
  icon: string;
  effect: string;
  name: Text;
  /** What it does, for a kind the rules cannot use in a fight yet. */
  fx?: Text;
  lore: Text;
  /** Where the example says it came from. */
  from: Text;
}

export const KINDS: Record<string, Kind> = {
  knife: { cat: "weapon", icon: "🔪", effect: "weapon:1.15", name: { en: "Crooked knife", uk: "Кривий ніж" }, fx: { en: "instead of the sword · strike ×1.15", uk: "замість меча · удар ×1.15" }, lore: { en: "Nicked and ugly, but it bites.", uk: "Щербатий і потворний, але ріже." }, from: { en: "loot, round 2", uk: "здобич, раунд 2" } },
  dagger: { cat: "weapon", icon: "🗡", effect: "weapon:1.05", name: { en: "Rusty dagger", uk: "Іржавий кинджал" }, fx: { en: "instead of the sword · strike ×1.05", uk: "замість меча · удар ×1.05" }, lore: { en: "Better than bare hands.", uk: "Краще, ніж голі руки." }, from: { en: "the mill cellar", uk: "підвал млина" } },
  club: { cat: "weapon", icon: "🏏", effect: "weapon:1.1", name: { en: "Heavy club", uk: "Важка палиця" }, fx: { en: "instead of the sword · strike ×1.1", uk: "замість меча · удар ×1.1" }, lore: { en: "A table leg with ambitions.", uk: "Ніжка від столу з амбіціями." }, from: { en: "loot, round 1", uk: "здобич, раунд 1" } },
  bandage: { cat: "medicine", icon: "🩹", effect: "heal:18", name: { en: "Strong bandage", uk: "Міцний бинт" }, lore: { en: "It smells of lye and smoke. Medli taught how to wind it: tight, but it holds.", uk: "Пахне чистоткою і димом. Медлі вчила мотати: туго, але тримає." }, from: { en: "loot, round 2", uk: "здобич, раунд 2" } },
  herbs: { cat: "medicine", icon: "🌿", effect: "heal:8", name: { en: "Bundle of herbs", uk: "Пучок трав" }, lore: { en: "Bitter, green, good for a scrape.", uk: "Гіркі, зелені, добре від подряпин." }, from: { en: "the meadow", uk: "луг" } },
  moss: { cat: "medicine", icon: "🍄", effect: "treat:light", name: { en: "Dried mushroom", uk: "Сушений гриб" }, lore: { en: "Chew it slowly. It calms a small wound.", uk: "Жуй повільно. Заспокоює невелику рану." }, from: { en: "a pocket of the old cloak", uk: "кишеня старого плаща" } },
  salve: { cat: "medicine", icon: "🫙", effect: "treat:serious", name: { en: "Smoky salve", uk: "Димна мазь" }, lore: { en: "The healer's last jar.", uk: "Остання баночка знахарки." }, from: { en: "Medli", uk: "Медлі" } },
  tonic: { cat: "medicine", icon: "🧪", effect: "heal:12", name: { en: "Cloudy tonic", uk: "Каламутна настоянка" }, lore: { en: "Tastes of pine and regret.", uk: "Смак сосни й жалю." }, from: { en: "the mill cellar", uk: "підвал млина" } },
  bread: { cat: "misc", icon: "🍞", effect: "heal:5", name: { en: "Stale bread", uk: "Черствий хліб" }, lore: { en: "Hard, but it is food.", uk: "Твердий, але це їжа." }, from: { en: "supplies", uk: "припаси" } },
  torch: { cat: "misc", icon: "🔥", effect: "light:1", name: { en: "Pitch torch", uk: "Смолоскип" }, fx: { en: "light · +1 to hits in the dark", uk: "світло · +1 до влучань у темряві" }, lore: { en: "Burns for an hour.", uk: "Горить годину." }, from: { en: "supplies", uk: "припаси" } },
  rope: { cat: "misc", icon: "🪢", effect: "tie:1", name: { en: "Rope", uk: "Мотузка" }, fx: { en: "to tie · outside a fight", uk: "зв'язати · поза боєм" }, lore: { en: "Ten paces of good hemp.", uk: "Десять кроків доброї коноплі." }, from: { en: "supplies", uk: "припаси" } },
  flint: { cat: "misc", icon: "🪨", effect: "spark:1", name: { en: "Flint and steel", uk: "Кремінь і кресало" }, fx: { en: "makes a fire · outside a fight", uk: "розпалити вогонь · поза боєм" }, lore: { en: "Never leave the camp without it.", uk: "Ніколи не йди з табору без нього." }, from: { en: "supplies", uk: "припаси" } },
  charm: { cat: "misc", icon: "📿", effect: "luck:1", name: { en: "Bone charm", uk: "Кістяний оберіг" }, fx: { en: "a keepsake · no effect yet", uk: "пам'ятка · поки без ефекту" }, lore: { en: "Ember says it hums at night.", uk: "Ембер каже, що вночі він гуде." }, from: { en: "Ember", uk: "Ембер" } },
  coins: { cat: "misc", icon: "🪙", effect: "money:12", name: { en: "12 coins", uk: "12 монет" }, fx: { en: "not for a fight · trade after", uk: "не для бою · торг після" }, lore: { en: "Goblin coins, a little bent.", uk: "Гоблінські монети, трохи погнуті." }, from: { en: "loot, round 2", uk: "здобич, раунд 2" } },
};

export const kindOf = (id: string): string => id.split("#")[0];
export const kindInfo = (id: string): Kind | undefined => KINDS[kindOf(id)];
export const pick = (t: Text): string => t[currentLang()] ?? t.en;
export const itemName = (i: Item): string => {
  const k = kindInfo(i.id);
  return k ? pick(k.name) : i.name;
};

/** A new item of a kind; `n` makes the id unique. */
export const makeItem = (kind: string, n: number): Item => ({ id: `${kind}#${n}`, name: KINDS[kind].name.en, effect: KINDS[kind].effect });

/** The example backpack: a long list on purpose, so the search, the filters and the scrolling have work to do. */
export function exampleBackpack(): Item[] {
  const plan: [string, number][] = [["knife", 1], ["dagger", 1], ["club", 1], ["bandage", 2], ["herbs", 3], ["moss", 1], ["salve", 1], ["tonic", 1], ["bread", 2], ["torch", 2], ["rope", 1], ["flint", 1], ["charm", 1], ["coins", 1]];
  const out: Item[] = [];
  for (const [k, n] of plan) for (let i = 1; i <= n; i++) out.push(makeItem(k, i));
  return out;
}
