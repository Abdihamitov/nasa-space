"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { annualUnit, annualUnitEn, formatNumber, formatNumberEn, unitEn } from "@/lib/format";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";
import type { AnnualPoint, TrendPayload } from "@/lib/types";

function align(a: AnnualPoint[], b: AnnualPoint[]) {
  const mb = new Map(b.map((p) => [p.year, p.value]));
  const years = a.map((p) => p.year).filter((y) => mb.has(y));
  return years.map((year) => {
    const av = a.find((p) => p.year === year)?.value;
    const bv = mb.get(year);
    return { year, local: av, global: bv };
  });
}

export function DualTrendChart({
  local,
  global,
  height = 300,
}: {
  local: TrendPayload;
  global: TrendPayload | null;
  height?: number;
}) {
  const { locale } = useLocale();
  const nf = locale === "en" ? formatNumberEn : formatNumber;
  const data = useMemo(() => {
    if (!global) {
      return local.annual.map((p) => ({ year: p.year, local: p.value, global: undefined as number | undefined }));
    }
    return align(local.annual, global.annual);
  }, [local, global]);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => String(v)}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => nf(Number(v), 1)}
            label={{
              value: locale === "en" ? annualUnitEn(local.variable) : annualUnit(local.variable),
              angle: -90,
              position: "insideLeft",
              fill: "#7d8da6",
              fontSize: 10,
            }}
          />
          {global && (
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => nf(Number(v), 2)}
              label={{
                value: locale === "en" ? unitEn(global.variable) : global.variable.unit,
                angle: 90,
                position: "insideRight",
                fill: "#a78bfa",
                fontSize: 10,
              }}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "#080e18",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelFormatter={(v) => `${v}`}
            formatter={(value: number | string, name: string) => [
              nf(Number(value), 2),
              name === "local" ? local.variable.name : global?.variable.name ?? "",
            ]}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="local"
            stroke={local.variable.color}
            strokeWidth={2}
            dot={{ r: 2.2, fill: local.variable.color, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
            name="local"
          />
          {global && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="global"
              stroke="#a78bfa"
              strokeWidth={1.6}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
              name="global"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: local.variable.color }} /> {L(locale, local.variable.shortName, local.variable.nameEn)}
        </span>
        {global && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded border-t border-dashed border-violet-400" /> {L(locale, global.variable.shortName, global.variable.nameEn)}
          </span>
        )}
        <span className="ml-auto">{L(locale, "сопоставление, не причинность", "comparison, not causation")}</span>
      </div>
    </div>
  );
}
