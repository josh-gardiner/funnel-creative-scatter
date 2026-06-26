import type { ChartPoint } from "@/lib/viz";
import { fmtNum, fmtUSD, funnelColor } from "@/lib/viz";

// Ads sorted by spend desc: name + spend + spend% + funnel badge.
export function AdPills({ points }: { points: ChartPoint[] }) {
  const sorted = [...points].sort((a, b) => b.spend - a.spend);
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {sorted.map((p) => (
        <li
          key={p.id}
          className="flex max-w-full items-center gap-2 rounded-full border border-border bg-[#0b1426] py-1 pl-1 pr-3 text-xs"
          title={p.name}
        >
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-[#0b1426]"
            style={{ background: funnelColor(p.funnel) }}
          >
            {p.funnel}
          </span>
          <span className="max-w-[180px] truncate font-medium text-[#dbe5f3]">
            {p.name}
          </span>
          <span className="text-[#9fb0cb]">{fmtUSD(p.spend)}</span>
          <span className="text-[#7f8da6]">·</span>
          <span className="text-[#7f8da6]">{fmtNum(p.groupPct, 1)}%</span>
        </li>
      ))}
    </ul>
  );
}
