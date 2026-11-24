/**
 * RPG encounters: the hand-over between Roleplay and this app (contract 0.1, docs/contract).
 *
 * Routes (relative to /v1/apps/rpg):
 *   GET /encounters/pending     {state: "ready" | "closed", ids: [...]}  the newest encounters Roleplay left, newest first
 *   GET /encounters/<id>        {encounter}  one encounter as Roleplay wrote it (the app checks it with parseEncounter)
 *   PUT /results/<id>  {result} {ok, id}     keeps the result of a fight in this app's data (results/<id>.json)
 *   GET /results/<id>           {result}     what was kept, or 404
 *   GET /results                {ids}        every result kept
 *
 * Roleplay is read through `host.peer` (read only, only the paths the manifest declares, only after the user allowed it on
 * Home). Nothing is ever written into Roleplay's data: the result stays here and Roleplay reads it through its own `reads`.
 */

const RP_APP = "roleplay";
const ID = /^[a-z][a-z0-9-]{0,31}$/;
const MAX_CHARS = 20000;
const PENDING_MAX = 5;

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const ok = (json, status) => ({ status: status || 200, json });

/** The Roleplay reader when this app may use it right now, else null. */
function roleplayPeer(host) {
  const peer = host && host.peer;
  if (!peer || typeof peer.apps !== "function") return null;
  try {
    return peer.apps().some((a) => a && a.app === RP_APP) ? peer : null;
  } catch {
    return null;
  }
}

const CLOSED = "The RPG app may not read Roleplay: it is not installed, or you have not allowed it yet";

export function handleRoute(req, host) {
  const path = String((req && req.path) || "").split("?")[0];
  const method = req && req.method;

  if (path === "/encounters/pending" && method === "GET") {
    const peer = roleplayPeer(host);
    if (!peer) return ok({ state: "closed", ids: [] });
    let names = [];
    try {
      names = peer.list(RP_APP, "rpg-outbox");
    } catch {
      names = [];
    }
    const ids = names
      .map((n) => /^(.+)\.json$/.exec(String(n)))
      .filter((m) => m && ID.test(m[1]))
      .map((m) => m[1])
      .sort()
      .reverse()
      .slice(0, PENDING_MAX);
    return ok({ state: "ready", ids });
  }

  let m = /^\/encounters\/([^/]+)$/.exec(path);
  if (m && method === "GET") {
    if (!ID.test(m[1])) return ok({ error: "bad encounter id" }, 400);
    const peer = roleplayPeer(host);
    if (!peer) return ok({ error: CLOSED, closed: true }, 403);
    let raw;
    try {
      raw = peer.read(RP_APP, "rpg-outbox/" + m[1] + ".json");
    } catch (e) {
      const msg = String((e && e.message) || e);
      return ok({ error: msg.replace(/^peer (read )?(refused: )?/i, ""), gone: /not found/i.test(msg) }, /not found/i.test(msg) ? 404 : 403);
    }
    try {
      const v = JSON.parse(raw);
      if (isObj(v)) return ok({ encounter: v });
    } catch {
      // falls through
    }
    return ok({ error: "the encounter file is not valid JSON" }, 422);
  }

  if (path === "/results" && method === "GET") {
    let names = [];
    try {
      names = host.fs.list("results");
    } catch {
      names = [];
    }
    return ok({ ids: names.map((n) => /^(.+)\.json$/.exec(String(n))).filter((x) => x && ID.test(x[1])).map((x) => x[1]) });
  }

  m = /^\/results\/([^/]+)$/.exec(path);
  if (!m) return null;
  if (!ID.test(m[1])) return ok({ error: "bad result id" }, 400);
  const file = "results/" + m[1] + ".json";
  if (method === "PUT") {
    const b = req.body;
    if (!isObj(b) || !isObj(b.result)) return ok({ error: "a result is needed" }, 400);
    const text = JSON.stringify(b.result);
    if (text.length > MAX_CHARS) return ok({ error: "the result is too big" }, 413);
    host.fs.write(file, text);
    return ok({ ok: true, id: m[1] });
  }
  if (method === "GET") {
    try {
      const v = JSON.parse(host.fs.read(file));
      return ok({ result: v });
    } catch {
      return ok({ error: "no result for this fight", gone: true }, 404);
    }
  }
  return null;
}
