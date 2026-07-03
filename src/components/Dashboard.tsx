"use client";

import { useState } from "react";
import type { ScatterData } from "@/lib/types";
import { ScatterCard } from "@/components/ScatterCard";
import { StatsBar } from "@/components/StatsBar";
import { WindowToggle } from "@/components/WindowToggle";
import { fmtUSD } from "@/lib/viz";

export function Dashboard({ data }: { data: ScatterData }) {
  const { account, totals, ads, campaigns, window } = data;
  const [hideSmall, setHideSmall] = useState(true);
  // Ad-set charts are collapsed by default so a large account renders ~7 charts
  // instead of ~17 — mounting all of them at once is what freezes the tab.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleCampaign = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WindowToggle active={window} />
        <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-[#9fb0cb]">
          <input
            type="checkbox"
            checked={hideSmall}
            onChange={(e) => setHideSmall(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#6c63ff]"
          />
          Hide ads under 1% of group spend
        </label>
      </div>

      <StatsBar totals={totals} window={window} />

      {/* Level 1 — Account */}
      <div className="space-y-4">
        <SectionHeading
          kicker="Account"
          title={account.name}
          note={`${ads.length} spending ads · colour = funnel stage · size = spend`}
        />
        <ScatterCard
          title="All ads"
          subtitle={fmtUSD(totals.spend)}
          ads={ads}
          spendPctField="accountSpendPct"
          window={window}
          trend={totals.trend}
          funnelSpend={data.funnelSpend}
          hideSmall={hideSmall}
        />
      </div>

      {/* Level 2 + 3 — Campaign → Ad set */}
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="space-y-4">
          <SectionHeading
            kicker="Campaign"
            title={campaign.name}
            note={`${campaign.ads.length} ads · ${campaign.adSets.length} ad sets`}
          />
          <ScatterCard
            title={campaign.name}
            subtitle={fmtUSD(campaign.spend)}
            ads={campaign.ads}
            spendPctField="campaignSpendPct"
            window={window}
            trend={campaign.trend}
            funnelSpend={campaign.funnelSpend}
            hideSmall={hideSmall}
          />

          {campaign.adSets.length > 0 && (
            <div className="ml-3 sm:ml-6">
              <button
                type="button"
                onClick={() => toggleCampaign(campaign.id)}
                aria-expanded={expanded.has(campaign.id)}
                className="text-xs font-medium text-[#8fa0bd] hover:text-white"
              >
                {expanded.has(campaign.id) ? "▾ Hide" : "▸ Show"}{" "}
                {campaign.adSets.length} ad set
                {campaign.adSets.length === 1 ? "" : "s"}
              </button>

              {expanded.has(campaign.id) && (
                <div className="mt-4 space-y-4">
                  {campaign.adSets.map((adSet) => (
                    <ScatterCard
                      key={adSet.id}
                      title={adSet.name}
                      subtitle={fmtUSD(adSet.spend)}
                      ads={adSet.ads}
                      spendPctField="adSetSpendPct"
                      window={window}
                      trend={adSet.trend}
                      funnelSpend={adSet.funnelSpend}
                      indented
                      hideSmall={hideSmall}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <p className="pt-2 text-xs text-[#5f6d85]">
        Frequency & CPM-unique use live deduplicated reach (cached ~24h). Spend,
        impressions & structure are from stored data. Funnel bands: TOF 1–2, MOF
        2–5, BOF 5+. Trends compare to the previous {window}-day window (account
        exact; per-chart directional). Window: {data.dateFrom} → {data.dateTo}.
      </p>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note: string;
}) {
  return (
    <div className="border-l-2 border-white/25 pl-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9fb0cb]">
        {kicker}
      </div>
      <div className="text-base font-semibold text-white">{title}</div>
      <div className="text-xs text-[#7f8da6]">{note}</div>
    </div>
  );
}
