// Server-side data pipeline: fetch → aggregate → join → compute spend shares.

import {
  fetchAdMetrics,
  fetchAds,
  fetchAdSets,
  fetchCampaigns,
} from "@/lib/pdh";
import type {
  AccountTotals,
  AdPoint,
  AdSetGroup,
  CampaignGroup,
  ScatterData,
} from "@/lib/types";

const WINDOW_DAYS = 14;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns the dynamic [today - 14d, today] window in YYYY-MM-DD. */
export function dateWindow(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - WINDOW_DAYS);
  return { from: toISODate(from), to: toISODate(to) };
}

function num(v: string | number | undefined): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

interface AggMetric {
  spend: number;
  impressions: number;
  reach: number;
}

/**
 * Build the full scatter dataset for one account over the dynamic 14-day window.
 *
 * Reach is summed across daily rows (daily-deduplicated). This slightly
 * overcounts multi-day unique users — acceptable for relative funnel analysis.
 */
export async function buildScatterData(
  accountId: string,
  accountName: string,
  now: Date = new Date()
): Promise<ScatterData> {
  const { from, to } = dateWindow(now);

  const [ads, adSets, campaigns, metrics] = await Promise.all([
    fetchAds(accountId),
    fetchAdSets(accountId),
    fetchCampaigns(accountId),
    fetchAdMetrics(accountId, from, to),
  ]);

  // Aggregate daily metric rows per ad.
  const agg = new Map<string, AggMetric>();
  for (const row of metrics) {
    const cur = agg.get(row.entityId) ?? {
      spend: 0,
      impressions: 0,
      reach: 0,
    };
    cur.spend += num(row.spend);
    cur.impressions += num(row.impressions);
    cur.reach += num(row.platformMetrics?.reach);
    agg.set(row.entityId, cur);
  }

  const adSetById = new Map(adSets.map((s) => [s.id, s]));
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  // Build one point per ad that actually spent (and has reach to divide by).
  const points: AdPoint[] = [];
  for (const ad of ads) {
    const m = agg.get(ad.id);
    if (!m || m.spend <= 0 || m.reach <= 0) continue;

    const adSet = adSetById.get(ad.adSetId);
    const campaign = adSet ? campaignById.get(adSet.campaignId) : undefined;

    points.push({
      id: ad.id,
      name: ad.name,
      status: ad.status,
      adSetId: ad.adSetId,
      adSetName: adSet?.name ?? "Unknown ad set",
      campaignId: adSet?.campaignId ?? "unknown-campaign",
      campaignName: campaign?.name ?? "Unknown campaign",
      spend: m.spend,
      impressions: m.impressions,
      reach: m.reach,
      frequency: m.impressions / m.reach,
      cpmUnique: (m.spend / m.reach) * 1000,
      accountSpendPct: 0,
      campaignSpendPct: 0,
      adSetSpendPct: 0,
    });
  }

  // Group-level spend totals for share computation.
  const accountSpend = points.reduce((s, p) => s + p.spend, 0);
  const campaignSpend = new Map<string, number>();
  const adSetSpend = new Map<string, number>();
  for (const p of points) {
    campaignSpend.set(
      p.campaignId,
      (campaignSpend.get(p.campaignId) ?? 0) + p.spend
    );
    adSetSpend.set(p.adSetId, (adSetSpend.get(p.adSetId) ?? 0) + p.spend);
  }

  const pct = (part: number, whole: number) =>
    whole > 0 ? (part / whole) * 100 : 0;

  for (const p of points) {
    p.accountSpendPct = pct(p.spend, accountSpend);
    p.campaignSpendPct = pct(p.spend, campaignSpend.get(p.campaignId) ?? 0);
    p.adSetSpendPct = pct(p.spend, adSetSpend.get(p.adSetId) ?? 0);
  }

  // Build campaign → ad set hierarchy.
  const campaignMap = new Map<
    string,
    CampaignGroup & { adSetMap: Map<string, AdSetGroup> }
  >();
  for (const p of points) {
    let c = campaignMap.get(p.campaignId);
    if (!c) {
      c = {
        id: p.campaignId,
        name: p.campaignName,
        spend: 0,
        ads: [],
        adSets: [],
        adSetMap: new Map(),
      };
      campaignMap.set(p.campaignId, c);
    }
    c.ads.push(p);
    c.spend += p.spend;

    let s = c.adSetMap.get(p.adSetId);
    if (!s) {
      s = { id: p.adSetId, name: p.adSetName, spend: 0, ads: [] };
      c.adSetMap.set(p.adSetId, s);
    }
    s.ads.push(p);
    s.spend += p.spend;
  }

  const bySpendDesc = <T extends { spend: number }>(a: T, b: T) =>
    b.spend - a.spend;

  const campaignGroups: CampaignGroup[] = [...campaignMap.values()]
    .map(({ adSetMap, ...rest }) => ({
      ...rest,
      adSets: [...adSetMap.values()].sort(bySpendDesc),
    }))
    .sort(bySpendDesc);

  // Spend-weighted account aggregates.
  const totalReach = points.reduce((s, p) => s + p.reach, 0);
  const totalImpressions = points.reduce((s, p) => s + p.impressions, 0);

  const totals: AccountTotals = {
    spend: accountSpend,
    activeAds: points.length,
    campaigns: campaignGroups.length,
    adSets: adSetSpend.size,
    avgCpmUnique: totalReach > 0 ? (accountSpend / totalReach) * 1000 : 0,
    avgFrequency: totalReach > 0 ? totalImpressions / totalReach : 0,
  };

  return {
    account: { id: accountId, name: accountName },
    dateFrom: from,
    dateTo: to,
    generatedAt: now.toISOString(),
    totals,
    ads: [...points].sort(bySpendDesc),
    campaigns: campaignGroups,
  };
}
