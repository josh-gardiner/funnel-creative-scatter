import type { AccountTotals, TrendDir } from "@/lib/types";
import { fmtNum, fmtUSD } from "@/lib/viz";

function arrow(dir: TrendDir): string {
  return dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
}

function Stat({
  label,
  value,
  trend,
  trendTitle,
}: {
  label: string;
  value: string;
  trend?: TrendDir;
  trendTitle?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-[#7f8da6]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold text-white">{value}</span>
        {trend && (
          <span className="text-sm text-[#9fb0cb]" title={trendTitle} aria-hidden>
            {arrow(trend)}
          </span>
        )}
      </div>
    </div>
  );
}

export function StatsBar({
  totals,
  window,
}: {
  totals: AccountTotals;
  window: number;
}) {
  const t = totals.trend;
  const tip = `vs previous ${window}d — freq ${fmtNum(
    t.freqPrev,
    2
  )}×, CPM ${fmtUSD(t.cpmPrev, 2)}`;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Total Spend" value={fmtUSD(totals.spend)} />
      <Stat label="Active Ads" value={fmtNum(totals.activeAds)} />
      <Stat label="Campaigns" value={fmtNum(totals.campaigns)} />
      <Stat label="Ad Sets" value={fmtNum(totals.adSets)} />
      <Stat
        label="Avg CPM Unique"
        value={fmtUSD(totals.avgCpmUnique, 2)}
        trend={t.cpmDir}
        trendTitle={tip}
      />
      <Stat
        label="Avg Frequency"
        value={`${fmtNum(totals.avgFrequency, 2)}×`}
        trend={t.freqDir}
        trendTitle={tip}
      />
    </div>
  );
}
