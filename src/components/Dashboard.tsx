"use client";

import { useState } from "react";
import type { ScatterData } from "@/lib/types";
import { ScatterCard } from "@/components/ScatterCard";
import { StatsBar } from "@/components/StatsBar";
import { fmtUSD } from "@/lib/viz";

export function Dashboard({ data }: { data: ScatterData }) {
  const { account, totals, ads, campaigns } = data;
  const [hideSmall, setHideSmall] = useState(false);

  return (
    <div className="space-y-8">
      <StatsBar totals={totals} />

      <div className="flex items-center justify-end">
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

      {/* Level 1 — Account */}
      <div className="space-y-4">
        <SectionHeading
          kicker="Account"
          title={account.name}
          note={`${ads.length} spending ads · colour = % of total account spend`}
        />
        <ScatterCard
          title="All ads"
          subtitle={fmtUSD(totals.spend)}
          ads={ads}
          spendPctField="accountSpendPct"
          hideSmall={hideSmall}
        />
      </div>

      {/* Level 2 + 3 — Campaign → Ad set */}
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="space-y-4">
          <SectionHeading
            kicker="Campaign"
            title={campaign.name}
            note={`${campaign.ads.length} ads · ${campaign.adSets.length} ad sets · colour = % of campaign spend`}
          />
          <ScatterCard
            title={campaign.name}
            subtitle={fmtUSD(campaign.spend)}
            ads={campaign.ads}
            spendPctField="campaignSpendPct"
            hideSmall={hideSmall}
          />

          <div className="space-y-4">
            {campaign.adSets.map((adSet) => (
              <ScatterCard
                key={adSet.id}
                title={adSet.name}
                subtitle={`${fmtUSD(adSet.spend)} · colour = % of ad set spend`}
                ads={adSet.ads}
                spendPctField="adSetSpendPct"
                indented
                hideSmall={hideSmall}
              />
            ))}
          </div>
        </div>
      ))}

      <p className="pt-2 text-xs text-[#5f6d85]">
        Reach is summed from daily-deduplicated values (approximate across
        multi-day windows). Data window: {data.dateFrom} → {data.dateTo}.
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
    <div className="border-l-2 border-tof/60 pl-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-tof">
        {kicker}
      </div>
      <div className="text-base font-semibold text-white">{title}</div>
      <div className="text-xs text-[#7f8da6]">{note}</div>
    </div>
  );
}
