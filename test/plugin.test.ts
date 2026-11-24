import { expect, test } from "bun:test";
import { handleRoute } from "../plugins/sheets/plugin.js";

function host() {
  const files = new Map<string, string>();
  return {
    files,
    fs: {
      read: (p: string) => {
        const v = files.get(p);
        if (v === undefined) throw new Error("not found");
        return v;
      },
      write: (p: string, v: string) => void files.set(p, v),
      remove: (p: string) => void files.delete(p),
      list: (d: string) => [...files.keys()].filter((k) => k.startsWith(d + "/")).map((k) => k.slice(d.length + 1)),
    },
  };
}

test("the plugin answers only its own paths", () => {
  expect(handleRoute({ path: "/other", method: "GET" }, host())).toBeNull();
  expect(handleRoute({ path: "/sheets/a/b", method: "GET" }, host())).toBeNull();
});

test("save, list and delete a sheet", () => {
  const h = host();
  expect(handleRoute({ path: "/sheets/ex-1", method: "PUT", body: { sheet: { name: "A" }, proposal: { name: "A" } } }, h)?.json).toEqual({ ok: true, id: "ex-1" });
  const list = handleRoute({ path: "/sheets", method: "GET" }, h)?.json as { sheets: { id: string }[] };
  expect(list.sheets.map((s) => s.id)).toEqual(["ex-1"]);
  expect(handleRoute({ path: "/sheets/ex-1", method: "DELETE" }, h)?.json).toEqual({ ok: true });
  expect((handleRoute({ path: "/sheets", method: "GET" }, h)?.json as { sheets: unknown[] }).sheets).toEqual([]);
});

test("a bad id, a missing sheet and a too big sheet are refused; a broken file is skipped", () => {
  const h = host();
  expect(handleRoute({ path: "/sheets/..%2Fx", method: "PUT", body: { sheet: {} } }, h)?.status).toBe(400);
  expect(handleRoute({ path: "/sheets/ok", method: "PUT", body: {} }, h)?.status).toBe(400);
  expect(handleRoute({ path: "/sheets/ok", method: "PUT", body: { sheet: { name: "x".repeat(30000) } } }, h)?.status).toBe(413);
  h.files.set("sheets/broken.json", "{nope");
  expect((handleRoute({ path: "/sheets", method: "GET" }, h)?.json as { sheets: unknown[] }).sheets).toEqual([]);
});
