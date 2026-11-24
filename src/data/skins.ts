// A battle's skin: one tag of a fixed vocabulary that changes words, not numbers. The numbers and the effect keys stay
// the same in every skin (plan, section 2). The words are in the strings table as `skin.<id>.<word>`; a missing word
// falls back to the fantasy one.
export const SKINS = ["fantasy", "cyberpunk", "superhero", "postapoc", "modern", "horror"] as const;
export type Skin = (typeof SKINS)[number];
export const SKIN_WORDS = ["guard", "powers", "field"] as const;
export type SkinWord = (typeof SKIN_WORDS)[number];

export const isSkin = (v: unknown): v is Skin => typeof v === "string" && (SKINS as readonly string[]).includes(v);
