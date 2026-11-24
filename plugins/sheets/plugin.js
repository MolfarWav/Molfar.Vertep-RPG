/**
 * RPG sheets: one file per sheet in the app's data folder (`sheets/<id>.json`).
 *
 * Routes (relative to /v1/apps/rpg):
 *   GET    /sheets         {sheets: [{id, sheet, proposal}]}  every saved sheet
 *   PUT    /sheets/<id>    {sheet, proposal?}                 save one (create or replace): {ok, id}
 *   DELETE /sheets/<id>                                       remove it: {ok}
 *
 * The numbers are judged by the app's rules library (src/rules/sheet.ts, `cleanSheet`) before a save and after a
 * load. This plugin only keeps the files and refuses what is not a plain object or is too big.
 */

const ID = /^[A-Za-z0-9_-]{1,60}$/;
const MAX_CHARS = 20000;
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const ok = (json, status) => ({ status: status || 200, json });
const pathOf = (id) => "sheets/" + id + ".json";

export function handleRoute(req, host) {
  const path = String((req && req.path) || "").split("?")[0];
  const method = req && req.method;
  if (path === "/sheets" && method === "GET") {
    const sheets = [];
    let names = [];
    try {
      names = host.fs.list("sheets");
    } catch {
      names = [];
    }
    for (const n of names) {
      const m = /^([A-Za-z0-9_-]{1,60})\.json$/.exec(String(n));
      if (!m) continue;
      try {
        const doc = JSON.parse(host.fs.read(pathOf(m[1])));
        if (isObj(doc) && isObj(doc.sheet)) sheets.push({ id: m[1], sheet: doc.sheet, proposal: isObj(doc.proposal) ? doc.proposal : null });
      } catch {
        // a broken file is skipped, never fatal
      }
    }
    return ok({ sheets });
  }
  const m = /^\/sheets\/([^/]+)$/.exec(path);
  if (!m) return null;
  if (!ID.test(m[1])) return ok({ error: "bad sheet id" }, 400);
  if (method === "PUT") {
    const b = req.body;
    if (!isObj(b) || !isObj(b.sheet)) return ok({ error: "a sheet is needed" }, 400);
    const doc = { sheet: b.sheet, proposal: isObj(b.proposal) ? b.proposal : null };
    const text = JSON.stringify(doc);
    if (text.length > MAX_CHARS) return ok({ error: "the sheet is too big" }, 413);
    host.fs.write(pathOf(m[1]), text);
    return ok({ ok: true, id: m[1] });
  }
  if (method === "DELETE") {
    try {
      host.fs.remove(pathOf(m[1]));
    } catch {
      // already gone
    }
    return ok({ ok: true });
  }
  return null;
}
