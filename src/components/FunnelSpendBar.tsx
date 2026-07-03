import type { FunnelSpend } from "@/lib/types";
import { fmtNum, funnelColor } from "@/lib/viz";

// Stacked bar of spend share across TOF/MOF/BOF — the "are we missing a funnel
// stage?" view. One per chart.
export function FunnelSpendBar({ funnel }: { funnel: FunnelSpend }) {
  if (funnel.total <= 0) return null;
  const segments = [
    { label: "TOF", pct: funnel.tofPct, color: funnelColor("TOF") },
    { label: "MOF", pct: funnel.mofPct, color: funnelColor("MOF") },
    { label: "BOF", pct: funnel.bofPct, color: funnelColor("BOF") },
  ] as const;

  return (
    <div className="mb-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#0b1426]">
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.label}
              style={{ width: `${s.pct}%`, background: s.color }}
              title={`${s.label} ${fmtNum(s.pct, 0)}% of spend`}
            />
          ) : null
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-[#9fb0cb]">{s.label}</span>
            <span className="text-white">{fmtNum(s.pct, 0)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
