import { expect, test } from "bun:test";
import { handleRoute } from "../plugins/encounters/plugin.js";

function host(opts: { peer?: boolean; outbox?: Record<string, string> } = {}) {
  const files = new Map<string, string>();
  const outbox = opts.outbox ?? {};
  return {
    files,
    fs: {
      read: (p: string) => {
        const v = files.get(p);
        if (v === undefined) throw new Error("not found");
        return v;
      },
      write: (p: string, v: string) => void files.set(p, v),
      list: (d: string) => [...files.keys()].filter((k) => k.startsWith(d + "/")).map((k) => k.slice(d.length + 1)),
    },
    peer: opts.peer === false ? undefined : {
      apps: () => [{ app: "roleplay" }],
      list: (_app: string, dir: string) => (dir === "rpg-outbox" ? Object.keys(outbox) : []),
      read: (_app: string, rel: string) => {
        const name = rel.replace(/^rpg-outbox\//, "");
        if (!(name in outbox)) throw new Error("peer read refused: not found");
        return outbox[name];
      },
    },
  };
}

test("only its own paths", () => {
  expect(handleRoute({ path: "/other", method: "GET" }, host())).toBeNull();
  expect(handleRoute({ path: "/encounters/a/b", method: "GET" }, host())).toBeNull();
});

test("pending lists the newest encounters first, ignores odd names, and says closed without access", () => {
  const h = host({ outbox: { "enc-aaa-1.json": "{}", "enc-zzz-9.json": "{}", "enc-mmm-5.json": "{}", "Bad Name.json": "{}", "notes.txt": "x" } });
  expect((handleRoute({ path: "/encounters/pending", method: "GET" }, h)?.json as { ids: string[] }).ids).toEqual(["enc-zzz-9", "enc-mmm-5", "enc-aaa-1"]);
  expect(handleRoute({ path: "/encounters/pending", method: "GET" }, host({ peer: false }))?.json).toEqual({ state: "closed", ids: [] });
});

test("an encounter is read through the peer; a missing one is 404, no access is 403, bad JSON is 422", () => {
  const h = host({ outbox: { "enc-ok-1.json": '{"contract":"0.1"}', "enc-bad-1.json": "{nope" } });
  expect(handleRoute({ path: "/encounters/enc-ok-1", method: "GET" }, h)?.json).toEqual({ encounter: { contract: "0.1" } });
  expect(handleRoute({ path: "/encounters/enc-none-1", method: "GET" }, h)?.status).toBe(404);
  expect(handleRoute({ path: "/encounters/enc-bad-1", method: "GET" }, h)?.status).toBe(422);
  expect(handleRoute({ path: "/encounters/enc-ok-1", method: "GET" }, host({ peer: false }))?.status).toBe(403);
  expect(handleRoute({ path: "/encounters/..%2Fx", method: "GET" }, h)?.status).toBe(400);
  expect(handleRoute({ path: "/encounters/Enc1", method: "GET" }, h)?.status).toBe(400);
});

test("a result is kept in this app's own data and read back; nothing goes to Roleplay", () => {
  const h = host();
  expect(handleRoute({ path: "/results/enc-ok-1", method: "PUT", body: { result: { outcome: "won" } } }, h)?.json).toEqual({ ok: true, id: "enc-ok-1" });
  expect(h.files.has("results/enc-ok-1.json")).toBe(true);
  expect(handleRoute({ path: "/results/enc-ok-1", method: "GET" }, h)?.json).toEqual({ result: { outcome: "won" } });
  expect((handleRoute({ path: "/results", method: "GET" }, h)?.json as { ids: string[] }).ids).toEqual(["enc-ok-1"]);
  expect(handleRoute({ path: "/results/enc-none-1", method: "GET" }, h)?.status).toBe(404);
  expect(handleRoute({ path: "/results/enc-ok-2", method: "PUT", body: {} }, h)?.status).toBe(400);
  expect(handleRoute({ path: "/results/enc-ok-2", method: "PUT", body: { result: { s: "x".repeat(30000) } } }, h)?.status).toBe(413);
  expect(handleRoute({ path: "/results/Bad", method: "PUT", body: { result: {} } }, h)?.status).toBe(400);
});
