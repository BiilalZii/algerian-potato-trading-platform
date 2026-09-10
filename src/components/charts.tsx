"use client";

import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Cell,
} from "recharts";
import { useI18n } from "@/lib/i18n";

export interface PricePoint {
  day: string;
  close: number;
  volume: number;
  floor: number;
  ceiling: number;
  intervened: boolean;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PricePoint;
  return (
    <div className="rounded-xl bg-white/95 backdrop-blur ring-1 ring-black/10 shadow-lg px-3 py-2 text-xs">
      <div className="font-bold text-slate-700 mb-1">{label}</div>
      {payload
        .filter((x: any) => x.dataKey !== "volume")
        .map((x: any) => (
          <div key={x.dataKey} className="flex items-center gap-2">
            <span style={{ color: x.color || x.stroke }} className="font-bold">
              ●
            </span>
            <span className="text-slate-500">{x.name}:</span>
            <span className="font-bold tabular-nums">{x.value}</span>
          </div>
        ))}
      <div className="text-slate-400 mt-1">
        Volume: {p.volume.toLocaleString("en-US")} q
      </div>
      {p.intervened && (
        <div className="text-red-700 font-bold mt-0.5">⚑ State intervention</div>
      )}
    </div>
  );
}

export function PriceHistoryChart({
  data,
  height = 320,
  showBand = true,
}: {
  data: PricePoint[];
  height?: number;
  showBand?: boolean;
}) {
  const { t, lang } = useI18n();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#006233" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#006233" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={(d) => d.slice(5)}
          minTickGap={42}
          reversed={lang === "ar"}
        />
        <YAxis
          yAxisId="price"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          domain={["dataMin - 4", "dataMax + 4"]}
          width={42}
        />
        <YAxis yAxisId="vol" orientation="right" hide domain={[0, (d: number) => d * 4]} />
        <Tooltip content={<ChartTooltip />} />
        <Bar yAxisId="vol" dataKey="volume" fill="#cbd5e1" opacity={0.5} name={t("common.volume")} />
        <Area
          yAxisId="price"
          type="monotone"
          dataKey="close"
          stroke="#006233"
          strokeWidth={2.4}
          fill="url(#priceFill)"
          name={t("landing.refPrice")}
          dot={false}
        />
        {showBand && (
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="ceiling"
            stroke="#d21034"
            strokeWidth={1.4}
            strokeDasharray="6 4"
            dot={false}
            name={t("landing.ceiling")}
          />
        )}
        {showBand && (
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="floor"
            stroke="#0a8a4e"
            strokeWidth={1.4}
            strokeDasharray="6 4"
            dot={false}
            name={t("landing.floor")}
          />
        )}
        {data
          .filter((p) => p.intervened)
          .map((p) => (
            <ReferenceDot
              key={p.day}
              x={p.day}
              y={p.close}
              yAxisId="price"
              r={4}
              fill="#d21034"
              stroke="#fff"
              strokeWidth={1.5}
            />
          ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({
  data,
  color = "#006233",
  height = 200,
  format,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  color?: string;
  height?: number;
  format?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={44} />
        <Tooltip
          formatter={(v: any) => (format ? [format(Number(v)), ""] : [Number(v).toLocaleString("en-US"), ""])}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.highlight ? "#d21034" : color} opacity={d.highlight ? 0.85 : 1} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
