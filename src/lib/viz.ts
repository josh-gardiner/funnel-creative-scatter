// Pure visual helpers shared by chart components (safe on the client).

import type { AdPoint, FunnelLabel, SpendPctField } from "@/lib/types";

// Spend gradient stops from the brief: blue → teal → amber → red.
const GRADIENT: Array<[number, [number, number, number]]> = [
  [0.0, [74, 144, 255]], // #4a90ff
  [0.34, [40, 217, 160]], // #28d9a0
  [0.67, [245, 168, 32]], // #f5a820
  [1.0, [255, 64, 96]], // #ff4060
];

const FUNNEL_COLORS: Record<FunnelLabel, string> = {
  TOF: "#4a90ff",
  MOF: "#f5a820",
  BOF: "#ff4060",
};

export function funnelColor(label: FunnelLabel): string {
  return FUNNEL_COLORS[label];
}

/** Interpolate the spend gradient at t ∈ [0, 1]. */
export function spendColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 0; i < GRADIENT.length - 1; i++) {
    const [t0, c0] = GRADIENT[i];
    const [t1, c1] = GRADIENT[i + 1];
    if (x >= t0 && x <= t1) {
      const f = t1 === t0 ? 0 : (x - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return "rgb(255, 64, 96)";
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Funnel stage relative to this chart's own medians.
 *  TOF = below-median frequency AND below-median CPM
 *  BOF = above-median frequency AND above-median CPM
 *  MOF = everything else
 */
export function funnelLabel(
  frequency: number,
  cpmUnique: number,
  medianFreq: number,
  medianCpm: number
): FunnelLabel {
  if (frequency <= medianFreq && cpmUnique <= medianCpm) return "TOF";
  if (frequency > medianFreq && cpmUnique > medianCpm) return "BOF";
  return "MOF";
}

/** A point decorated with everything the chart needs to render it. */
export interface ChartPoint extends AdPoint {
  groupPct: number; // the spend% for the active grouping level
  funnel: FunnelLabel;
  color: string; // spend-share gradient colour
  radius: number; // dot radius scaled by absolute spend
}

const MIN_R = 5;
const MAX_R = 26;

/**
 * Decorate ads for a single chart: compute per-chart medians, funnel stage,
 * spend-share colour (relative to the chart's max share), and dot size
 * (relative to the chart's max spend).
 */
export function buildChartPoints(
  ads: AdPoint[],
  spendPctField: SpendPctField
): {
  points: ChartPoint[];
  medianFreq: number;
  medianCpm: number;
} {
  const medianFreq = median(ads.map((a) => a.frequency));
  const medianCpm = median(ads.map((a) => a.cpmUnique));
  const maxPct = Math.max(0, ...ads.map((a) => a[spendPctField]));
  const maxSpend = Math.max(0, ...ads.map((a) => a.spend));

  const points = ads.map((a) => {
    const groupPct = a[spendPctField];
    const t = maxPct > 0 ? groupPct / maxPct : 0;
    const spendRatio = maxSpend > 0 ? a.spend / maxSpend : 0;
    return {
      ...a,
      groupPct,
      funnel: funnelLabel(a.frequency, a.cpmUnique, medianFreq, medianCpm),
      color: spendColor(t),
      // sqrt scale so dot *area* tracks spend
      radius: MIN_R + (MAX_R - MIN_R) * Math.sqrt(spendRatio),
    };
  });

  return { points, medianFreq, medianCpm };
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
