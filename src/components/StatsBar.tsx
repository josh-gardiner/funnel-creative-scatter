import type { AccountTotals } from "@/lib/types";
import { fmtNum, fmtUSD } from "@/lib/viz";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-[#7f8da6]">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function StatsBar({ totals }: { totals: AccountTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Total Spend" value={fmtUSD(totals.spend)} />
      <Stat label="Active Ads" value={fmtNum(totals.activeAds)} />
      <Stat label="Campaigns" value={fmtNum(totals.campaigns)} />
      <Stat label="Ad Sets" value={fmtNum(totals.adSets)} />
      <Stat label="Avg CPM Unique" value={fmtUSD(totals.avgCpmUnique, 2)} />
      <Stat label="Avg Frequency" value={`${fmtNum(totals.avgFrequency, 2)}×`} />
    </div>
  );
}
