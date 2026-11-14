"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { annualUnit, annualUnitEn, formatNumber, formatNumberEn, unitEn } from "@/lib/format";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TrendPayload } from "@/lib/types";

type Row = {
  x: number;
  monthly?: number;
  annual?: number;
  sen?: number;
  lower?: number;
  upper?: number;
  quality?: string;
  year?: number;
};

function buildRows(payload: TrendPayload, showMonthly: boolean): Row[] {
  const rows = new Map<number, Row>();
  if (showMonthly) {
    for (const p of payload.monthly) {
      const y = Number(p.date.slice(0, 4));
      const m = Number(p.date.slice(5, 7)) || 1;
      const x = y + (m - 1) / 12;
      rows.set(x, { ...(rows.get(x) ?? { x }), monthly: p.value });
    }
  }
  const { senSlope, intercept, slopeCi } = payload.stats;
  for (const p of payload.annual) {
    const x = p.year + 0.5;
    const sen = Number.isFinite(senSlope) ? intercept + senSlope * p.year : undefined;
    rows.set(x, {
      ...(rows.get(x) ?? { x }),
      x,
      annual: p.value,
      quality: p.quality,
      year: p.year,
      sen,
      lower: slopeCi ? intercept + slopeCi.lower * p.year : undefined,
      upper: slopeCi ? intercept + slopeCi.upper * p.year : undefined,
    });
  }
  return [...rows.values()].sort((a, b) => a.x - b.x);
}

function ChartTooltip({
  active,
  payload,
  unitAnnual,
  unitMonthly,
  color,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  unitAnnual: string;
  unitMonthly: string;
  color: string;
}) {
  const { locale } = useLocale();
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const value = row.annual ?? row.monthly;
  if (value === undefined) return null;
  const nf = locale === "en" ? formatNumberEn : formatNumber;  const isAnnual = row.annual !== undefined;
  const unit = isAnnual ? unitAnnual : unitMonthly;
  const year = row.year ?? Math.floor(row.x);
  const month = Math.round((row.x - Math.floor(row.x)) * 12) + 1;
  const label = isAnnual ? `${year}` : `${String(month).padStart(2, "0")}.${year}`;
  return (
    <div className="rounded-xl border border-white/10 bg-[#080e18]/95 px-3 py-2 shadow-panel backdrop-blur-xl">
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-lg font-semibold text-slate-50">{nf(value, 2)}</span>
        <span className="text-[10px] text-slate-400">{unit}</span>
      </div>
      {row.quality && row.quality !== "ok" && (
        <div className="mt-1 text-[10px] text-solar-300">
          {row.quality === "reconstructed"
            ? L(locale, "реконструкция", "reconstruction")
            : L(locale, "выброс / особая отметка", "outlier / special flag")}
        </div>
      )}
      {row.sen !== undefined && (
        <div className="mt-1 font-mono text-[10px]" style={{ color }}>
          {L(locale, "линия тренда", "trend line")}: {nf(row.sen, 2)} {unitAnnual}
        </div>
      )}
    </div>
  );
}

export function TrendChart({
  payload,
  height = 340,
  showMonthly = true,
  showBand = true,
  compact = false,
  yDomain,
  className,
}: {
  payload: TrendPayload;
  height?: number;
  showMonthly?: boolean;
  showBand?: boolean;
  compact?: boolean;
  yDomain?: [number, number];
  className?: string;
}) {
  const rows = useMemo(() => buildRows(payload, showMonthly), [payload, showMonthly]);
  const color = payload.variable.color;
  const { locale } = useLocale();
  const annualUnitLabel = locale === "en" ? annualUnitEn(payload.variable) : annualUnit(payload.variable);
  const monthlyUnitLabel = locale === "en" ? unitEn(payload.variable) : payload.variable.unit;
  const dualAxis = annualUnitLabel !== monthlyUnitLabel;
  const from = payload.period.from;
  const to = payload.period.to + 1;

  const axisDigits = useMemo(() => {
    const vals = payload.annual.map((p) => p.value);
    if (!vals.length) return 1;
    const range = Math.max(...vals) - Math.min(...vals);
    if (range < 1) return 2;
    if (range < 10) return 1;
    return 0;
  }, [payload.annual]);

  const ticks = useMemo(() => {
    const out: number[] = [];
    const step = to - from > 40 ? 10 : 5;
    for (let y = Math.ceil(from / step) * step; y <= payload.period.to; y += step) out.push(y + 0.5);
    return out;
  }, [from, to, payload.period.to]);

  const annualRows = useMemo(
    () =>
      payload.annual.map((p) => ({
        x: p.year + 0.5,
        annual: p.value,
        quality: p.quality,
      })),
    [payload.annual],
  );

  if (!payload.annual.length) {
    return (
      <div className={cn("flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-slate-500", className)}>
        Нет годовых значений для графика
      </div>
    );
  }

  const tickFormatter = (v: number | string) =>
    Number(v).toLocaleString(locale === "en" ? "en-US" : "ru-RU", {
      minimumFractionDigits: axisDigits,
      maximumFractionDigits: axisDigits,
    });

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: dualAxis ? 56 : compact ? 4 : 12, bottom: compact ? 0 : 4, left: compact ? 0 : 4 }}
        >
          <defs>
            <linearGradient id={`band-${payload.object.code}-${payload.variable.code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.34} />
              <stop offset="100%" stopColor={color} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[from, to]}
            ticks={ticks}
            tickFormatter={(v) => String(Math.floor(Number(v)))}
            axisLine={false}
            tickLine={false}
            tick={compact ? false : undefined}
            minTickGap={20}
          />
          <YAxis
            yAxisId="annual"
            domain={yDomain ?? ["auto", "auto"]}
            axisLine={false}
            tickLine={false}
            width={compact ? 0 : 54}
            tick={compact ? false : undefined}
            tickFormatter={tickFormatter}
            label={
              compact
                ? undefined
                : {
                    value: annualUnitLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: "#7d8da6",
                    fontSize: 10,
                    offset: 8,
                  }
            }
          />
          {dualAxis && (
            <YAxis
              yAxisId="monthly"
              orientation="right"
              axisLine={false}
              tickLine={false}
              width={compact ? 0 : 54}
              tick={compact ? false : undefined}
              tickFormatter={(v) => formatNumber(Number(v), 0)}
              label={
                compact
                  ? undefined
                  : {
                      value: monthlyUnitLabel,
                      angle: 90,
                      position: "insideRight",
                      fill: "#64748b",
                      fontSize: 10,
                      offset: 8,
                    }
              }
            />
          )}
          <Tooltip
            content={<ChartTooltip unitAnnual={annualUnitLabel} unitMonthly={monthlyUnitLabel} color={color} />}
            cursor={{ stroke: "rgba(255,255,255,0.15)", strokeDasharray: "3 3" }}
          />
          {showBand && payload.stats.slopeCi && (
            <>
              <Area
                yAxisId="annual"
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill={`url(#band-${payload.object.code}-${payload.variable.code})`}
                fillOpacity={1}
                isAnimationActive={false}
                connectNulls
              />
              <Area
                yAxisId="annual"
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="#070d17"
                fillOpacity={1}
                isAnimationActive={false}
                connectNulls
              />
            </>
          )}
          {showMonthly && (
            <Line
              yAxisId={dualAxis ? "monthly" : "annual"}
              type="monotone"
              dataKey="monthly"
              stroke={color}
              strokeWidth={1}
              strokeOpacity={0.32}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line
            yAxisId="annual"
            type="monotone"
            dataKey="sen"
            stroke={color}
            strokeWidth={1.8}
            strokeDasharray="7 5"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Scatter yAxisId="annual" data={annualRows} dataKey="annual" isAnimationActive={false}>
            {annualRows.map((row, i) => {
              const fill =
                row.quality === "reconstructed"
                  ? "#a78bfa"
                  : row.quality === "outlier"
                    ? "#fbbf24"
                    : color;
              return <Cell key={i} fill={fill} stroke="#070d17" strokeWidth={1.5} r={3.4} />;
            })}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
