import { useCallback, useEffect, useRef, useState } from "react";
import { cleanSheet } from "@/rules";
import { call, PREVIEW } from "@/lib/api";
import { exampleParty } from "@/data/fixtures";
import type { Entry } from "@/data/fixtures";
import type { Sheet } from "@/rules";

interface Stored {
  id: string;
  sheet: unknown;
  proposal: unknown;
}

const clean = (e: Stored): Entry => ({ id: e.id, sheet: cleanSheet(e.sheet), proposal: e.proposal ? cleanSheet(e.proposal) : null });

export interface SheetsApi {
  entries: Entry[];
  loading: boolean;
  error: string;
  /** Saved: set when the last change reached the engine. */
  saved: boolean;
  change: (id: string, sheet: Sheet) => void;
  addExamples: () => void;
  /** Adds the sheets that are not there yet (a party that came from a chat); one saved earlier is kept as it is. */
  ensure: (list: Entry[]) => void;
  remove: (id: string) => void;
}

/** The sheets of the app. In a design preview they are the example party, kept in memory only. */
export function useSheets(): SheetsApi {
  const [entries, setEntries] = useState<Entry[]>(PREVIEW ? exampleParty() : []);
  const [loading, setLoading] = useState(!PREVIEW);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (PREVIEW) return;
    call<{ sheets: Stored[] }>("GET", "/sheets")
      .then((r) => setEntries(r.sheets.map(clean)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const put = useCallback((e: Entry) => {
    if (PREVIEW) return;
    const old = timers.current.get(e.id);
    if (old) clearTimeout(old);
    setSaved(false);
    timers.current.set(
      e.id,
      setTimeout(() => {
        call("PUT", `/sheets/${e.id}`, { sheet: e.sheet, proposal: e.proposal })
          .then(() => {
            setError("");
            setSaved(true);
          })
          .catch((err: Error) => setError(err.message));
      }, 400),
    );
  }, []);

  const change = useCallback(
    (id: string, sheet: Sheet) => {
      setEntries((list) =>
        list.map((e) => {
          if (e.id !== id) return e;
          const next = { ...e, sheet: cleanSheet(sheet) };
          put(next);
          return next;
        }),
      );
    },
    [put],
  );

  const addExamples = useCallback(() => {
    const add = exampleParty();
    setEntries((list) => {
      const have = new Set(list.map((e) => e.id));
      const fresh = add.filter((e) => !have.has(e.id));
      for (const e of fresh) put(e);
      return [...list, ...fresh];
    });
  }, [put]);

  const ensure = useCallback(
    (list: Entry[]) => {
      setEntries((old) => {
        const have = new Set(old.map((e) => e.id));
        const fresh = list.filter((e) => !have.has(e.id));
        if (!fresh.length) return old;
        for (const e of fresh) put(e);
        return [...old, ...fresh];
      });
    },
    [put],
  );

  const remove = useCallback((id: string) => {
    setEntries((list) => list.filter((e) => e.id !== id));
    if (!PREVIEW) call("DELETE", `/sheets/${id}`).catch((err: Error) => setError(err.message));
  }, []);

  return { entries, loading, error, saved, change, addExamples, ensure, remove };
}
