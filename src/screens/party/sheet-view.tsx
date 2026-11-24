import { useState } from "react";
import { t } from "@/i18n";
import { Avatar, HpBar, XpBar } from "@/components/bars";
import {
  addXp, canLevelUp, cleanSheet, freeSkillRanks, freeStatPoints, hpMax, hpNowOf, levelUp, nextLevelXp, spendSkill, spendStat, STATS, STAT_MAX,
  SKILL_RANK_MAX, MAX_SKILLS, xpFor,
} from "@/rules";
import type { Entry } from "@/data/fixtures";
import type { Sheet, StatKey } from "@/rules";

interface Props {
  entry: Entry;
  onChange: (sheet: Sheet) => void;
  onRemove: () => void;
  saved: boolean;
}

export function SheetView({ entry, onChange, onRemove, saved }: Props) {
  const { sheet, proposal } = entry;
  const [skill, setSkill] = useState("");
  const [asking, setAsking] = useState(false);
  const free = freeStatPoints(sheet);
  const freeRanks = freeSkillRanks(sheet);
  const max = hpMax(sheet);
  const now = hpNowOf(sheet);
  const changed = proposal && JSON.stringify([proposal.stats, proposal.skills]) !== JSON.stringify([sheet.stats, sheet.skills]);
  const up = canLevelUp(sheet);
  const addSkill = () => {
    const next = spendSkill(sheet, skill);
    if (next) {
      onChange(next);
      setSkill("");
    }
  };
  return (
    <div className="sheet">
      <header className="card sheet-head">
        <Avatar name={sheet.name} size={56} hero />
        <div className="sheet-title">
          <h2 className="k">{sheet.name}</h2>
          <div className="mu">{sheet.role || t("sheet.noRole")}</div>
        </div>
        <span className="chip cy" title={t("sheet.levelHint")}>{t("sheet.level", { n: sheet.level })}</span>
        {saved && <span className="chip ok" role="status">{t("sheet.saved")}</span>}
      </header>

      <section className="card" aria-labelledby="vit">
        <div className="hd"><span className="lab" id="vit">{t("sheet.vitals")}</span></div>
        <div className="bd vit-grid">
          <div>
            <div className="row-lab"><span>{t("sheet.hp")}</span></div>
            <HpBar now={now} max={max} />
            {now < max && (
              <button type="button" className="btn sm ghost" onClick={() => onChange({ ...sheet, hpNow: null })}>{t("sheet.rest")}</button>
            )}
          </div>
          <div>
            <div className="row-lab"><span>{t("sheet.xp")}</span></div>
            <XpBar xp={sheet.xp} from={xpFor(sheet.level)} to={nextLevelXp(sheet)} />
            <div className="xp-btns">
              {[10, 50, 100].map((n) => (
                <button key={n} type="button" className="btn sm" onClick={() => onChange(addXp(sheet, n))}>+{n}</button>
              ))}
              {up && (
                <button type="button" className="btn go" onClick={() => { const next = levelUp(sheet); if (next) onChange(next); }}>
                  {t("sheet.levelUp", { n: sheet.level + 1 })}
                </button>
              )}
            </div>
            <div className="hint">{up ? t("sheet.levelUpHint") : t("sheet.xpHint")}</div>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="stats">
        <div className="hd">
          <span className="lab" id="stats">{t("sheet.stats")}</span>
          <span className={"chip " + (free > 0 ? "cy" : "")} role="status">{t("sheet.free", { n: free })}</span>
        </div>
        <div className="bd">
          <ul className="stats">
            {STATS.map((k: StatKey) => (
              <li key={k}>
                <div className="stat-name">
                  <b>{t("stat." + k)}</b>
                  <span className="hint">{t("stat." + k + ".hint")}</span>
                </div>
                <div className="pips" aria-hidden="true">
                  {Array.from({ length: STAT_MAX }, (_, i) => (
                    <i key={i} className={i < sheet.stats[k] ? "on" : ""} />
                  ))}
                </div>
                <b className="num mono">{sheet.stats[k]}</b>
                <button
                  type="button"
                  className="plus"
                  disabled={free < 1 || sheet.stats[k] >= STAT_MAX}
                  aria-label={t("sheet.raise", { stat: t("stat." + k) })}
                  onClick={() => { const next = spendStat(sheet, k); if (next) onChange(next); }}
                >+</button>
              </li>
            ))}
          </ul>
          {free < 1 && <div className="hint">{t("sheet.noFree")}</div>}
        </div>
      </section>

      <section className="card" aria-labelledby="skills">
        <div className="hd">
          <span className="lab" id="skills">{t("sheet.skills")}</span>
          <span className={"chip " + (freeRanks > 0 ? "cy" : "")} role="status">{t("sheet.freeRanks", { n: freeRanks })}</span>
        </div>
        <div className="bd">
          {sheet.skills.length === 0 && <div className="hint">{t("sheet.noSkills")}</div>}
          <ul className="skills">
            {sheet.skills.map((s) => (
              <li key={s.name}>
                <b>{s.name}</b>
                <span className="pips" aria-label={t("sheet.rank", { n: s.rank })}>
                  {Array.from({ length: SKILL_RANK_MAX }, (_, i) => (
                    <i key={i} className={i < s.rank ? "on" : ""} />
                  ))}
                </span>
                <button type="button" className="plus" disabled={freeRanks < 1 || s.rank >= SKILL_RANK_MAX} aria-label={t("sheet.raise", { stat: s.name })}
                  onClick={() => { const next = spendSkill(sheet, s.name); if (next) onChange(next); }}>+</button>
              </li>
            ))}
          </ul>
          {freeRanks > 0 && sheet.skills.length < MAX_SKILLS && (
            <form className="add-skill" onSubmit={(e) => { e.preventDefault(); addSkill(); }}>
              <label className="sr" htmlFor="new-skill">{t("sheet.newSkill")}</label>
              <input id="new-skill" value={skill} maxLength={40} placeholder={t("sheet.skillPh")} onChange={(e) => setSkill(e.target.value)} />
              <button type="submit" className="btn sm" disabled={!skill.trim()}>{t("sheet.add")}</button>
            </form>
          )}
        </div>
      </section>

      <section className="card" aria-labelledby="purse">
        <div className="hd"><span className="lab" id="purse">{t("sheet.purse")}</span></div>
        <div className="bd purse">
          <b className="num mono">{sheet.money}</b> <span className="mu">{sheet.currency}</span>
          <span className="hint">{t("sheet.purseHint")}</span>
        </div>
      </section>

      {sheet.note && (
        <section className="card" aria-labelledby="why">
          <div className="hd"><span className="lab" id="why">{t("sheet.why")}</span></div>
          <div className="bd"><p className="note">{sheet.note}</p></div>
        </section>
      )}

      <div className="sheet-actions">
        {changed && proposal && (
          <button type="button" className="btn ghost" onClick={() => onChange(cleanSheet({ ...sheet, stats: proposal.stats, skills: proposal.skills }))}>{t("sheet.reset")}</button>
        )}
        {asking ? (
          <span className="confirm" role="alert">
            {t("sheet.removeAsk")}
            <button type="button" className="btn sm rd" onClick={onRemove}>{t("sheet.remove")}</button>
            <button type="button" className="btn sm ghost" onClick={() => setAsking(false)}>{t("common.cancel")}</button>
          </span>
        ) : (
          <button type="button" className="btn ghost" onClick={() => setAsking(true)}>{t("sheet.remove")}</button>
        )}
      </div>
    </div>
  );
}
