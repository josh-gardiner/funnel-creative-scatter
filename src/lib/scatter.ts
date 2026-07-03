// Server-side data pipeline: fetch → aggregate → join → live reach → trends.

import { unstable_cache } from "next/cache";
import {
  fetchAdMetrics,
  fetchAds,
  fetchAdSets,
  fetchCampaigns,
  fetchReach,
  type PdhMetricRow,
} from "@/lib/pdh";
import type {
  AccountTotals,
  AdPoint,
  CampaignGroup,
  ScatterData,
  Trend,
  WindowDays,
} from "@/lib/types";
import { funnelSpend, trendDir } from "@/lib/viz";

const CACHE_TTL = 86400; // 24h — live reach barely moves within a day
const REACH_CONCURRENCY = 8;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Current [today-window, today] and the preceding equal-length window. */
export function resolveWindows(window: WindowDays, now: Date = new Date()) {
  const curTo = toISODate(now);
  const curFrom = toISODate(shiftDays(now, -window));
  const prevTo = curFrom;
  const prevFrom = toISODate(shiftDays(now, -2 * window));
  return { curFrom, curTo, prevFrom, prevTo };
}

function num(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

interface DailyAgg {
  spend: number;
  impressions: number;
  reachSum: number; // daily-summed reach — trends only, never displayed
}

function aggregateDaily(rows: PdhMetricRow[]): Map<string, DailyAgg> {
  const m = new Map<string, DailyAgg>();
  for (const r of rows) {
    const cur = m.get(r.entityId) ?? { spend: 0, impressions: 0, reachSum: 0 };
    cur.spend += num(r.spend);
    cur.impressions += num(r.impressions);
    cur.reachSum += num(r.platformMetrics?.reach);
    m.set(r.entityId, cur);
  }
  return m;
}

/** Run `fn` over items with bounded concurrency (preserves order). */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return out;
}

function weightedAvg(ads: AdPoint[], sel: (a: AdPoint) => number): number {
  let n = 0;
  let d = 0;
  for (const a of ads) {
    n += sel(a) * a.impressions;
    d += a.impressions;
  }
  return d > 0 ? n / d : 0;
}

/**
 * Per-chart trend: direction from the consistent daily-sum method across both
 * periods (reliable for up/down); displayed values are accurate ad-level averages.
 */
function groupTrend(
  ads: AdPoint[],
  curAgg: Map<string, DailyAgg>,
  prevAgg: Map<string, DailyAgg>
): Trend {
  let impCur = 0,
    reachCur = 0,
    spendCur = 0,
    impPrev = 0,
    reachPrev = 0,
    spendPrev = 0;
  for (const a of ads) {
    const c = curAgg.get(a.id);
    const p = prevAgg.get(a.id);
    if (c) {
      impCur += c.impressions;
      reachCur += c.reachSum;
      spendCur += c.spend;
    }
    if (p) {
      impPrev += p.impressions;
      reachPrev += p.reachSum;
      spendPrev += p.spend;
    }
  }
  const freqCurDS = reachCur > 0 ? impCur / reachCur : 0;
  const freqPrevDS = reachPrev > 0 ? impPrev / reachPrev : 0;
  const cpmCurDS = reachCur > 0 ? (spendCur / reachCur) * 1000 : 0;
  const cpmPrevDS = reachPrev > 0 ? (spendPrev / reachPrev) * 1000 : 0;
  return {
    freqDir: trendDir(freqCurDS, freqPrevDS),
    cpmDir: trendDir(cpmCurDS, cpmPrevDS),
    freqNow: weightedAvg(ads, (a) => a.frequency),
    cpmNow: weightedAvg(ads, (a) => a.cpmUnique),
    freqPrev: freqPrevDS,
    cpmPrev: cpmPrevDS,
    exact: false,
  };
}

async function compute(
  accountId: string,
  accountName: string,
  window: WindowDays,
  w: ReturnType<typeof resolveWindows>
): Promise<ScatterData> {
  const { curFrom, curTo, prevFrom, prevTo } = w;

  const [ads, adSets, campaigns, curMetrics, prevMetrics, acctCur, acctPrev] =
    await Promise.all([
      fetchAds(accountId),
      fetchAdSets(accountId),
      fetchCampaigns(accountId),
      fetchAdMetrics(accountId, curFrom, curTo),
      fetchAdMetrics(accountId, prevFrom, prevTo),
      fetchReach(accountId, "account", null, curFrom, curTo),
      fetchReach(accountId, "account", null, prevFrom, prevTo),
    ]);

  const curAgg = aggregateDaily(curMetrics);
  const prevAgg = aggregateDaily(prevMetrics);
  const adSetById = new Map(adSets.map((s) => [s.id, s]));
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  // Live deduped reach per spending ad (current window only).
  const spendingAds = ads.filter((a) => (curAgg.get(a.id)?.spend ?? 0) > 0);
  const reachResults = await mapLimit(spendingAds, REACH_CONCURRENCY, (ad) =>
    fetchReach(accountId, "ad", ad.id, curFrom, curTo)
      .then((reach) => ({ id: ad.id, reach }))
      .catch(() => ({ id: ad.id, reach: null }))
  );
  const reachById = new Map(reachResults.map((r) => [r.id, r.reach]));

  const points: AdPoint[] = [];
  for (const ad of spendingAds) {
    const agg = curAgg.get(ad.id)!;
    const live = reachById.get(ad.id);
    if (!live || live.reach <= 0) continue;
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
      spend: agg.spend,
      impressions: live.impressions || agg.impressions,
      reach: live.reach,
      frequency: live.frequency || live.impressions / live.reach,
      cpmUnique: (agg.spend / live.reach) * 1000,
      accountSpendPct: 0,
      campaignSpendPct: 0,
      adSetSpendPct: 0,
    });
  }

  // Spend shares within each grouping level.
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

  // Campaign → ad set hierarchy.
  const bySpendDesc = <T extends { spend: number }>(a: T, b: T) =>
    b.spend - a.spend;
  const campaignMap = new Map<
    string,
    {
      id: string;
      name: string;
      spend: number;
      ads: AdPoint[];
      adSetMap: Map<string, { id: string; name: string; spend: number; ads: AdPoint[] }>;
    }
  >();
  for (const p of points) {
    let c = campaignMap.get(p.campaignId);
    if (!c) {
      c = {
        id: p.campaignId,
        name: p.campaignName,
        spend: 0,
        ads: [],
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

  const campaignGroups: CampaignGroup[] = [...campaignMap.values()]
    .map((c) => ({
      id: c.id,
      name: c.name,
      spend: c.spend,
      ads: c.ads,
      freqAvg: weightedAvg(c.ads, (a) => a.frequency),
      cpmAvg: weightedAvg(c.ads, (a) => a.cpmUnique),
      trend: groupTrend(c.ads, curAgg, prevAgg),
      funnelSpend: funnelSpend(c.ads),
      adSets: [...c.adSetMap.values()].sort(bySpendDesc).map((s) => ({
        id: s.id,
        name: s.name,
        spend: s.spend,
        ads: s.ads,
        freqAvg: weightedAvg(s.ads, (a) => a.frequency),
        cpmAvg: weightedAvg(s.ads, (a) => a.cpmUnique),
        trend: groupTrend(s.ads, curAgg, prevAgg),
        funnelSpend: funnelSpend(s.ads),
      })),
    }))
    .sort(bySpendDesc);

  // Exact account trend from live reach (both periods).
  const acctSpendCur = [...curAgg.values()].reduce((s, a) => s + a.spend, 0);
  const acctSpendPrev = [...prevAgg.values()].reduce((s, a) => s + a.spend, 0);
  const avgCpmUnique =
    acctCur.reach > 0 ? (acctSpendCur / acctCur.reach) * 1000 : 0;
  const cpmPrev =
    acctPrev.reach > 0 ? (acctSpendPrev / acctPrev.reach) * 1000 : 0;
  const accountTrend: Trend = {
    freqDir: trendDir(acctCur.frequency, acctPrev.frequency),
    cpmDir: trendDir(avgCpmUnique, cpmPrev),
    freqNow: acctCur.frequency,
    cpmNow: avgCpmUnique,
    freqPrev: acctPrev.frequency,
    cpmPrev,
    exact: true,
  };

  const totals: AccountTotals = {
    spend: accountSpend,
    activeAds: points.length,
    campaigns: campaignGroups.length,
    adSets: adSetSpend.size,
    avgCpmUnique,
    avgFrequency: acctCur.frequency,
    trend: accountTrend,
  };

  return {
    account: { id: accountId, name: accountName },
    window,
    dateFrom: curFrom,
    dateTo: curTo,
    prevFrom,
    prevTo,
    generatedAt: new Date().toISOString(),
    totals,
    funnelSpend: funnelSpend(points),
    ads: [...points].sort(bySpendDesc),
    campaigns: campaignGroups,
  };
}

/**
 * Build the scatter dataset for one account + window. Wrapped in a 24h data
 * cache: only the first viewer per (account, window, day) pays the live-reach
 * cost; everyone else is served from cache.
 */
export async function buildScatterData(
  accountId: string,
  accountName: string,
  window: WindowDays = 14,
  now: Date = new Date()
): Promise<ScatterData> {
  const w = resolveWindows(window, now);
  const cached = unstable_cache(
    () => compute(accountId, accountName, window, w),
    ["scatter-data", accountId, String(window), w.curFrom, w.curTo],
    { revalidate: CACHE_TTL }
  );
  return cached();
}
