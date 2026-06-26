"use client";

import {
  CartesianGrid,
  Customized,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdPoint, SpendPctField } from "@/lib/types";
import {
  buildChartPoints,
  ChartPoint,
  fmtNum,
  fmtUSD,
  funnelColor,
} from "@/lib/viz";
import { AdPills } from "@/components/AdPills";

interface ScatterCardProps {
  title: string;
  subtitle?: string;
  ads: AdPoint[];
  spendPctField: SpendPctField;
  indented?: boolean;
}

function pad(min: number, max: number): [number, number] {
  if (min === max) {
    const d = Math.max(min * 0.1, 0.5);
    return [Math.max(0, min - d), max + d];
  }
  const margin = (max - min) * 0.12;
  return [Math.max(0, min - margin), max + margin];
}

// Fixed corner labels: TOF = low freq/low CPM (bottom-left),
// BOF = high freq/high CPM (top-right), MOF = the off-diagonal quadrants.
function QuadrantLabels(props: {
  xAxisMap?: Record<string, { x: number; width: number }>;
  yAxisMap?: Record<string, { y: number; height: number }>;
}) {
  const x = props.xAxisMap && Object.values(props.xAxisMap)[0];
  const y = props.yAxisMap && Object.values(props.yAxisMap)[0];
  if (!x || !y) return null;
  const left = x.x;
  const right = x.x + x.width;
  const top = y.y;
  const bottom = y.y + y.height;
  const style = { fontSize: 11, fontWeight: 700, opacity: 0.55 } as const;
  return (
    <g pointerEvents="none">
      <text x={left + 8} y={bottom - 8} fill={funnelColor("TOF")} style={style}>
        TOF
      </text>
      <text
        x={right - 8}
        y={top + 16}
        textAnchor="end"
        fill={funnelColor("BOF")}
        style={style}
      >
        BOF
      </text>
      <text
        x={right - 8}
        y={bottom - 8}
        textAnchor="end"
        fill={funnelColor("MOF")}
        style={style}
      >
        MOF
      </text>
    </g>
  );
}

function Dot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
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
  indented = false,
}: ScatterCardProps) {
  const { points, medianFreq, medianCpm } = buildChartPoints(
    ads,
    spendPctField
  );

  const xs = points.map((p) => p.frequency);
  const ys = points.map((p) => p.cpmUnique);
  const xDomain = points.length ? pad(Math.min(...xs), Math.max(...xs)) : [0, 2];
  const yDomain = points.length
    ? pad(Math.min(...ys), Math.max(...ys))
    : [0, 50];

  return (
    <section
      className={[
        "rounded-xl border border-border bg-card p-4",
        indented ? "ml-3 border-l-2 border-l-tof/40 sm:ml-6" : "",
      ].join(" ")}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
        {subtitle && (
          <span className="shrink-0 text-xs text-[#7f8da6]">{subtitle}</span>
        )}
      </div>

      {points.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-[#7f8da6]">
          No spending ads in this group for the last 14 days.
        </div>
      ) : (
        <>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 12, right: 18, bottom: 28, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="frequency"
                  name="Frequency"
                  domain={xDomain}
                  tick={{ fill: "#7f8da6", fontSize: 11 }}
                  tickFormatter={(v: number) => fmtNum(v, 1)}
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
                <ReferenceLine
                  x={medianFreq}
                  stroke="#3a4a66"
                  strokeDasharray="5 5"
                />
                <ReferenceLine
                  y={medianCpm}
                  stroke="#3a4a66"
                  strokeDasharray="5 5"
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#3a4a66", strokeDasharray: "3 3" }}
                />
                <Scatter data={points} shape={<Dot />} isAnimationActive={false} />
                <Customized component={QuadrantLabels} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <AdPills points={points} />
        </>
      )}
    </section>
  );
}
