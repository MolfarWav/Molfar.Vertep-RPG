import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { Avatar, HpBar } from "@/components/bars";
import { useIsPhone } from "@/lib/use-phone";
import { hpMax, hpNowOf } from "@/rules";
import { SheetView } from "./sheet-view";
import type { SheetsApi } from "@/lib/sheets-store";

export function PartyScreen({ store, initialId }: { store: SheetsApi; initialId?: string }) {
  const phone = useIsPhone();
  const { entries, loading, error, saved } = store;
  const [openId, setOpenId] = useState<string | null>(initialId ?? null);
  // desktop shows the first sheet at once; a phone shows the list first
  useEffect(() => {
    if (!phone && !openId && entries.length) setOpenId(entries[0].id);
    if (openId && !entries.some((e) => e.id === openId)) setOpenId(phone ? null : entries[0]?.id ?? null);
  }, [phone, openId, entries]);
  const open = entries.find((e) => e.id === openId) ?? null;

  const list = (
    <nav className="party-list" aria-label={t("party.list")}>
      <ul>
        {entries.map((e) => {
          const max = hpMax(e.sheet);
          return (
            <li key={e.id}>
              <button type="button" className={"party-row" + (e.id === openId ? " on" : "")} aria-current={e.id === openId ? "true" : undefined} onClick={() => setOpenId(e.id)}>
                <Avatar name={e.sheet.name} size={44} hero={e.id === openId} />
                <span className="party-main">
                  <b className="k">{e.sheet.name}</b>
                  <span className="mu">{e.sheet.role || t("sheet.noRole")} · {t("sheet.level", { n: e.sheet.level })}</span>
                  <HpBar now={hpNowOf(e.sheet)} max={max} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn ghost wide" onClick={store.addExamples}>{t("party.addExamples")}</button>
    </nav>
  );

  if (loading) return <div className="empty" role="status"><span className="shimmer">{t("common.loading")}</span></div>;
  if (error) return <div className="empty err" role="alert"><b>{t("common.error")}</b><span>{error}</span></div>;
  if (!entries.length) {
    return (
      <div className="empty">
        <h2 className="k">{t("party.emptyTitle")}</h2>
        <p>{t("party.emptyText")}</p>
        <button type="button" className="btn go" onClick={store.addExamples}>{t("party.addExamples")}</button>
      </div>
    );
  }
  if (phone) {
    return open ? (
      <div className="page">
        <button type="button" className="btn ghost back" onClick={() => setOpenId(null)}>← {t("party.back")}</button>
        <SheetView entry={open} onChange={(s) => store.change(open.id, s)} onRemove={() => store.remove(open.id)} saved={saved} />
      </div>
    ) : (
      <div className="page">{list}</div>
    );
  }
  return (
    <div className="split">
      {list}
      {open && <SheetView key={open.id} entry={open} onChange={(s) => store.change(open.id, s)} onRemove={() => store.remove(open.id)} saved={saved} />}
    </div>
  );
}
