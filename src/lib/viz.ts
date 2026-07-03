// Pure visual + classification helpers (safe on both server and client).

import type {
  AdPoint,
  FunnelLabel,
  FunnelSpend,
  SpendPctField,
  TrendDir,
} from "@/lib/types";

// Funnel bands by per-creative frequency: TOF 1–2, MOF 2–5, BOF 5+.
export const MOF_MIN = 2;
export const BOF_MIN = 5;

// Fixed frequency X-axis range. BOF (5+) ads are plotted inside a "5+" zone
// so they don't pile up on the axis edge.
export const X_MIN = 1;
export const X_MAX = 5;
export const X_PLOT_MAX = 5.5; // right edge of the plotted domain
const BOF_PLOT_X = 5.25; // where 5+ ads sit (inside the 5–5.5 red zone)

const FUNNEL_COLORS: Record<FunnelLabel, string> = {
  TOF: "#2ecc71", // green
  MOF: "#f5c518", // yellow
  BOF: "#ff4060", // red
};

export function funnelColor(label: FunnelLabel): string {
  return FUNNEL_COLORS[label];
}

/** Funnel stage from per-creative frequency. TOF <2, MOF 2–5, BOF ≥5. */
export function funnelLabel(frequency: number): FunnelLabel {
  if (frequency < MOF_MIN) return "TOF";
  if (frequency < BOF_MIN) return "MOF";
  return "BOF";
}

/** Spend split across funnel bands for a set of ads. */
export function funnelSpend(ads: AdPoint[]): FunnelSpend {
  let tofSpend = 0;
  let mofSpend = 0;
  let bofSpend = 0;
  for (const a of ads) {
    const stage = funnelLabel(a.frequency);
    if (stage === "TOF") tofSpend += a.spend;
    else if (stage === "MOF") mofSpend += a.spend;
    else bofSpend += a.spend;
  }
  const total = tofSpend + mofSpend + bofSpend;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return {
    tofSpend,
    mofSpend,
    bofSpend,
    total,
    tofPct: pct(tofSpend),
    mofPct: pct(mofSpend),
    bofPct: pct(bofSpend),
  };
}

/** Direction of change vs. the previous period, with a flat deadband. */
export function trendDir(now: number, prev: number, deadband = 0.03): TrendDir {
  if (!Number.isFinite(now) || !Number.isFinite(prev)) return "flat";
  if (prev <= 0) return now > 0 ? "up" : "flat";
  const change = (now - prev) / prev;
  if (Math.abs(change) < deadband) return "flat";
  return change > 0 ? "up" : "down";
}

/** A point decorated with everything the chart needs to render it. */
export interface ChartPoint extends AdPoint {
  groupPct: number; // spend% within the active grouping level
  funnel: FunnelLabel;
  color: string; // funnel-band colour
  radius: number; // dot radius scaled by absolute spend
  belowThreshold: boolean; // < SMALL_SPEND_PCT of the group → hollow / hideable
  xClamped: number; // frequency clamped into [X_MIN, X_MAX] for plotting
}

// Ads contributing less than this share of their group's spend are treated as
// "not meaningfully contributing": rendered hollow, and hidden by default.
export const SMALL_SPEND_PCT = 1;

const MIN_R = 3;
const MAX_R = 26;
const SMALL_MAX_R = 6; // cap so tiny-spend dots stay visibly small

/** Decorate ads for a single chart: funnel band, colour, spend-scaled size. */
export function buildChartPoints(
  ads: AdPoint[],
  spendPctField: SpendPctField
): ChartPoint[] {
  const maxSpend = Math.max(0, ...ads.map((a) => a.spend));

  return ads.map((a) => {
    const groupPct = a[spendPctField];
    const belowThreshold = groupPct < SMALL_SPEND_PCT;
    const spendRatio = maxSpend > 0 ? a.spend / maxSpend : 0;
    const baseR = MIN_R + (MAX_R - MIN_R) * Math.sqrt(spendRatio);
    const funnel = funnelLabel(a.frequency);
    return {
      ...a,
      groupPct,
      belowThreshold,
      funnel,
      color: funnelColor(funnel),
      radius: belowThreshold ? Math.min(baseR, SMALL_MAX_R) : baseR,
      xClamped:
        a.frequency >= BOF_MIN
          ? BOF_PLOT_X
          : Math.min(Math.max(a.frequency, X_MIN), X_MAX),
    };
  });
}

export function fmtUSD(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
