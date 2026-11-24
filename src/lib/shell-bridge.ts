// The shell's calls an app may use to reach another app: `openApp(id, view)` and `onView(fn)`. Official apps only, heard from the app
// on screen. An engine without `view` support opens the app and drops the name; the caller keeps a file-based fallback.

type OpenApp = (id: string, view?: string) => Promise<unknown>;
type OnView = (fn: (view: string) => void) => () => void;

interface Shell {
  openApp?: OpenApp;
  onView?: OnView;
}

const shell = (): Shell | undefined => {
  try {
    return (window as unknown as { molfarShell?: Shell }).molfarShell;
  } catch {
    return undefined;
  }
};

/** Opens another app, with a short name for it to hear. False when this engine cannot, or the shell refused. */
export async function openApp(id: string, view?: string): Promise<boolean> {
  const f = shell()?.openApp;
  if (typeof f !== "function") return false;
  try {
    await f(id, view);
    return true;
  } catch {
    return false;
  }
}

/** Listen for a name the shell hands over. Returns a function that stops; a no-op on an engine without the call. */
export function onShellView(fn: (view: string) => void): () => void {
  const f = shell()?.onView;
  if (typeof f !== "function") return () => undefined;
  try {
    const off = f(fn);
    return typeof off === "function" ? off : () => undefined;
  } catch {
    return () => undefined;
  }
}
