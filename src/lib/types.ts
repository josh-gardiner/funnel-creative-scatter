// Shared types for the Funnel Creative Scatter app.

export type FunnelLabel = "TOF" | "MOF" | "BOF";

/** A single ad, fully aggregated and joined to its ad set + campaign. */
export interface AdPoint {
  id: string;
  name: string;
  status: string;
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;

  // Aggregated over the date window
  spend: number;
  impressions: number;
  reach: number;
  frequency: number; // impressions / reach
  cpmUnique: number; // (spend / reach) * 1000

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
}

export interface CampaignGroup {
  id: string;
  name: string;
  spend: number;
  ads: AdPoint[];
  adSets: AdSetGroup[];
}

export interface AccountTotals {
  spend: number;
  activeAds: number; // ads with spend in the window
  campaigns: number;
  adSets: number;
  avgCpmUnique: number; // spend-weighted (totalSpend / totalReach * 1000)
  avgFrequency: number; // totalImpressions / totalReach
}

export interface ScatterData {
  account: { id: string; name: string };
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  totals: AccountTotals;
  ads: AdPoint[];
  campaigns: CampaignGroup[];
}

/** Which spend-share field a chart colours its dots by. */
export type SpendPctField =
  | "accountSpendPct"
  | "campaignSpendPct"
  | "adSetSpendPct";
