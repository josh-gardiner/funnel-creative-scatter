// Shared types for the Funnel Creative Scatter app.

export type FunnelLabel = "TOF" | "MOF" | "BOF";

/** Selectable look-back window, in days. */
export type WindowDays = 7 | 14 | 30;

export type TrendDir = "up" | "down" | "flat";

/**
 * Frequency + CPM trend vs. the previous equal-length window.
 * `exact` = true means both periods use live deduped reach (account level).
 * `exact` = false means the direction is derived from the consistent daily-sum
 * method (per-chart) — reliable for direction, not an exact delta.
 */
export interface Trend {
  freqDir: TrendDir;
  cpmDir: TrendDir;
  freqNow: number; // accurate value shown next to the arrow
  cpmNow: number;
  freqPrev: number;
  cpmPrev: number;
  exact: boolean;
}

/** Spend distribution across the funnel bands for one chart's ads. */
export interface FunnelSpend {
  tofPct: number;
  mofPct: number;
  bofPct: number;
  tofSpend: number;
  mofSpend: number;
  bofSpend: number;
  total: number;
}

/** A single ad, joined to its ad set + campaign. Reach/frequency/CPM are live. */
export interface AdPoint {
  id: string;
  name: string;
  status: string;
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;

  // Aggregated over the current window
  spend: number;
  impressions: number; // live windowed impressions
  reach: number; // live deduped reach over the window
  frequency: number; // live windowed frequency (impressions / unique reach)
  cpmUnique: number; // spend / live reach * 1000

  // Share of spend within each grouping level
  accountSpendPct: number;
  campaignSpendPct: number;
  adSetSpendPct: number;
}

export interface AdSetGroup {
  id: string;
  name: string;
  spend: number;
  ads: AdPoint[];
  freqAvg: number; // impression-weighted avg of accurate per-ad frequency
  cpmAvg: number;
  trend: Trend; // directional (daily-sum)
  funnelSpend: FunnelSpend;
}

export interface CampaignGroup {
  id: string;
  name: string;
  spend: number;
  ads: AdPoint[];
  adSets: AdSetGroup[];
  freqAvg: number;
  cpmAvg: number;
  trend: Trend; // directional (daily-sum)
  funnelSpend: FunnelSpend;
}

export interface AccountTotals {
  spend: number;
  activeAds: number; // ads with spend in the window
  campaigns: number;
  adSets: number;
  avgCpmUnique: number; // spend / live account reach * 1000
  avgFrequency: number; // live account deduped frequency
  trend: Trend; // exact (live reach both periods)
}

export interface ScatterData {
  account: { id: string; name: string };
  window: WindowDays;
  dateFrom: string; // current window
  dateTo: string;
  prevFrom: string; // previous equal-length window
  prevTo: string;
  generatedAt: string;
  totals: AccountTotals;
  funnelSpend: FunnelSpend; // account level
  ads: AdPoint[];
  campaigns: CampaignGroup[];
}

/** Which spend-share field a chart sizes/thresholds its dots by. */
export type SpendPctField =
  | "accountSpendPct"
  | "campaignSpendPct"
  | "adSetSpendPct";
