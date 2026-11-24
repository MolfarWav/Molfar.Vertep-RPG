import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/i18n";
import { Avatar, HpBar } from "@/components/bars";
import { ENCOUNTER, exampleFoes, exampleParty, kitFor } from "@/data/fixtures";
import type { Entry } from "@/data/fixtures";
import type { Skin } from "@/data/skins";
import type { KitsApi } from "@/lib/kits";
import { setSources, useSources } from "@/lib/sources";
import { aiChoices, applyDefeat, fighterFromSheet, GUARD_POINTS, makeRng, maxHpOf, resolveRound, standing, ZONE_MULT } from "@/rules";
import type { BattleState, Choice, Fighter, Zone } from "@/rules";
import { ActionPanel, harmful, skinWord } from "./action";
import type { ItemPick, Kind, Tab } from "./action";
import { lineOf, nameOf } from "./log";
import type { Line } from "./log";
import { ChatDraft, DashStatus, PartyCards, RoundLog, Src, TurnStrip } from "./panels";

function build(entries: Entry[], kitOf: KitsApi["kitOf"]): BattleState {
  const src = (entries.length ? entries : exampleParty()).slice(0, 4);
  const party = src.map((e) => fighterFromSheet(e.sheet, kitFor(e.id, "party", kitOf(e.id))));
  const foes = exampleFoes().map((f) => fighterFromSheet(f.sheet, kitFor(f.id, "foe")));
  return { round: 0, fighters: [...party, ...foes], stakes: { flee: true, defeat: 2 }, outcome: null, now: 0 };
}

const DASH_KEY = "rpg:dash-status";
const readDash = (): boolean => {
  try {
    return localStorage.getItem(DASH_KEY) !== "0";
  } catch {
    return true;
  }
};

export function BattleScreen({ entries, skin, seed, kits, onMuster, onRound }: { entries: Entry[]; skin: Skin; seed?: number; kits: KitsApi; onMuster: () => void; onRound: (round: number) => void }) {
  const [battle, setBattle] = useState<BattleState>(() => build(entries, kits.kitOf));
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, setPending] = useState<Choice[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [control, setControl] = useState<"party" | "hero">("party");
  const [tab, setTab] = useState<Tab>("strike");
  const [kind, setKind] = useState<Kind>("strike");
  const [zone, setZone] = useState<Zone>("torso");
  const [guard, setGuard] = useState<Zone[]>(["head", "torso"]);
  const [powerId, setPowerId] = useState<string | null>(null);
  const [item, setItem] = useState<ItemPick | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [dashOn, setDashOnState] = useState<boolean>(readDash);
  const sources = useSources();
  const rng = useRef(makeRng(seed ?? Date.now() % 100000));
  // before the first round the muster may still change what the party carries; the fight takes it as it is after that
  useEffect(() => {
    setBattle((b) => (b.round === 0 && !b.outcome ? build(entries, kits.kitOf) : b));
  }, [kits.version, entries, kits.kitOf]);
  useEffect(() => onRound(battle.outcome ? 0 : battle.round), [battle.round, battle.outcome, onRound]);

  const party = battle.fighters.filter((f) => f.side === "party");
  const foes = battle.fighters.filter((f) => f.side === "foe");
  const hero = party[0];
  const standingParty = party.filter(standing);
  const deciders = control === "party" ? standingParty : standingParty.filter((f) => f.id === hero?.id);
  const active: Fighter | undefined = battle.outcome ? undefined : deciders[pending.length];
  const power = active?.powers.find((p) => p.id === powerId && (p.uses === undefined || p.uses > 0)) ?? null;
  const itemObj = active && item ? (item.from === "belt" ? active.belt : active.backpack).find((i) => i.id === item.id) ?? null : null;
  const usingPower = kind === "power" && power !== null;
  const usingItem = kind === "item" && itemObj !== null;
  const wantAlly = (usingPower && power !== null && !harmful(power)) || usingItem;
  const pool = wantAlly ? standingParty : foes.filter(standing);
  const byHurt = [...pool].sort((a, b) => a.hp / maxHpOf(a) - b.hp / maxHpOf(b));
  const target = pool.find((f) => f.id === targetId) ?? (wantAlly ? byHurt[0] : pool[0]);
  const guardMax = usingItem && item?.from === "backpack" ? GUARD_POINTS - 1 : GUARD_POINTS;
  const shownGuard = guard.slice(0, guardMax);
  const ready = !!active && !!target && (kind === "strike" || usingPower || usingItem);

  const resetPick = () => {
    setTab("strike");
    setKind("strike");
    setPowerId(null);
    setItem(null);
    setTargetId(null);
    setGuard(["head", "torso"]);
  };
  const setDash = (v: boolean) => {
    setDashOnState(v);
    try {
      localStorage.setItem(DASH_KEY, v ? "1" : "0");
    } catch {
      // storage can be blocked
    }
  };
  const changeTab = (next: Tab) => {
    setTab(next);
    if (next === "strike") {
      setKind("strike");
      setTargetId(null);
    } else if (next === "magic") {
      const first = active?.powers.find((p) => p.uses === undefined || p.uses > 0);
      if (first) {
        setPowerId(first.id);
        setKind("power");
        setTargetId(null);
      }
    } else if (next === "items") {
      setKind("item");
      setTargetId(null);
    }
  };
  const toggleGuard = (z: Zone) => setGuard((g) => (g.includes(z) ? g.filter((x) => x !== z) : g.length >= guardMax ? g : [...g, z]));
  const guardText = shownGuard.length ? shownGuard.map((z) => t("zone." + z)).join(" + ") : t("battle.none");
  const pickText = (): string => {
    const what = usingPower && power ? power.name : usingItem && itemObj ? itemObj.name : `${t("battle.strikeLow")} ${t("zone." + zone)} ×${ZONE_MULT[zone].toFixed(1)}`;
    return `${what} ✓ · ${skinWord(skin, "guard").toLowerCase()} ${guardText} ✓`;
  };

  const play = (choice: Choice, text: string) => {
    const next = [...pending, choice];
    setPicks((p) => ({ ...p, [choice.by]: text }));
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
    setPicks({});
    resetPick();
  };

  const fight = () => {
    if (!active || !target) return;
    const g = shownGuard;
    if (usingPower && power) play({ kind: "power", by: active.id, power: power.id, target: target.id, guard: g }, pickText());
    else if (usingItem && item && itemObj) play({ kind: "item", by: active.id, from: item.from, item: itemObj.id, target: target.id, guard: g }, pickText());
    else play({ kind: "strike", by: active.id, target: target.id, zone, guard: g }, pickText());
  };
  const restart = () => {
    setBattle(build(entries, kits.kitOf));
    setLines([]);
    setPending([]);
    setPicks({});
    resetPick();
    setControl("party");
  };

  const who = useMemo(() => nameOf(battle.fighters), [battle.fighters]);
  const defeat = battle.outcome === "lost" ? applyDefeat(battle, rng.current, hero?.id) : null;
  const summary = useMemo(() => {
    const foesText = foes.map((f) => `${f.name} ${f.hp}/${maxHpOf(f)}`).join(", ");
    const partyText = party.filter((f) => f.id !== hero?.id).map((f) => `${f.name} ${f.hp}/${maxHpOf(f)}`).join(", ");
    const fled = battle.fighters.some((f) => f.fled);
    return t("battle.summary", { round: battle.round, foes: foesText, party: partyText, fled: fled ? t("battle.fledYes") : t("battle.fledNo"), loot: t("enc.loot") });
  }, [battle, foes, party, hero?.id]);
  void who;

  const stakeDefeat = ["robbed", "wounded", "captured", "deadly"][battle.stakes.defeat - 1];
  const strip = [...party, ...foes];
  const sideBtn = (f: Fighter, ally: boolean) => {
    const targetable = ally ? wantAlly : !wantAlly;
    const picked = target?.id === f.id && targetable;
    return (
      <li key={f.id}>
        <button type="button" className={"fig" + (ally ? "" : " foe") + (picked ? " target" : "") + (standing(f) ? "" : " out") + (active?.id === f.id ? " acting" : "")} disabled={!targetable || !standing(f) || !active} aria-pressed={picked} aria-label={t("battle.target", { name: f.name })} onClick={() => setTargetId(f.id)}>
          <Avatar name={f.name} size={ally ? 44 : 48} hero={active?.id === f.id} />
          <b>{f.name}</b>
          <span className="mono mu">{ally ? f.hp : `${f.hp}/${maxHpOf(f)}`}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="battle">
      <header className="card b-head">
        <h2 className="k">{t("battle.title")}</h2>
        <span className="chip tl" title={t("battle.exampleHint")}>{t("battle.example")}</span>
        <span className="chip mono">{t("battle.contract", { v: ENCOUNTER.contract })}</span>
        <span className="grow" />
        {battle.round === 0 && !battle.outcome && <button type="button" className="btn sm" onClick={onMuster}>🎒 {t("tab.muster")}</button>}
        {battle.stakes.flee && <span className="chip am">{t("battle.fleeAllowed")}</span>}
        <span className="chip rd" title={t("defeat.step" + battle.stakes.defeat)}>{t("battle.defeatChip", { step: t("defeat.name." + stakeDefeat) })}</span>
        <span className="chip" role="status">{t("battle.round", { n: battle.round + (battle.outcome ? 0 : 1) })}</span>
        <label className="chk"><input type="checkbox" checked={sources} onChange={(e) => setSources(e.target.checked)} /> {t("battle.showSources")}</label>
      </header>

      <p className="scene k">«{t("enc.scene")}» <Src k="sensor" /></p>

      <TurnStrip fighters={strip} heroId={hero?.id} picks={picks} activeId={active?.id} />

      <PartyCards party={party} heroId={hero?.id} picks={picks} activeId={active?.id} control={control} />

      <div className="b-center">
        <section className="card b-field" aria-label={t("battle.field")}>
          <div className="bd field">
            <ul className="side">{party.map((f) => sideBtn(f, true))}</ul>
            <span className="vs"><span className="k">{t("battle.vs")}</span><b>{t("battle.place")}</b></span>
            <ul className="side">{foes.map((f) => sideBtn(f, false))}</ul>
          </div>
          <div className="hint b-hint">
            {active ? <><b>{active.name}</b> → <b>{target?.name ?? "…"}</b> · {wantAlly ? t("battle.pickAlly") : t("battle.pickFoe")} <Src k="code" /></> : battle.outcome ? "" : t("battle.nobodyActs")}
          </div>
        </section>

        {battle.outcome ? (
          <section className="card b-end" role="status">
            <div className="bd">
              <h2 className="k">{t("outcome." + battle.outcome)}</h2>
              <p>{t("outcome." + battle.outcome + ".text", { rounds: battle.round })}</p>
              {defeat && <p className="mu">{t("defeat.step" + defeat.step)}{defeat.offer.length ? " " + t("defeat.offer") : ""}</p>}
              <p className="hint">{t("battle.toChat")}</p>
              <button type="button" className="btn go" onClick={restart}>{t("battle.again")}</button>
            </div>
          </section>
        ) : (
          <>
            {active && (
              <ActionPanel
                skin={skin} active={active} target={target} tab={tab} setTab={changeTab} zone={zone} guard={shownGuard} guardMax={guardMax}
                setZone={(z) => { setZone(z); setKind("strike"); setTab("strike"); setTargetId(null); }}
                toggleGuard={toggleGuard} powerId={powerId}
                pickPower={(id) => { setPowerId(id); setKind("power"); setTargetId(null); }}
                item={item} pickItem={(p) => { setItem(p); setKind("item"); setTargetId(null); }} kind={kind}
              />
            )}
            <div className="card b-foot" aria-label={t("battle.chosenAction")}>
              <div className="b-chips">
                <span className="chip rd">{usingPower && power ? power.name : usingItem && itemObj ? itemObj.name : kind === "item" ? t("battle.pickItem") : `${t("battle.strikeLow")}: ${t("zone." + zone)} ×${ZONE_MULT[zone].toFixed(1)}`} {ready ? "✓" : ""}</span>
                <span className="chip tl">{skinWord(skin, "guard").toLowerCase()}: {guardText} ✓</span>
              </div>
              <div className="b-btns">
                {battle.stakes.flee && active && <button type="button" className="btn ghost" onClick={() => play({ kind: "flee", by: active.id }, t("battle.flee"))}>{t("battle.flee")}</button>}
                {active && <button type="button" className="btn" onClick={() => play({ kind: "skip", by: active.id, guard: shownGuard }, t("battle.skip"))}>{t("battle.skip")}</button>}
                {active ? (
                  <button type="button" className="btn go big" disabled={!ready} onClick={fight}>{deciders.length > 1 && pending.length < deciders.length - 1 ? t("battle.next") : t("battle.fight")}</button>
                ) : (
                  <button type="button" className="btn go big" onClick={() => play({ kind: "skip", by: hero?.id ?? "", guard: [] }, "")}>{t("battle.nextRound")}</button>
                )}
              </div>
              <p className="hint grow-line">{!ready && active ? t("battle.notReady") + " " : ""}{t("battle.keptByCode")} <Src k="code" /></p>
            </div>
          </>
        )}
      </div>

      <aside className="b-side">
        <RoundLog lines={lines} />
        <ChatDraft text={summary} />
        <DashStatus on={dashOn} setOn={setDash} hero={hero} control={control} setControl={(c) => { setControl(c); setPending([]); setPicks({}); }} />
      </aside>
    </div>
  );
}
