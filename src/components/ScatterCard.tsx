"use client";

import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdPoint, FunnelSpend, SpendPctField, Trend } from "@/lib/types";
import {
  buildChartPoints,
  ChartPoint,
  fmtNum,
  fmtUSD,
  funnelColor,
  X_MIN,
  X_PLOT_MAX,
} from "@/lib/viz";
import { AdPills } from "@/components/AdPills";
import { TrendBadge } from "@/components/TrendBadge";
import { FunnelSpendBar } from "@/components/FunnelSpendBar";

interface ScatterCardProps {
  title: string;
  subtitle?: string;
  ads: AdPoint[];
  spendPctField: SpendPctField;
  window: number;
  trend?: Trend;
  funnelSpend?: FunnelSpend;
  indented?: boolean;
  hideSmall?: boolean;
}

function pad(min: number, max: number): [number, number] {
  if (min === max) {
    const d = Math.max(min * 0.1, 0.5);
    return [Math.max(0, min - d), max + d];
  }
  const margin = (max - min) * 0.12;
  return [Math.max(0, min - margin), max + margin];
}

function Dot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  // Sub-1% ads render hollow (outline only) to signal they aren't meaningful.
  if (payload.belowThreshold) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={payload.radius}
        fill="none"
        stroke={payload.color}
        strokeWidth={1.75}
        strokeOpacity={0.8}
      />
    );
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.radius}
      fill={payload.color}
      fillOpacity={0.82}
      stroke="#0b1426"
      strokeWidth={1.5}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="max-w-[260px] rounded-lg border border-border bg-[#0b1426] px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: funnelColor(p.funnel) }}
        />
        <span className="font-semibold text-white">{p.funnel}</span>
      </div>
      <div className="mb-2 font-medium text-[#dbe5f3] line-clamp-2">
        {p.name}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[#9fb0cb]">
        <dt>Spend</dt>
        <dd className="text-right text-white">{fmtUSD(p.spend, 2)}</dd>
        <dt>% of group</dt>
        <dd className="text-right text-white">{fmtNum(p.groupPct, 1)}%</dd>
        <dt>Reach</dt>
        <dd className="text-right text-white">{fmtNum(p.reach)}</dd>
        <dt>Frequency</dt>
        <dd className="text-right text-white">{fmtNum(p.frequency, 2)}×</dd>
        <dt>CPM unique</dt>
        <dd className="text-right text-white">{fmtUSD(p.cpmUnique, 2)}</dd>
      </dl>
    </div>
  );
}

export function ScatterCard({
  title,
  subtitle,
  ads,
  spendPctField,
  window,
  trend,
  funnelSpend,
  indented = false,
  hideSmall = false,
}: ScatterCardProps) {
  const points = buildChartPoints(ads, spendPctField);
  const visible = hideSmall ? points.filter((p) => !p.belowThreshold) : points;
  const hiddenCount = points.length - visible.length;

  const ys = visible.map((p) => p.cpmUnique);
  const yDomain = visible.length
    ? pad(Math.min(...ys), Math.max(...ys))
    : [0, 50];

  return (
    <section
      className={[
        "rounded-xl border border-border bg-card p-4",
        indented ? "ml-3 border-l-2 border-l-white/15 sm:ml-6" : "",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
        {subtitle && (
          <span className="shrink-0 text-xs text-[#7f8da6]">{subtitle}</span>
        )}
        {trend && (
          <div className="w-full sm:w-auto">
            <TrendBadge trend={trend} window={window} />
          </div>
        )}
      </div>

      {funnelSpend && <FunnelSpendBar funnel={funnelSpend} />}

      {points.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-[#7f8da6]">
          No spending ads in this group for the last {window} days.
        </div>
      ) : visible.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-center text-sm text-[#7f8da6]">
          All {points.length} ads here are under 1% of group spend — hidden.
        </div>
      ) : (
        <>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 18, bottom: 28, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                {/* Funnel band shading */}
                <ReferenceArea
                  x1={X_MIN}
                  x2={2}
                  fill={funnelColor("TOF")}
                  fillOpacity={0.06}
                  label={{
                    value: "TOF",
                    position: "insideTopLeft",
                    fill: funnelColor("TOF"),
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <ReferenceArea
                  x1={2}
                  x2={5}
                  fill={funnelColor("MOF")}
                  fillOpacity={0.06}
                  label={{
                    value: "MOF",
                    position: "insideTop",
                    fill: funnelColor("MOF"),
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <ReferenceArea
                  x1={5}
                  x2={X_PLOT_MAX}
                  fill={funnelColor("BOF")}
                  fillOpacity={0.08}
                  label={{
                    value: "5+",
                    position: "insideTopRight",
                    fill: funnelColor("BOF"),
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <ReferenceLine x={2} stroke="#3a4a66" strokeDasharray="4 4" />
                <ReferenceLine x={5} stroke="#3a4a66" strokeDasharray="4 4" />
                <XAxis
                  type="number"
                  dataKey="xClamped"
                  name="Frequency"
                  domain={[X_MIN, X_PLOT_MAX]}
                  ticks={[1, 2, 3, 4, 5]}
                  allowDataOverflow
                  tick={{ fill: "#7f8da6", fontSize: 11 }}
                  tickFormatter={(v: number) => (v >= 5 ? "5+" : String(v))}
                  label={{
                    value: "Frequency",
                    position: "insideBottom",
                    offset: -16,
                    fill: "#7f8da6",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="cpmUnique"
                  name="CPM Unique"
                  domain={yDomain}
                  tick={{ fill: "#7f8da6", fontSize: 11 }}
                  tickFormatter={(v: number) => `$${fmtNum(v)}`}
                  width={52}
                  label={{
                    value: "CPM Unique ($)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#7f8da6",
                    fontSize: 11,
                    style: { textAnchor: "middle" },
                  }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#3a4a66", strokeDasharray: "3 3" }}
                />
                <Scatter
                  data={visible}
                  shape={<Dot />}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <AdPills points={visible} />
          {hiddenCount > 0 && (
            <p className="mt-2 text-xs text-[#5f6d85]">
              {hiddenCount} ad{hiddenCount === 1 ? "" : "s"} under 1% of group
              spend hidden.
            </p>
          )}
        </>
      )}
    </section>
  );
}
