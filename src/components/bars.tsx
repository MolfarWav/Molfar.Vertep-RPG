import { t } from "@/i18n";

export function Avatar({ name, size = 40, hero = false }: { name: string; size?: number; hero?: boolean }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span className={"av" + (hero ? " hero" : "")} style={{ width: size, height: size, fontSize: Math.round(size * 0.45), ["--h" as string]: h }} aria-hidden="true">
      {(Array.from(name)[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** HP as a bar and as numbers: colour and text always together (green, amber under half, red under a quarter). */
export function HpBar({ now, max, label = true }: { now: number; max: number; label?: boolean }) {
  const share = max > 0 ? Math.max(0, Math.min(1, now / max)) : 0;
  const tone = share <= 0.25 ? "low" : share <= 0.5 ? "mid" : "ok";
  return (
    <div className={"bar hp " + tone} role="img" aria-label={t("hp.aria", { now, max })}>
      <i style={{ width: `${Math.round(share * 100)}%` }} />
      {label && <b>{now}/{max}</b>}
    </div>
  );
}

export function XpBar({ xp, from, to }: { xp: number; from: number; to: number | null }) {
  const share = to === null ? 1 : Math.max(0, Math.min(1, (xp - from) / Math.max(1, to - from)));
  return (
    <div className="bar xp" role="img" aria-label={to === null ? t("xp.max") : t("xp.aria", { xp, to })}>
      <i style={{ width: `${Math.round(share * 100)}%` }} />
      <b>{to === null ? t("xp.max") : `${xp}/${to}`}</b>
    </div>
  );
}
