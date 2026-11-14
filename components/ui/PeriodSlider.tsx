"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PeriodSlider({
  from,
  to,
  min,
  max,
  onChange,
  className,
}: {
  from: number;
  to: number;
  min: number;
  max: number;
  onChange: (from: number, to: number) => void;
  className?: string;
}) {
  const { locale } = useLocale();
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="label">{L(locale, "Период", "Period")}</span>
        <span className="mono text-xs text-aurora-300">
          {from}–{to}
        </span>
      </div>
      <div className="grid gap-3">
        <label className="flex items-center gap-3">
          <span className="w-9 text-[10px] text-slate-500">{L(locale, "с", "from")}</span>
          <input
            type="range"
            min={min}
            max={max - 9}
            value={from}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange(v, Math.max(v + 9, to));
            }}
            className="h-4 w-full"
            aria-label={L(locale, "Начало периода", "Period start")}
          />
          <span className="mono w-10 text-right text-xs text-slate-300">{from}</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="w-9 text-[10px] text-slate-500">{L(locale, "по", "to")}</span>
          <input
            type="range"
            min={min + 9}
            max={max}
            value={to}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange(Math.min(v - 9, from), v);
            }}
            className="h-4 w-full"
            aria-label={L(locale, "Конец периода", "Period end")}
          />
          <span className="mono w-10 text-right text-xs text-slate-300">{to}</span>
        </label>
      </div>
    </div>
  );
}

export function YearSelect({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const years = [];
  for (let y = min; y <= max; y++) years.push(y);
  return (
    <label className="flex items-center gap-2">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-white/10 bg-[#070c14] px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:border-aurora-400/50 focus:outline-none"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
