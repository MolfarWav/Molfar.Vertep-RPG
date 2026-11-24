import { useMemo, useRef, useState } from "react";
import { t } from "@/i18n";
import { Avatar, HpBar } from "@/components/bars";
import { CATEGORIES, itemName, kindInfo, kindOf, pick } from "@/data/items";
import type { Category } from "@/data/items";
import { BELT_SLOTS } from "@/lib/kits";
import type { KitsApi } from "@/lib/kits";
import { hpMax, hpNowOf, parseEffect } from "@/rules";
import type { Item } from "@/rules";
import type { Encounter } from "@/contract";
import type { Entry } from "@/data/fixtures";
import { gearOf, Src } from "@/screens/battle/panels";
import { itemLine } from "@/screens/battle/action";

interface Sel {
  id: string;
  from: "backpack" | "belt";
}

const usable = (i: Item): boolean => parseEffect(i.effect) !== null;

export function MusterScreen({ entries, kits, locked, onToBattle, onBack, encounter = null }: { entries: Entry[]; kits: KitsApi; locked: boolean; onToBattle: () => void; onBack?: () => void; encounter?: Encounter | null }) {
  const [heroId, setHeroId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [sel, setSel] = useState<Sel | null>(null);
  const [say, setSay] = useState("");
  const inspect = useRef<HTMLElement | null>(null);

  const party = entries.slice(0, 4);
  const hero = party.find((e) => e.id === heroId) ?? party[0];
  const kit = hero ? kits.kitOf(hero.id) : { backpack: [], belt: [] };
  const selItem = sel ? (sel.from === "belt" ? kit.belt : kit.backpack).find((i) => i.id === sel.id) ?? null : null;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return kit.backpack.filter((i) => (cat === "all" || kindInfo(i.id)?.cat === cat) && (!needle || itemName(i).toLowerCase().includes(needle)));
  }, [kit.backpack, q, cat]);

  if (!hero) {
    return (
      <div className="empty">
        <h2 className="k">{t("party.emptyTitle")}</h2>
        <p>{t("muster.noHero")}</p>
      </div>
    );
  }

  const choose = (s: Sel) => {
    setSel(s);
    setSay("");
    // on a phone the inspector sits far below the list: bring it into view
    if (window.matchMedia("(max-width: 767px)").matches) setTimeout(() => inspect.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  };
  const move = (to: "belt" | "backpack") => {
    if (!selItem || !sel) return;
    const r = kits.move(hero.id, selItem.id, to, locked);
    if (r === "") {
      setSay(t(to === "belt" ? "muster.toBeltDone" : "muster.toBackpackDone", { name: itemName(selItem) }));
      setSel({ id: selItem.id, from: to });
    }
  };
  const copies = selItem ? [...kit.backpack, ...kit.belt].filter((i) => kindOf(i.id) === kindOf(selItem.id)).length : 0;
  const k = selItem ? kindInfo(selItem.id) : undefined;
  const beltFull = kit.belt.length >= BELT_SLOTS;
  const whyNoBelt = locked ? t("muster.lockedWhy") : beltFull ? t("muster.beltFull", { n: kit.belt.length, max: BELT_SLOTS }) : "";
  const whyNoBack = locked ? t("muster.lockedWhy") : "";

  const row = (i: Item, from: "backpack" | "belt") => (
    <li key={i.id}>
      <button type="button" className={"power-row item" + (sel?.id === i.id && sel.from === from ? " on" : "") + (usable(i) ? "" : " dim")} aria-pressed={sel?.id === i.id && sel.from === from} onClick={() => choose({ id: i.id, from })}>
        <span className="ico big" aria-hidden="true">{kindInfo(i.id)?.icon ?? "▫"}</span>
        <span className="grow"><b className="k">{itemName(i)}</b><br /><span className="mu fx">{itemLine(i)}</span></span>
        <span className="chip mono">{from === "backpack" ? t("muster.cost1") : `0 · ${t("battle.ready")}`}</span>
      </button>
    </li>
  );

  return (
    <div className="muster">
      <header className="card b-head">
        <h2 className="k">{encounter ? t("muster.titleChat", { name: hero.sheet.name, place: encounter.place || t("battle.fight") }) : t("muster.title", { name: hero.sheet.name })}</h2>
        <span className="chip tl">{t("muster.beforeBattle")}</span>
        <span className={"chip " + (locked ? "rd" : "am")}>{locked ? t("muster.beltLocked") : t("muster.beltOpen")}</span>
        <span className="grow" />
        <span className="hint">{t("muster.inBattle")}</span>
        <button type="button" className="btn rd big" onClick={onToBattle}>⚔ {t("muster.toBattle")}</button>
      </header>
      <p className="scene k">«{encounter?.scene || t("enc.muster")}» <Src k="sensor" /></p>

      <div className="muster-grid">
        <section className="card m-back" aria-label={t("battle.backpack")}>
          <div className="hd"><span className="lab">🎒 {t("battle.backpack")}</span><span className="chip mono">{t("muster.inBattleCost")}</span></div>
          <div className="bd">
            <label className="sr" htmlFor="m-search">{t("muster.searchLabel")}</label>
            <input id="m-search" className="search" type="search" value={q} placeholder={t("muster.search")} onChange={(e) => setQ(e.target.value)} />
            <div className="filters" role="group" aria-label={t("muster.filter")}>
              {(["all", ...CATEGORIES] as const).map((c) => (
                <button key={c} type="button" className={"pill" + (cat === c ? " on" : "")} aria-pressed={cat === c} onClick={() => setCat(c)}>{c === "all" ? t("muster.all") : t("cat." + c)}</button>
              ))}
            </div>
            <div className="hint count" role="status">{t("muster.shown", { n: shown.length, m: kit.backpack.length })}</div>
            <ul className="items scroll">
              {kit.backpack.length === 0 && <li className="hint">{t("muster.emptyBackpack")}</li>}
              {kit.backpack.length > 0 && shown.length === 0 && <li className="hint">{t("muster.noMatch")}</li>}
              {shown.map((i) => row(i, "backpack"))}
            </ul>
            <p className="hint">{t("muster.noteBackpack")} <Src k="code" /></p>
          </div>
        </section>

        <div className="m-mid">
          {party.length > 1 && (
            <div className="seg who" role="group" aria-label={t("muster.who")}>
              {party.map((e) => (
                <button key={e.id} type="button" className={e.id === hero.id ? "on" : ""} aria-pressed={e.id === hero.id} onClick={() => { setHeroId(e.id); setSel(null); setSay(""); }}>{e.sheet.name}</button>
              ))}
            </div>
          )}
          <section className="card" aria-label={hero.sheet.name}>
            <div className="bd hero-card">
              <Avatar name={hero.sheet.name} size={52} hero />
              <div className="b-main">
                <b className="k">{hero.sheet.name}</b>
                <span className="mu">{hpNowOf(hero.sheet)}/{hpMax(hero.sheet)}{gearOf(hero.id) ? ` · ${gearOf(hero.id)}` : ""}</span>
                <HpBar now={hpNowOf(hero.sheet)} max={hpMax(hero.sheet)} />
              </div>
              <span className="chip mono">{t("muster.beltCount", { n: kit.belt.length, max: BELT_SLOTS })}</span>
            </div>
          </section>
          <section className="card" aria-label={t("battle.belt")}>
            <div className="hd"><span className="lab">🎽 {t("battle.belt")}</span><span className="chip mono">{t("muster.beltPoints")}</span></div>
            <div className="bd">
              <ul className="items">
                {kit.belt.map((i) => row(i, "belt"))}
                {Array.from({ length: BELT_SLOTS - kit.belt.length }, (_, n) => (
                  <li key={"free" + n} className="slot-free" aria-label={t("muster.slotFree")}>+ {t("muster.slotFree")}</li>
                ))}
              </ul>
              <p className="hint">{t("muster.beltNote")} 🔒 <Src k="code" /></p>
            </div>
          </section>
        </div>

        <section className="card m-inspect" aria-label={t("muster.inspect")} ref={inspect}>
          <div className="hd"><span className="lab">{t("muster.inspect")}</span></div>
          <div className="bd">
            {!selItem ? (
              <p className="hint">{t("muster.tapItem")}</p>
            ) : (
              <div className="inspect">
                <span className="ico huge" aria-hidden="true">{k?.icon ?? "▫"}</span>
                <h3 className="k">{itemName(selItem)}</h3>
                <p className="mu">{itemLine(selItem)}</p>
                <div className="b-chips">
                  <span className="chip am">{t("muster.fromBackpack")}</span>
                  <span className="chip tl">{t("muster.fromBelt")}</span>
                </div>
                {k && <p className="lore">«{pick(k.lore)}» <Src k="card" /></p>}
                {k && <p className="hint">{t("muster.source", { from: pick(k.from), n: copies })} <Src k="example" /></p>}
                <div className="b-btns left">
                  <button type="button" className="btn" disabled={sel?.from !== "backpack" || !!whyNoBelt} onClick={() => move("belt")}>{t("muster.toBelt")}</button>
                  <button type="button" className="btn" disabled={sel?.from !== "belt" || !!whyNoBack} onClick={() => move("backpack")}>{t("muster.toBackpack")}</button>
                </div>
                {sel?.from === "backpack" && whyNoBelt && <p className="hint warn" role="status">{whyNoBelt}</p>}
                {sel?.from === "belt" && whyNoBack && <p className="hint warn" role="status">{whyNoBack}</p>}
                <p className="hint" role="status" aria-live="polite">{say}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="card b-foot">
        <p className="hint grow-line2">{t("muster.saved")} <Src k="code" /></p>
        <div className="b-btns">
          <button type="button" className="btn ghost" disabled={!onBack} onClick={onBack} aria-describedby={onBack ? undefined : "back-why"}>← {t("muster.back")}</button>
          <button type="button" className="btn rd big" onClick={onToBattle}>⚔ {t("muster.toBattle")}</button>
        </div>
        {!onBack && <p className="hint grow-line" id="back-why">{t("muster.backWhy")}</p>}
      </footer>
    </div>
  );
}
