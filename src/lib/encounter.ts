import { useCallback, useEffect, useState } from "react";
import { call, PREVIEW } from "@/lib/api";
import { onShellView } from "@/lib/shell-bridge";
import { ID_RULE, parseEncounter } from "@/contract";
import type { Encounter } from "@/contract";
import example from "../../docs/contract/v0.1/encounter.example.json";

export interface EncounterApi {
  encounter: Encounter | null;
  /** The id of a fight Roleplay left that has no result yet (when the engine did not pass the id). */
  waiting: string | null;
  loading: boolean;
  error: string;
  load: (id: string) => Promise<void>;
  clear: () => void;
}

const isEncId = (v: string): boolean => ID_RULE.test(v) && v.startsWith("enc-");

/** The fight Roleplay handed over: heard through the shell (a view name), or found waiting in Roleplay's outbox at the start. */
export function useEncounter(): EncounterApi {
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError("");
    setWaiting(null);
    try {
      const r = await call<{ encounter: unknown }>("GET", `/encounters/${id}`);
      const p = parseEncounter(r.encounter);
      if (p.ok) setEncounter(p.value);
      else setError(p.reason);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (PREVIEW) {
      if (new URLSearchParams(location.search).get("encounter") === "1") {
        const p = parseEncounter(example);
        if (p.ok) setEncounter(p.value);
      }
      return;
    }
    const off = onShellView((view) => {
      if (isEncId(view)) void load(view);
    });
    // an engine that does not pass the id still opens the app: look for a fight that has no result yet
    (async () => {
      try {
        const pend = await call<{ ids: string[] }>("GET", "/encounters/pending");
        for (const id of pend.ids) {
          const done = await call("GET", `/results/${id}`).then(() => true, () => false);
          if (!done) {
            setWaiting(id);
            return;
          }
        }
      } catch {
        // no access to Roleplay yet: nothing is waiting that we can see
      }
    })();
    return off;
  }, [load]);

  return { encounter, waiting, loading, error, load, clear: () => { setEncounter(null); setWaiting(null); setError(""); } };
}
