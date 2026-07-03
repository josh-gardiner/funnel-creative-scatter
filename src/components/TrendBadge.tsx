import type { Trend, TrendDir } from "@/lib/types";
import { fmtNum, fmtUSD } from "@/lib/viz";

function arrow(dir: TrendDir): string {
  return dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
}

// Frequency + CPM current value with a direction arrow vs. the previous period.
// Arrows are neutral (direction only, no good/bad implied).
export function TrendBadge({
  trend,
  window,
}: {
  trend: Trend;
  window: number;
}) {
  const tip = trend.exact
    ? `vs previous ${window}d — freq ${fmtNum(trend.freqPrev, 2)}×, CPM ${fmtUSD(
        trend.cpmPrev,
        2
      )}`
    : `direction vs previous ${window}d (ad-level average)`;

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9fb0cb]"
      title={tip}
    >
      <span className="flex items-center gap-1">
        <span className="text-[#7f8da6]">Freq</span>
        <span className="text-white">{fmtNum(trend.freqNow, 2)}×</span>
        <span aria-hidden>{arrow(trend.freqDir)}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-[#7f8da6]">CPM</span>
        <span className="text-white">{fmtUSD(trend.cpmNow, 2)}</span>
        <span aria-hidden>{arrow(trend.cpmDir)}</span>
      </span>
    </div>
  );
}
