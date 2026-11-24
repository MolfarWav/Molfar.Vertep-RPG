import { t } from "@/i18n";
import { Avatar, HpBar } from "@/components/bars";
import { useSources } from "@/lib/sources";
import { maxHpOf, standing } from "@/rules";
import type { Fighter } from "@/rules";
import type { Line } from "./log";

/** One line of what a fighter wields (an example; real gear comes with the muster screen). */
export const gearOf = (id: string): string => {
  const v = t("gear." + id);
  return v === "gear." + id ? "" : v;
};

export type SrcKind = "code" | "sensor" | "card" | "example";

/** A mark that says where a block's data comes from; shown only when the viewer switched "Data sources" on. */
export function Src({ k }: { k: SrcKind }) {
  const on = useSources();
  return on ? <span className={"src " + k} title={t("src.hint." + k)}>{t("src." + k)}</span> : null;
}

export interface PickInfo {
  /** Chosen this round: the text of the choice. */
  text?: string;
  active: boolean;
  onItsOwn: boolean;
}

/** The turn strip: portraits with a mini HP, who has chosen, who chooses now. Arrows only between party and the rest are not drawn: both sides resolve at once. */
export function TurnStrip({ fighters, heroId, picks, activeId }: { fighters: Fighter[]; heroId: string | undefined; picks: Record<string, string>; activeId: string | undefined }) {
  return (
    <ol className="strip" aria-label={t("battle.order")}>
      {fighters.map((f, i) => (
        <li key={f.id} className={"strip-item" + (f.id === activeId ? " active" : "") + (standing(f) ? "" : " out")}>
          {i > 0 && <span className="arrow" aria-hidden="true">→</span>}
          <span className="strip-card">
            <Avatar name={f.name} size={28} hero={f.id === activeId} />
            <b>{f.name}{f.id === heroId ? ` · ${t("battle.you")}` : ""}</b>
            <span className="mono mu">{f.hp}</span>
            {picks[f.id] && <span className="tick" aria-label={t("battle.chosen")}>✓</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function PartyCards({ party, heroId, picks, activeId, control }: { party: Fighter[]; heroId: string | undefined; picks: Record<string, string>; activeId: string | undefined; control: "party" | "hero" }) {
  return (
    <section className="card b-party" aria-label={t("battle.party")}>
      <div className="hd"><span className="lab">{t("battle.party")} · {t("battle.picksKept")}</span><Src k="code" /></div>
      <ul className="bd">
        {party.map((f) => {
          const isActive = activeId === f.id;
          const hurt = f.injuries.map((i) => `${t("sev." + i.severity).toLowerCase()} · ${t("zone." + i.zone).toLowerCase()}`).join(", ");
          const own = control === "hero" && f.id !== heroId;
          const pick = picks[f.id];
          return (
            <li key={f.id} className={"b-row" + (isActive ? " active" : "") + (standing(f) ? "" : " out")}>
              <Avatar name={f.name} size={44} hero={isActive} />
              <div className="b-main">
                <b className="k">{f.name}{f.id === heroId ? ` · ${t("battle.yourHero")}` : isActive ? ` · ${t("battle.acting")}` : ""}</b>
                <span className="b-desc mu">{[gearOf(f.id), hurt].filter(Boolean).join(" · ") || t("battle.unhurt")}</span>
                <HpBar now={f.hp} max={maxHpOf(f)} />
                <span className="b-pick mono">
                  {!standing(f) ? t(f.fled ? "battle.fled" : f.dead ? "battle.dead" : "battle.down") : isActive ? <em>{t("battle.choosingNow")} ↓</em> : own ? t("battle.onCode") : pick ?? t("battle.waitingPick")}
                </span>
                {pick && !isActive && <span className="b-note mu">{t("battle.together")}</span>}
                {f.timid && standing(f) && <span className="b-note mu">{t("battle.timid")} <Src k="card" /></span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function RoundLog({ lines }: { lines: Line[] }) {
  return (
    <section className="card" aria-label={t("battle.log")}>
      <div className="hd"><span className="lab">{t("battle.log")}</span></div>
      <ol className="bd log" aria-live="polite">
        {lines.length === 0 && <li className="hint">{t("battle.logEmpty")}</li>}
        {lines.map((l) => (
          <li key={l.id + l.text} className={"ln " + l.tone}>
            <span className="mono mu">{t("battle.roundShort", { n: l.round })}</span> <span aria-hidden="true">{l.tone === "hit" ? "⚔" : l.tone === "good" ? "✚" : l.tone === "miss" ? "·" : "🛡"}</span> {l.text}
          </li>
        ))}
      </ol>
      <div className="hint bd">{t("battle.logNote")} <Src k="code" /></div>
    </section>
  );
}

export function ChatDraft({ text }: { text: string }) {
  return (
    <section className="card" aria-label={t("battle.chatTitle")}>
      <div className="hd"><span className="lab">{t("battle.chatTitle")}</span><span className="chip cy">{t("battle.draft")}</span></div>
      <div className="bd">
        <p className="draft">{text} <Src k="sensor" /></p>
        <button type="button" className="btn go" disabled aria-describedby="send-why">{t("battle.send")}</button>
        <p className="hint" id="send-why">{t("battle.sendWhy")}</p>
        <p className="hint">{t("battle.prose")} <Src k="code" /></p>
      </div>
    </section>
  );
}

export function DashStatus({ on, setOn, hero, control, setControl }: { on: boolean; setOn: (v: boolean) => void; hero: Fighter | undefined; control: "party" | "hero"; setControl: (c: "party" | "hero") => void }) {
  const hurt = hero?.injuries.map((i) => `${t("sev." + i.severity).toLowerCase()} · ${t("zone." + i.zone).toLowerCase()}`).join(", ");
  return (
    <section className="card" aria-label={t("battle.dashTitle")}>
      <div className="hd">
        <span className="lab">{t("battle.dashTitle")}</span>
        <div className="seg" role="group" aria-label={t("battle.dashTitle")}>
          <button type="button" className={on ? "on" : ""} aria-pressed={on} onClick={() => setOn(true)}>{t("battle.on")}</button>
          <button type="button" className={on ? "" : "on"} aria-pressed={!on} onClick={() => setOn(false)}>{t("battle.off")}</button>
        </div>
      </div>
      <div className="bd">
        {on ? (
          <>
            {hero && <p className="draft">{hero.name}: HP {hero.hp}/{maxHpOf(hero)}{hurt ? ` · ${hurt}` : ""}{gearOf(hero.id) ? ` · ${gearOf(hero.id)}` : ""} <Src k="code" /></p>}
            <p className="hint">{t("battle.sees")} <Src k="sensor" /></p>
          </>
        ) : (
          <p className="hint">{t("battle.statusOff")}</p>
        )}
        <div className="control">
          <span className="hint">{t("battle.control")}:</span>
          <div className="seg" role="group" aria-label={t("battle.control")}>
            <button type="button" className={control === "party" ? "on" : ""} aria-pressed={control === "party"} onClick={() => setControl("party")}>{t("battle.wholeParty")}</button>
            <button type="button" className={control === "hero" ? "on" : ""} aria-pressed={control === "hero"} onClick={() => setControl("hero")}>{t("battle.onlyHero")}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
