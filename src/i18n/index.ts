// Two languages, like Roleplay and Social: English (source) and Ukrainian. A missing Ukrainian string falls back to
// English, a missing English one to the key, so a gap is visible rather than blank. test/skeleton.test.ts keeps the
// two key sets equal.
import { useSyncExternalStore } from "react";
import { strings } from "@/i18n/strings";

export type Lang = "en" | "uk";
export const dictionary: Record<Lang, Record<string, string>> = strings;

const KEY = "rpg:shell-lang";
const subs = new Set<() => void>();
let lang: Lang = "en";

export function langFromLocale(code: unknown): Lang | null {
  if (typeof code !== "string" || !code.trim()) return null;
  return code.trim().toLowerCase().startsWith("uk") ? "uk" : "en";
}

function pinned(): Lang | null {
  try {
    return langFromLocale(new URLSearchParams(location.search).get("lang"));
  } catch {
    return null;
  }
}

function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // storage can be blocked
  }
  for (const f of subs) f();
}

/** Start: `?lang=` pins it; else the last language the shell reported, then ask the shell. */
export function initLang(): void {
  const p = pinned();
  if (p) {
    lang = p;
    document.documentElement.lang = p;
    return;
  }
  try {
    lang = langFromLocale(localStorage.getItem(KEY)) ?? "en";
  } catch {
    lang = "en";
  }
  document.documentElement.lang = lang;
  try {
    const ask = window.molfarShell?.locale?.();
    if (ask) void ask.then((c) => setLang(langFromLocale(c) ?? lang)).catch(() => undefined);
  } catch {
    // an older engine has no locale()
  }
}

export const currentLang = (): Lang => lang;

export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = dictionary[lang][key] ?? dictionary.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : raw;
}

/** A string in a given language, not the one on screen (the result written for a chat follows the chat's language). */
export function tIn(l: Lang, key: string, vars?: Record<string, string | number>): string {
  const raw = dictionary[l][key] ?? dictionary.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : raw;
}

/** Re-renders a component when the language changes. */
export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => lang,
    () => "en" as Lang,
  );
}
