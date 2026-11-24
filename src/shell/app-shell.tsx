import { useCallback, useEffect, useMemo, useState } from "react";
import { t, useLang } from "@/i18n";
import { useIsPhone } from "@/lib/use-phone";
import { useSheets } from "@/lib/sheets-store";
import { exampleParty } from "@/data/fixtures";
import { isSkin } from "@/data/skins";
import { entryIdFor, partyEntries } from "@/contract/build";
import type { Result } from "@/contract";
import { call, PREVIEW } from "@/lib/api";
import { useEncounter } from "@/lib/encounter";
import { openApp } from "@/lib/shell-bridge";
import { useKits } from "@/lib/kits";
import type { Entry } from "@/data/fixtures";
import type { BattleState } from "@/rules";
import { MusterScreen } from "@/screens/muster";
import { PartyScreen } from "@/screens/party";
import { BattleScreen } from "@/screens/battle";

type Tab = "party" | "muster" | "battle";

const q = (name: string): string | null => {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
};

export function AppShell() {
  useLang();
  const phone = useIsPhone();
  const store = useSheets();
  const kits = useKits();
  const examples = useMemo(() => exampleParty(), []);
  const enc = useEncounter();
  const encounter = enc.encounter;
  const [round, setRound] = useState(0);
  const onRound = useCallback((n: number) => setRound(n), []);
  // a fight from a chat: its party gets sheets (kept if made before), and the app opens on the muster
  useEffect(() => {
    if (!encounter) return;
    store.ensure(partyEntries(encounter));
    setTab("muster");
  }, [encounter, store.ensure]);
  const idMap = useMemo(() => (encounter ? Object.fromEntries(encounter.party.map((p) => [entryIdFor(encounter, p.id), p.id])) : {}), [encounter]);
  const party: Entry[] = useMemo(() => {
    if (!encounter) return store.entries.length ? store.entries : examples;
    return encounter.party.flatMap((p) => store.entries.filter((e) => e.id === entryIdFor(encounter, p.id)));
  }, [encounter, store.entries, examples]);
  const onReturn = useCallback(
    async (result: Result, battle: BattleState): Promise<string> => {
      if (!PREVIEW) {
        try {
          await call("PUT", `/results/${result.encounterId}`, { result });
        } catch (e) {
          return (e as Error).message;
        }
      }
      // the sheets keep the health the fight left
      for (const f of battle.fighters.filter((x) => x.side === "party")) {
        const e = store.entries.find((x) => x.id === f.id);
        const r = result.party.find((x) => x.id === (idMap[f.id] ?? f.id));
        if (e && r) store.change(e.id, { ...e.sheet, hpNow: r.hp });
      }
      return PREVIEW || (await openApp("roleplay", result.encounterId)) ? "" : "saved";
    },
    [store, idMap],
  );
  const start = q("screen");
  const [tab, setTab] = useState<Tab>(start === "battle" ? "battle" : start === "muster" ? "muster" : "party");
  const skinQ = q("skin");
  const skin = isSkin(skinQ) ? skinQ : "fantasy";
  const seedQ = Number(q("seed"));
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "party", label: t("tab.party"), icon: "☗" },
    { id: "muster", label: t("tab.muster"), icon: "🎒" },
    { id: "battle", label: t("tab.battle"), icon: "⚔" },
  ];
  const nav = (
    <nav className={phone ? "tabs bottom" : "tabs top"} aria-label={t("app.name")}>
      {tabs.map((x) => (
        <button key={x.id} type="button" className={tab === x.id ? "on" : ""} aria-current={tab === x.id ? "page" : undefined} onClick={() => setTab(x.id)}>
          <span aria-hidden="true">{x.icon}</span> {x.label}
        </button>
      ))}
    </nav>
  );
  return (
    <div className={"rpg" + (phone ? " phone" : "")}>
      {!phone && (
        <header className="topbar">
          <h1 className="k">{t("app.name")}</h1>
          {nav}
        </header>
      )}
      <main className="main">
        {(enc.waiting || enc.error || enc.loading) && !encounter && (
          <section className="card enc-banner" role={enc.error ? "alert" : "status"}>
            <div className="bd">
              {enc.loading && <span className="shimmer">{t("enc.loading")}</span>}
              {enc.error && <span><b>{t("common.error")}</b> {t("enc.error", { why: enc.error })}</span>}
              {enc.waiting && !enc.loading && (
                <>
                  <span>{t("enc.banner")}</span>
                  <button type="button" className="btn go" onClick={() => void enc.load(enc.waiting as string)}>{t("enc.open")}</button>
                  <button type="button" className="btn ghost" onClick={enc.clear}>{t("enc.dismiss")}</button>
                </>
              )}
            </div>
          </section>
        )}
        {/* all three stay mounted, so a fight in progress survives a visit to the muster */}
        <div hidden={tab !== "party"}><PartyScreen store={store} initialId={q("sheet") ?? undefined} /></div>
        <div hidden={tab !== "muster"}><MusterScreen entries={party} kits={kits} locked={round > 0} onToBattle={() => setTab("battle")} onBack={encounter ? () => void openApp("roleplay") : undefined} encounter={encounter} /></div>
        <div hidden={tab !== "battle"}><BattleScreen key={encounter?.id ?? "example"} entries={encounter ? party : store.entries} encounter={encounter} idMap={idMap} onReturn={onReturn} skin={skin} seed={Number.isFinite(seedQ) && seedQ > 0 ? seedQ : undefined} kits={kits} onMuster={() => setTab("muster")} onRound={onRound} /></div>
      </main>
      {phone && nav}
    </div>
  );
}
