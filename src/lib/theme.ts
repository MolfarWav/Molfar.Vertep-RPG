// Theme: "vertep" (default), "dark" or "light". `?theme=` pins it (previews and browser checks). Otherwise the app
// follows the shell: the engine tells every app frame the shell's theme (`window.molfarShell.theme()` and the
// "molfar:shell-theme" event); a custom shell theme maps to Dark or Light by its scheme.
export type Theme = "vertep" | "dark" | "light";
export const THEMES: Theme[] = ["vertep", "dark", "light"];
const KEY = "rpg:theme";

const isTheme = (v: unknown): v is Theme => typeof v === "string" && (THEMES as string[]).includes(v);

export interface ShellTheme {
  id: string;
  scheme: "dark" | "light";
}

declare global {
  interface Window {
    molfarShell?: { theme?: () => ShellTheme | null; locale?: () => Promise<unknown> };
  }
}

export function themeFromShell(t: Partial<ShellTheme> | null | undefined): Theme | null {
  if (!t || typeof t !== "object") return null;
  if (isTheme(t.id)) return t.id;
  return t.scheme === "light" ? "light" : t.scheme === "dark" ? "dark" : null;
}

function pinned(): Theme | null {
  try {
    const q = new URLSearchParams(location.search).get("theme");
    return isTheme(q) ? q : null;
  } catch {
    return null;
  }
}

export function initialTheme(): Theme {
  const q = pinned();
  if (q) return q;
  try {
    const s = localStorage.getItem(KEY);
    if (isTheme(s)) return s;
  } catch {
    // storage can be blocked
  }
  return "vertep";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // not worth failing for
  }
}

export function followShell(apply: (t: Theme) => void = applyTheme): () => void {
  if (pinned()) return () => undefined;
  const now = themeFromShell(window.molfarShell?.theme?.());
  if (now) apply(now);
  const on = (e: Event) => {
    const t = themeFromShell((e as CustomEvent<ShellTheme>).detail);
    if (t) apply(t);
  };
  window.addEventListener("molfar:shell-theme", on);
  return () => window.removeEventListener("molfar:shell-theme", on);
}
