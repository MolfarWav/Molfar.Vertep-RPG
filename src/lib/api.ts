// The only layer that talks to the engine: the app's own plugin routes (/v1/apps/<id>/...).
// Preview mode: a URL with `?screen=` is a design preview (screenshots) on mock data; it never calls the engine.

export const PREVIEW: boolean = (() => {
  try {
    return new URLSearchParams(location.search).has("screen");
  } catch {
    return false;
  }
})();

// the frame URL is /app/<user>/<app>/ (the app's id is the third segment)
const APP_ID = (() => {
  try {
    return decodeURIComponent(location.pathname.split("/").filter(Boolean)[2] ?? "rpg");
  } catch {
    return "rpg";
  }
})();

export const API = `/v1/apps/${APP_ID}`;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function call<T>(method: "GET" | "PUT" | "DELETE" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ApiError(json?.error ?? `the engine answered ${res.status}`, res.status);
  return json as T;
}
