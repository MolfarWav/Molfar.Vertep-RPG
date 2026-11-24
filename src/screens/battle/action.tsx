import { t } from "@/i18n";
import { GUARD_POINTS, hitChance, parseEffect, ZONE_MULT, ZONES } from "@/rules";
import type { Fighter, Item, Power, Zone } from "@/rules";
import { Body } from "./body";
import { Src } from "./panels";
import type { Skin, SkinWord } from "@/data/skins";

export type Kind = "strike" | "power" | "item";
export type Tab = "strike" | "magic" | "guard" | "items";
export interface ItemPick {
  from: "belt" | "backpack";
  id: string;
}

export const harmful = (p: Power): boolean => {
  const fx = parseEffect(p.effect);
  return !!fx && (fx.key === "damage" || fx.key === "burn" || fx.key === "hit_mod");
};

export const skinWord = (skin: Skin, w: SkinWord): string => {
  const key = `skin.${skin}.${w}`;
  const v = t(key);
  return v === key ? t(`skin.fantasy.${w}`) : v;
};

export const powerLine = (p: Power): string => {
  const fx = parseEffect(p.effect);
  if (!fx) return "";
  if (fx.key === "damage") return t("power.damage", { n: fx.a });
  if (fx.key === "heal") return t("power.heal", { n: fx.a });
  if (fx.key === "burn") return t("power.burn", { n: fx.a, r: fx.b });
  return t("power.hitMod", { n: fx.a, r: fx.b });
};

export const itemLine = (i: Item): string => {
  const fx = parseEffect(i.effect);
  if (fx?.key === "heal") return t("item.heal", { n: fx.a });
  if (fx?.key === "treat") return t("item.treat", { sev: t("sev." + fx.b).toLowerCase() });
  const note = t("item.note." + i.id);
  return (note === "item.note." + i.id ? "" : note + " · ") + t("item.noUse");
};
export const itemUsable = (i: Item): boolean => parseEffect(i.effect) !== null;

const ZONE_ICON: Record<string, string> = { power: "✦" };

export interface ActionProps {
  skin: Skin;
  active: Fighter;
  target: Fighter | undefined;
  tab: Tab;
  setTab: (t: Tab) => void;
  zone: Zone;
  setZone: (z: Zone) => void;
  guard: Zone[];
  toggleGuard: (z: Zone) => void;
  guardMax: number;
  powerId: string | null;
  pickPower: (id: string) => void;
  item: ItemPick | null;
  pickItem: (p: ItemPick) => void;
  kind: Kind;
}

export function ActionPanel(p: ActionProps) {
  const { active, tab } = p;
  const hasMagic = active.powers.length > 0;
  const left = p.guardMax - p.guard.length;
  const legend = (
    <ul className="legend" aria-label={t("battle.legend")}>
      <li><i className="dot rd" aria-hidden="true" />{t("battle.legendAttack")}</li>
      <li><i className="dot tl" aria-hidden="true" />{skinWord(p.skin, "guard").toLowerCase()} {"●".repeat(p.guard.length)}{"○".repeat(Math.max(0, p.guardMax - p.guard.length))}</li>
      <li><i className="dot ring" aria-hidden="true" />{t("battle.legendBackpack")}</li>
      <li><i className="dot am" aria-hidden="true" />{t("battle.legendBelt")} 🔒</li>
    </ul>
  );
  return (
    <section className="card b-act" aria-label={t("battle.actionTitle")}>
      <div className="hd">
        <span className="lab">{t("battle.actionTitle")}</span>
        <div className="seg" role="tablist" aria-label={t("battle.actionTitle")}>
          <button type="button" role="tab" aria-selected={tab === "strike"} className={tab === "strike" ? "on" : ""} onClick={() => p.setTab("strike")}>{t("battle.strike")}</button>
          {hasMagic && <button type="button" role="tab" aria-selected={tab === "magic"} className={tab === "magic" ? "on" : ""} onClick={() => p.setTab("magic")}><span className="long">{skinWord(p.skin, "powers")}</span><span className="short" aria-hidden="true">{skinWord(p.skin, "powers").slice(0, 3)}</span></button>}
          <button type="button" role="tab" aria-selected={tab === "guard"} className={tab === "guard" ? "on" : ""} onClick={() => p.setTab("guard")}><span className="long">{skinWord(p.skin, "guard")}</span><span className="short" aria-hidden="true">{skinWord(p.skin, "guard").slice(0, 3)}</span> · {left}</button>
          <button type="button" role="tab" aria-selected={tab === "items"} className={tab === "items" ? "on" : ""} onClick={() => p.setTab("items")}><span className="long">{t("battle.inventory")}</span><span className="short" aria-hidden="true">{t("battle.inventory").slice(0, 3)}</span></button>
        </div>
      </div>
      <div className="bd act">
        {(tab === "strike" || tab === "guard") && (
          <div className="act-strike">
            <div className="body-col">
              <Body value={p.zone} guard={p.guard} onPick={tab === "strike" ? p.setZone : p.toggleGuard} mode={tab === "strike" ? "strike" : "guard"} />
              <span className="hint">{tab === "strike" ? t("battle.bodyHintStrike") : t("battle.bodyHintGuard")} <Src k="example" /></span>
            </div>
            <div className="act-list">
              {legend}
              {tab === "strike" ? (
                <ul className="zones">
                  {ZONES.map((z) => (
                    <li key={z}>
                      <button type="button" className={"zone-row" + (p.zone === z && p.kind === "strike" ? " on" : "")} aria-pressed={p.zone === z} onClick={() => p.setZone(z)}>
                        <b>{t("zone." + z)}</b>
                        <span className="mono mu">×{ZONE_MULT[z].toFixed(1)} · {t("zone." + z + ".hint")}{p.target ? ` · ${Math.round(hitChance(active, p.target, z))}%` : ""}</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" className="zone-row random" onClick={() => p.setZone(ZONES[Math.floor(Math.random() * ZONES.length)])}>🎲 {t("battle.random")}</button>
                  </li>
                </ul>
              ) : (
                <ul className="zones">
                  {ZONES.map((z) => (
                    <li key={z}>
                      <button type="button" className={"zone-row guard" + (p.guard.includes(z) ? " on" : "")} aria-pressed={p.guard.includes(z)} disabled={!p.guard.includes(z) && p.guard.length >= p.guardMax} onClick={() => p.toggleGuard(z)}>
                        <b>{t("zone." + z)}</b>
                        <span className="mono mu">{p.guard.includes(z) ? `${skinWord(p.skin, "guard").toLowerCase()} ✓` : skinWord(p.skin, "guard").toLowerCase()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="hint">{tab === "strike" ? t("battle.noteStrike") : t("battle.noteGuard", { n: p.guardMax, bag: p.guardMax < GUARD_POINTS ? t("battle.bagUsed") : t("battle.bagUntouched") })}</p>
            </div>
          </div>
        )}
        {tab === "magic" && (
          <>
            <ul className="powers">
              {active.powers.map((pw) => {
                const spent = pw.uses !== undefined && pw.uses <= 0;
                return (
                  <li key={pw.id}>
                    <button type="button" className={"power-row" + (p.powerId === pw.id && p.kind === "power" ? " on" : "")} aria-pressed={p.powerId === pw.id} disabled={spent} onClick={() => p.pickPower(pw.id)}>
                      <span className="ico" aria-hidden="true">{ZONE_ICON.power}</span>
                      <span className="grow"><b className="k">{pw.name}</b><span className="mu"> {powerLine(pw)}{pw.uses !== undefined ? ` · ${t("power.uses", { n: pw.uses })}` : ""}</span></span>
                      <span className="chip mono">{harmful(pw) ? t("power.foe") : t("power.ally")} · {t("power.insteadStrike")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="hint">{t("power.hint")}</p>
          </>
        )}
        {tab === "items" && (
          <>
            <div className="inv-head"><span className="lab">🎒 {t("battle.backpack")} · {t("battle.backpackCost")}</span><Src k="code" /></div>
            <ul className="powers">
              {active.backpack.length === 0 && <li className="hint">{t("battle.empty")}</li>}
              {active.backpack.map((i) => (
                <li key={i.id}>
                  <button type="button" className={"power-row" + (p.item?.id === i.id && p.item.from === "backpack" && p.kind === "item" ? " on" : "")} disabled={!itemUsable(i)} aria-pressed={p.item?.id === i.id && p.item.from === "backpack"} onClick={() => p.pickItem({ from: "backpack", id: i.id })}>
                    <span className="grow"><b className="k">{i.name}</b><span className="mu"> {itemLine(i)}</span></span>
                    <span className="chip mono">−1 {skinWord(p.skin, "guard").toLowerCase()}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="inv-head"><span className="lab">🎽 {t("battle.belt")} · {t("battle.beltCost")} 🔒</span></div>
            <ul className="powers">
              {active.belt.length === 0 && <li className="hint">{t("battle.empty")}</li>}
              {active.belt.map((i) => (
                <li key={i.id}>
                  <button type="button" className={"power-row" + (p.item?.id === i.id && p.item.from === "belt" && p.kind === "item" ? " on" : "")} disabled={!itemUsable(i)} aria-pressed={p.item?.id === i.id && p.item.from === "belt"} onClick={() => p.pickItem({ from: "belt", id: i.id })}>
                    <span className="grow"><b className="k">{i.name}</b><span className="mu"> {itemLine(i)}</span></span>
                    <span className="chip mono">0 · {t("battle.ready")}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="hint">{t("battle.noteItems")} <Src k="code" /></p>
          </>
        )}
      </div>
    </section>
  );
}
