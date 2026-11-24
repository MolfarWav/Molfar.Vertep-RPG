import { useState } from "react";
import { t, useLang } from "@/i18n";
import { useIsPhone } from "@/lib/use-phone";
import { useSheets } from "@/lib/sheets-store";
import { isSkin } from "@/data/skins";
import { PartyScreen } from "@/screens/party";
import { BattleScreen } from "@/screens/battle";

type Tab = "party" | "battle";

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
  const [tab, setTab] = useState<Tab>(q("screen") === "battle" ? "battle" : "party");
  const skinQ = q("skin");
  const skin = isSkin(skinQ) ? skinQ : "fantasy";
  const seedQ = Number(q("seed"));
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "party", label: t("tab.party"), icon: "☗" },
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
        {tab === "party" ? <PartyScreen store={store} initialId={q("sheet") ?? undefined} /> : <BattleScreen entries={store.entries} skin={skin} seed={Number.isFinite(seedQ) && seedQ > 0 ? seedQ : undefined} />}
      </main>
      {phone && nav}
    </div>
  );
}
