// "Data sources": small marks next to a block that say where its numbers come from (code, the chat's sensor, the card,
// or an example). They are a review aid from the mockups, off by default, remembered per viewer; `?sources=1` pins them on.
import { useSyncExternalStore } from "react";

const KEY = "rpg:sources";
const subs = new Set<() => void>();

function read(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("sources");
    if (q === "1") return true;
    if (q === "0") return false;
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
let on = read();

export function setSources(v: boolean): void {
  on = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    // storage can be blocked
  }
  for (const f of subs) f();
}

export function useSources(): boolean {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => on,
    () => false,
  );
}
