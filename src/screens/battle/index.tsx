import { useMemo, useRef, useState } from "react";
import { t } from "@/i18n";
import { Avatar, HpBar } from "@/components/bars";
import { exampleFoes, exampleParty, kitFor } from "@/data/fixtures";
import type { Entry } from "@/data/fixtures";
import type { Skin, SkinWord } from "@/data/skins";
import {
  aiChoices, applyDefeat, fighterFromSheet, GUARD_POINTS, hitChance, makeRng, maxHpOf, parseEffect, resolveRound, standing, ZONE_MULT, ZONES,
} from "@/rules";
import type { BattleState, Choice, Fighter, Power, Zone } from "@/rules";
import { Body } from "./body";
import { lineOf, nameOf } from "./log";
import type { Line } from "./log";

const word = (skin: Skin, w: SkinWord): string => {
  const key = `skin.${skin}.${w}`;
  const v = t(key);
  return v === key ? t(`skin.fantasy.${w}`) : v;
};

function build(entries: Entry[]): BattleState {
  const src = (entries.length ? entries : exampleParty()).slice(0, 4);
  const party = src.map((e) => fighterFromSheet(e.sheet, kitFor(e.id, "party")));
  const foes = exampleFoes().map((f) => fighterFromSheet(f.sheet, kitFor(f.id, "foe")));
  return { round: 0, fighters: [...party, ...foes], stakes: { flee: true, defeat: 2 }, outcome: null, now: 0 };
}

const harmful = (p: Power): boolean => {
  const fx = parseEffect(p.effect);
  return !!fx && (fx.key === "damage" || fx.key === "burn" || fx.key === "hit_mod");
};
const powerLine = (p: Power): string => {
  const fx = parseEffect(p.effect);
  if (!fx) return "";
  if (fx.key === "damage") return t("power.damage", { n: fx.a });
  if (fx.key === "heal") return t("power.heal", { n: fx.a });
  if (fx.key === "burn") return t("power.burn", { n: fx.a, r: fx.b });
  return t("power.hitMod", { n: fx.a, r: fx.b });
};

type Tab = "strike" | "magic" | "guard";

export function BattleScreen({ entries, skin, seed }: { entries: Entry[]; skin: Skin; seed?: number }) {
  const [battle, setBattle] = useState<BattleState>(() => build(entries));
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, setPending] = useState<Choice[]>([]);
  const [control, setControl] = useState<"party" | "hero">("party");
  const [tab, setTab] = useState<Tab>("strike");
  const [zone, setZone] = useState<Zone>("torso");
  const [guard, setGuard] = useState<Zone[]>(["head", "torso"]);
  const [powerId, setPowerId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const rng = useRef(makeRng(seed ?? Date.now() % 100000));

  const party = battle.fighters.filter((f) => f.side === "party");
  const foes = battle.fighters.filter((f) => f.side === "foe");
  const hero = party[0];
  const standingParty = party.filter(standing);
  const deciders = control === "party" ? standingParty : standingParty.filter((f) => f.id === hero?.id);
  const active: Fighter | undefined = battle.outcome ? undefined : deciders[pending.length];
  const power = active?.powers.find((p) => p.id === powerId && (p.uses === undefined || p.uses > 0)) ?? null;
  const usingPower = tab === "magic" && power !== null;
  const wantAlly = usingPower && power !== null && !harmful(power);
  const pool = wantAlly ? standingParty : foes.filter(standing);
  // a friend to help defaults to the most hurt one, an enemy to the first standing one
  const byHurt = [...pool].sort((a, b) => a.hp / maxHpOf(a) - b.hp / maxHpOf(b));
  const target = pool.find((f) => f.id === targetId) ?? (wantAlly ? byHurt[0] : pool[0]);
  const who = useMemo(() => nameOf(battle.fighters), [battle.fighters]);
  const hasMagic = !!active && active.powers.length > 0;

  const resetPick = () => {
    setTab("strike");
    setPowerId(null);
    setTargetId(null);
    setGuard(["head", "torso"]);
  };

  const play = (choice: Choice) => {
    const next = [...pending, choice];
    if (next.length < deciders.length) {
      setPending(next);
      resetPick();
      return;
    }
    const r = rng.current;
    const chosen = new Set(next.map((c) => c.by));
    const rest = aiChoices(battle, r, "party").filter((c) => !chosen.has(c.by));
    const against = aiChoices(battle, r, "foe");
    const out = resolveRound(battle, [...next, ...rest, ...against], r);
    const fresh: Line[] = [];
    out.events.forEach((e, i) => {
      const l = lineOf(e, out.state.round, nameOf(out.state.fighters), i);
      if (l) fresh.push(l);
    });
    setLines((old) => [...fresh, ...old].slice(0, 80));
    setBattle(out.state);
    setPending([]);
    resetPick();
  };

  const fight = () => {
    if (!active) return;
    if (usingPower && power && target) play({ kind: "power", by: active.id, power: power.id, target: target.id, guard });
    else if (target) play({ kind: "strike", by: active.id, target: target.id, zone, guard });
  };
  const restart = () => {
    setBattle(build(entries));
    setLines([]);
    setPending([]);
    resetPick();
    setControl("party");
  };
  const toggleGuard = (z: Zone) => setGuard((g) => (g.includes(z) ? g.filter((x) => x !== z) : g.length >= GUARD_POINTS ? g : [...g, z]));
  const defeat = battle.outcome === "lost" ? applyDefeat(battle, rng.current, hero?.id) : null;
  const decided = (id: string) => pending.find((c) => c.by === id);
  const stateOf = (f: Fighter): string =>
    !standing(f) ? t(f.fled ? "battle.fled" : f.dead ? "battle.dead" : "battle.down") : active?.id === f.id ? t("battle.choosing") : decided(f.id) ? t("battle.chosen") : control === "hero" && f.id !== hero?.id ? t("battle.onItsOwn") : t("battle.waiting");
  const summary = usingPower && power ? `${power.name}` : `${t("battle.strike")}: ${t("zone." + zone)} ×${ZONE_MULT[zone]}`;

  return (
    <div className="battle">
      <header className="card b-head">
        <h2 className="k">{t("battle.title")}</h2>
        <span className="chip tl" title={t("battle.exampleHint")}>{t("battle.example")}</span>
        <span className="chip">{t("skin." + skin)}</span>
        <span className="chip am" role="status">{t("battle.round", { n: battle.round + 1 })}</span>
        <div className="seg" role="group" aria-label={t("battle.control")}>
          <button type="button" className={control === "party" ? "on" : ""} aria-pressed={control === "party"} onClick={() => { setControl("party"); setPending([]); }}>{t("battle.wholeParty")}</button>
          <button type="button" className={control === "hero" ? "on" : ""} aria-pressed={control === "hero"} onClick={() => { setControl("hero"); setPending([]); }}>{t("battle.onlyHero")}</button>
        </div>
      </header>

      <section className="card b-field" aria-label={t("battle.field")}>
        <div className="hd"><span className="lab">{word(skin, "field")}</span>{active && <span className="mu">{t("battle.turnOf", { name: active.name })}</span>}</div>
        <div className="bd field">
          <ul className="side">
            {party.map((f) => (
              <li key={f.id}>
                <button type="button" className={"fig" + (wantAlly && target?.id === f.id ? " target" : "") + (standing(f) ? "" : " out")} disabled={!wantAlly || !standing(f)} aria-pressed={wantAlly && target?.id === f.id} aria-label={t("battle.target", { name: f.name })} onClick={() => setTargetId(f.id)}>
                  <Avatar name={f.name} size={44} hero={active?.id === f.id} />
                  <b>{f.name}{f.id === hero?.id ? ` · ${t("battle.you")}` : ""}</b>
                  <HpBar now={f.hp} max={maxHpOf(f)} />
                  <span className="mu mono b-state">{stateOf(f)}</span>
                </button>
              </li>
            ))}
          </ul>
          <span className="vs k">{t("battle.vs")}</span>
          <ul className="side">
            {foes.map((f) => (
              <li key={f.id}>
                <button type="button" className={"fig foe" + (!wantAlly && target?.id === f.id ? " target" : "") + (standing(f) ? "" : " out")} disabled={wantAlly || !standing(f)} aria-pressed={!wantAlly && target?.id === f.id} aria-label={t("battle.target", { name: f.name })} onClick={() => setTargetId(f.id)}>
                  <Avatar name={f.name} size={44} />
                  <b>{f.name}</b>
                  <HpBar now={f.hp} max={maxHpOf(f)} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        {active && <div className="hint b-hint">{wantAlly ? t("battle.pickAlly") : t("battle.pickFoe")}</div>}
      </section>

      {battle.outcome ? (
        <section className="card b-end" role="status">
          <div className="bd">
            <h2 className="k">{t("outcome." + battle.outcome)}</h2>
            <p>{t("outcome." + battle.outcome + ".text", { rounds: battle.round })}</p>
            {defeat && (
              <p className="mu">{t("defeat.step" + defeat.step)}{defeat.offer.length ? " " + t("defeat.offer") : ""}</p>
            )}
            <p className="hint">{t("battle.toChat")}</p>
            <button type="button" className="btn go" onClick={restart}>{t("battle.again")}</button>
          </div>
        </section>
      ) : (
        <section className="card b-act" aria-label={t("battle.action")}>
          <div className="hd">
            <span className="lab">{t("battle.action")}</span>
            <div className="seg" role="tablist" aria-label={t("battle.action")}>
              <button type="button" role="tab" aria-selected={tab === "strike"} className={tab === "strike" ? "on" : ""} onClick={() => { setTab("strike"); setPowerId(null); }}>{t("battle.strike")}</button>
              {hasMagic && <button type="button" role="tab" aria-selected={tab === "magic"} className={tab === "magic" ? "on" : ""} onClick={() => { setTab("magic"); setPowerId(active?.powers.find((p) => p.uses === undefined || p.uses > 0)?.id ?? null); }}>{word(skin, "powers")}</button>}
              <button type="button" role="tab" aria-selected={tab === "guard"} className={tab === "guard" ? "on" : ""} onClick={() => setTab("guard")}>{word(skin, "guard")} · {GUARD_POINTS - guard.length}</button>
            </div>
          </div>
          <div className="bd act">
            {tab === "strike" && active && (
              <div className="act-strike">
                <Body value={zone} onPick={setZone} mode="strike" />
                <ul className="zones">
                  {ZONES.map((z) => (
                    <li key={z}>
                      <button type="button" className={"zone-row" + (zone === z ? " on" : "")} aria-pressed={zone === z} onClick={() => setZone(z)}>
                        <b>{t("zone." + z)}</b>
                        <span className="mono mu">×{ZONE_MULT[z]}{target ? ` · ${Math.round(hitChance(active, target, z))}%` : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tab === "magic" && active && (
              <ul className="powers">
                {active.powers.map((p) => {
                  const spent = p.uses !== undefined && p.uses <= 0;
                  return (
                    <li key={p.id}>
                      <button type="button" className={"power-row" + (powerId === p.id ? " on" : "")} aria-pressed={powerId === p.id} disabled={spent} onClick={() => { setPowerId(p.id); setTargetId(null); }}>
                        <b className="k">{p.name}</b>
                        <span className="mu">{powerLine(p)}{p.uses !== undefined ? ` · ${t("power.uses", { n: p.uses })}` : ""}</span>
                        <span className="chip mono">{harmful(p) ? t("power.foe") : t("power.ally")}</span>
                      </button>
                    </li>
                  );
                })}
                <li className="hint">{t("power.hint")}</li>
              </ul>
            )}
            {tab === "guard" && (
              <div className="act-strike">
                <Body value={zone} guard={guard} onPick={toggleGuard} mode="guard" />
                <ul className="zones">
                  {ZONES.map((z) => (
                    <li key={z}>
                      <button type="button" className={"zone-row guard" + (guard.includes(z) ? " on" : "")} aria-pressed={guard.includes(z)} disabled={!guard.includes(z) && guard.length >= GUARD_POINTS} onClick={() => toggleGuard(z)}>
                        <b>{t("zone." + z)}</b>
                        <span className="mono mu">{guard.includes(z) ? t("battle.guarded") : ""}</span>
                      </button>
                    </li>
                  ))}
                  <li className="hint">{t("battle.guardHint", { word: word(skin, "guard").toLowerCase() })}</li>
                </ul>
              </div>
            )}
          </div>
          <footer className="b-foot">
            <span className="chip rd">{summary} ✓</span>
            <span className="chip tl">{word(skin, "guard")}: {guard.length ? guard.map((z) => t("zone." + z)).join(" + ") : t("battle.none")} ✓</span>
            <span className="grow" />
            {battle.stakes.flee && active && <button type="button" className="btn ghost" onClick={() => active && play({ kind: "flee", by: active.id })}>{t("battle.flee")}</button>}
            {active && <button type="button" className="btn" onClick={() => active && play({ kind: "skip", by: active.id, guard })}>{t("battle.skip")}</button>}
            {active ? (
              <button type="button" className="btn go big" disabled={!target} onClick={fight}>{deciders.length > 1 && pending.length < deciders.length - 1 ? t("battle.next") : t("battle.fight")}</button>
            ) : (
              <button type="button" className="btn go big" onClick={() => play({ kind: "skip", by: hero?.id ?? "", guard: [] })}>{t("battle.nextRound")}</button>
            )}
          </footer>
        </section>
      )}

      <section className="card b-log" aria-label={t("battle.log")}>
        <div className="hd"><span className="lab">{t("battle.log")}</span></div>
        <ol className="bd log" aria-live="polite">
          {lines.length === 0 && <li className="hint">{t("battle.logEmpty")}</li>}
          {lines.map((l) => (
            <li key={l.id + l.text} className={"ln " + l.tone}>
              <span className="mono mu">r{l.round}</span> {l.text}
            </li>
          ))}
        </ol>
        <div className="hint bd">{t("battle.logNote")}</div>
      </section>
    </div>
  );
}
