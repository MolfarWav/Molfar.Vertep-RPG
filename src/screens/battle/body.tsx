import { t } from "@/i18n";
import { ZONES } from "@/rules";
import type { Zone } from "@/rules";

/** A figure with five zones. Each zone is a real button (not only a picture), so it works with a thumb and a keyboard. */
export function Body({ value, onPick, guard, mode }: { value: Zone; onPick: (z: Zone) => void; guard?: Zone[]; mode: "strike" | "guard" }) {
  const shape: Record<Zone, { x: number; y: number; w: number; h: number; r: number }> = {
    head: { x: 40, y: 4, w: 30, h: 30, r: 15 },
    torso: { x: 33, y: 38, w: 44, h: 38, r: 6 },
    belly: { x: 37, y: 78, w: 36, h: 24, r: 6 },
    arms: { x: 8, y: 40, w: 16, h: 58, r: 8 },
    legs: { x: 36, y: 106, w: 38, h: 66, r: 8 },
  };
  const on = (z: Zone) => (mode === "strike" ? value === z : (guard ?? []).includes(z));
  return (
    <svg className={"body " + mode} viewBox="0 0 110 178" role="group" aria-label={t(mode === "strike" ? "battle.pickZone" : "battle.pickGuard")}>
      {ZONES.map((z) => {
        const s = shape[z];
        const rects = z === "arms" ? [s, { ...s, x: 110 - s.x - s.w }] : z === "legs" ? [{ ...s, w: s.w / 2 - 2 }, { ...s, x: s.x + s.w / 2 + 2, w: s.w / 2 - 2 }] : [s];
        return (
          <g key={z} role="button" tabIndex={0} aria-pressed={on(z)} aria-label={t("zone." + z)} onClick={() => onPick(z)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(z); } }}>
            {rects.map((r, i) => (
              <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r} className={"zone" + (on(z) ? " on" : "")} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
