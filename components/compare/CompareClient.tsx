"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Download,
  GitCompare,
  MessageCircle,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { TrendChart } from "@/components/charts/TrendChart";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { Badge } from "@/components/ui/Badge";
import { InfoTip } from "@/components/ui/InfoTip";
import { PeriodSlider, YearSelect } from "@/components/ui/PeriodSlider";
import { useAssistant } from "@/components/assistant/AssistantProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L, pickName } from "@/lib/i18n";
import { formatNumber, formatNumberEn, formatP, formatPEn, formatSigned, formatSignedEn, slopeDisplayScale, slopePrecision, slopeUnit, slopeUnitEn } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CompareResult, TrendTableView } from "@/lib/compare";
import type { Variable } from "@/lib/types";

type Table = TrendTableView | null;

const TYPES = [
  { value: "", ru: "Все типы", en: "All types" },
  { value: "lake", ru: "Озёра", en: "Lakes" },
  { value: "glacier", ru: "Ледники", en: "Glaciers" },
  { value: "region", ru: "Области", en: "Regions" },
  { value: "city", ru: "Города", en: "Cities" },
  { value: "river", ru: "Бассейны рек", en: "River basins" },
  { value: "reservoir", ru: "Водохранилища", en: "Reservoirs" },
];

type SortKey = "name" | "slope" | "p" | "q" | "coverage";

function pairBadge(pairType: CompareResult["pairType"], locale: "ru" | "en") {
  if (pairType === "opposite") return <Badge tone="aurora">{L(locale, "автоподбор: противоположные тренды", "auto: opposite trends")}</Badge>;
  if (pairType === "fallback") return <Badge tone="solar">{L(locale, "fallback: нет пары с противоположными трендами", "fallback: no opposite-trend pair")}</Badge>;
  return <Badge tone="slate">{L(locale, "ручная пара", "manual pair")}</Badge>;
}

export function CompareClient({
  variable,
  variables,
  compare,
  table,
  periodBounds,
  initialType,
  initialAuto,
}: {
  variable: Variable;
  variables: Variable[];
  compare: CompareResult;
  table: Table;
  periodBounds: { from: number; to: number };
  initialType: string | null;
  initialAuto: boolean;
}) {
  const router = useRouter();
  const { openWithPrompt } = useAssistant();
  const { locale } = useLocale();
  const nf = locale === "en" ? formatNumberEn : formatNumber;
  const pf = locale === "en" ? formatPEn : formatP;
  const [type, setType] = useState(initialType ?? "");
  const [showPeriod, setShowPeriod] = useState(false);
  const [localFrom, setLocalFrom] = useState(compare.period.from);
  const [localTo, setLocalTo] = useState(compare.period.to);
  const [sortKey, setSortKey] = useState<SortKey>("slope");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const availableObjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of table?.rows ?? []) map.set(row.object.code, row.object.name);
    map.set(compare.a.object.code, compare.a.object.name);
    map.set(compare.b.object.code, compare.b.object.name);
    return [...map.entries()].map(([code, name]) => ({ code, name }));
  }, [table, compare]);

  const yDomain = useMemo(() => {
    const values = [...compare.a.annual.map((p) => p.value), ...compare.b.annual.map((p) => p.value)];
    if (!values.length) return undefined;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.08 || 1;
    return [min - pad, max + pad] as [number, number];
  }, [compare]);

  const rows = useMemo(() => {
    const list = [...(table?.rows ?? [])];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.object.name.localeCompare(b.object.name, "ru");
      else if (sortKey === "slope") cmp = Math.abs(a.stats.senSlope) - Math.abs(b.stats.senSlope);
      else if (sortKey === "p") cmp = a.stats.p - b.stats.p;
      else if (sortKey === "q") cmp = (a.q ?? 1) - (b.q ?? 1);
      else cmp = a.stats.coverage - b.stats.coverage;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [table, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "p" || key === "q" ? "asc" : "desc");
    }
  };

  const push = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const state = {
      variable: variable.code,
      from: compare.period.from,
      to: compare.period.to,
      type,
      ...patch,
    };
    for (const [k, v] of Object.entries(state)) {
      if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
    }
    router.push(`/compare?${p.toString()}`);
  };

  const chooseVariable = (code: string) => {
    const p = new URLSearchParams({ variable: code, from: String(compare.period.from), to: String(compare.period.to), auto: "1" });
    if (type) p.set("type", type);
    router.push(`/compare?${p.toString()}`);
  };

  const applyPeriod = () => {
    push({ from: localFrom, to: localTo, auto: "1" });
    setShowPeriod(false);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(L(locale, "Ссылка скопирована", "Link copied"));
    } catch {
      toast.error(L(locale, "Не удалось скопировать ссылку", "Could not copy the link"));
    }
  };

  const downloadTable = () => {
    if (!table) return;
    const header = ["object", "region", "type", "direction", "confidence", "sen_slope", "unit", "p", "q", "coverage"];
    const lines = [header.join(",")];
    for (const r of rows) {
      const scale = slopeDisplayScale(variable);
      const slope = (r.stats.senSlope * scale).toFixed(5);
      lines.push(
        [
          `"${r.object.name.replace(/"/g, '""')}"`,
          `"${r.object.region.replace(/"/g, '""')}"`,
          r.object.type,
          r.stats.direction,
          r.stats.confidence,
          slope,
          `"${slopeUnit(variable)}"`,
          r.stats.p.toFixed(6),
          r.q !== null ? r.q.toFixed(6) : "",
          (r.stats.coverage * 100).toFixed(1),
        ].join(","),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `k2_compare_${variable.code}_${compare.period.from}_${compare.period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const askAi = () => {
    openWithPrompt(
      L(
        locale,
        `Сравни «${compare.a.object.name}» и «${compare.b.object.name}» по переменной «${variable.name}» за ${compare.period.from}–${compare.period.to}. ${compare.difference} Объясни простыми словами, почему направления могут различаться, и что это не доказывает.`,
        `Compare ${compare.a.object.nameEn} and ${compare.b.object.nameEn} for ${variable.nameEn} over ${compare.period.from}–${compare.period.to}. ${compare.differenceEn} Explain in plain language why the directions may differ and what this does not prove.`,
      ),
    );
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-slate-600" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-aurora-300" /> : <ArrowDown className="h-3 w-3 text-aurora-300" />;
  };

  return (
    <div className="section pb-20 pt-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-px w-8 bg-aurora-400/60" />
            <span className="label text-aurora-300/90">сравнение</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-4xl">
            {L(locale, "Два региона. Одна переменная. Разные истории.", "Two regions. One variable. Different stories.")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            {L(
              locale,
              "Автоподбор ищет значимые тренды противоположного знака и максимизирует разницу нормированных наклонов. Если такой пары нет — показывает честный fallback.",
              "Auto-selection looks for significant opposite trends and maximises the difference in normalised slopes. If no such pair exists, it shows an honest fallback.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={share} className="btn-secondary btn-sm">
            <Share2 className="h-3.5 w-3.5" /> {L(locale, "Поделиться", "Share")}
          </button>
          <button type="button" onClick={() => push({ auto: "1" })} className="btn-primary btn-sm">
            <RefreshCw className="h-3.5 w-3.5" /> {L(locale, "Автоподбор", "Auto pair")}
          </button>
        </div>
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 lg:flex-row lg:items-center">
        <label className="flex items-center gap-2">
          <span className="label">{L(locale, "переменная", "variable")}</span>
          <select
            value={variable.code}
            onChange={(e) => chooseVariable(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#070c14] px-3 py-2 text-[11px] text-slate-200 focus:border-aurora-400/50 focus:outline-none"
          >
            {variables.map((v) => (
              <option key={v.code} value={v.code}>{v.name} ({v.unit})</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="label">{L(locale, "тип", "type")}</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              push({ type: e.target.value, auto: "1" });
            }}
            className="rounded-lg border border-white/10 bg-[#070c14] px-3 py-2 text-[11px] text-slate-200 focus:border-aurora-400/50 focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{L(locale, t.ru, t.en)}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <span className="label">{L(locale, "пара", "pair")}</span>
          <select
            value={compare.a.object.code}
            onChange={(e) => push({ a: e.target.value, b: compare.b.object.code, auto: "0" })}
            className="max-w-[180px] rounded-lg border border-white/10 bg-[#070c14] px-2.5 py-2 text-[11px] text-slate-200 focus:border-aurora-400/50 focus:outline-none"
            aria-label="Объект A"
          >
            {availableObjects.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
          <span className="text-[10px] text-slate-600">vs</span>
          <select
            value={compare.b.object.code}
            onChange={(e) => push({ a: compare.a.object.code, b: e.target.value, auto: "0" })}
            className="max-w-[180px] rounded-lg border border-white/10 bg-[#070c14] px-2.5 py-2 text-[11px] text-slate-200 focus:border-aurora-400/50 focus:outline-none"
            aria-label="Объект B"
          >
            {availableObjects.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <span className="mono rounded-lg border border-white/10 bg-[#070c14] px-2.5 py-2 text-[11px] text-slate-300">
            {compare.period.from}–{compare.period.to}
          </span>
          <button type="button" onClick={() => setShowPeriod((v) => !v)} className="btn-secondary btn-sm">
            {L(locale, "Период", "Period")}
          </button>
        </div>
      </div>

      {showPeriod && (
        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <PeriodSlider from={localFrom} to={localTo} min={periodBounds.from} max={periodBounds.to} onChange={(f, t) => { setLocalFrom(f); setLocalTo(t); }} />
            <div className="flex flex-wrap items-center gap-2">
              <YearSelect value={localFrom} min={periodBounds.from} max={localTo - 9} onChange={setLocalFrom} label="с" />
              <YearSelect value={localTo} min={localFrom + 9} max={periodBounds.to} onChange={setLocalTo} label="по" />
              <button type="button" onClick={applyPeriod} className="btn-primary btn-sm">
                Применить <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* pair */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {pairBadge(compare.pairType, locale)}
        <Badge tone="slate" className="font-mono">{table?.tests ?? 0} тестов · FDR</Badge>
        <InfoTip label={L(locale, "Как выбирается пара", "How the pair is selected")}>
          {L(
            locale,
            "Оба тренда значимы (p < 0,05), знаки противоположны, максимизируется разница |наклон| / σ. Если таких пар нет — показывается самый сильный тренд и самый стабильный объект с честной подписью.",
            "Both trends are significant (p < 0.05), the signs are opposite, and the difference in |slope| / σ is maximised. If no such pair exists, the strongest trend and the most stable object are shown with an honest label.",
          )}
        </InfoTip>
        <span className="ml-auto text-[10px] text-slate-600">
          {initialAuto ? L(locale, "режим автоподбора", "auto mode") : L(locale, "ручная пара", "manual pair")}
        </span>
      </div>

      {compare.pairType === "fallback" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span>Попробуйте переменную с контрастом:</span>
          {variables
            .filter((v) => ["precip", "soil_moisture", "evaporation"].includes(v.code) && v.code !== variable.code)
            .slice(0, 3)
            .map((v) => (
              <Link
                key={v.code}
                href={`/compare?variable=${v.code}&from=${compare.period.from}&to=${compare.period.to}&auto=1${type ? `&type=${type}` : ""}`}
                className="rounded-full border border-aurora-400/20 bg-aurora-400/[0.05] px-2.5 py-1 text-aurora-200 transition hover:bg-aurora-400/10"
              >
                {v.name}
              </Link>
            ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[compare.a, compare.b].map((side, idx) => {
          const isA = idx === 0;
          const scale = slopeDisplayScale(side.variable);
          const sp = slopePrecision(side.stats.senSlope, side.variable);
          return (
            <div key={side.object.code} className={cn("overflow-hidden rounded-2xl border bg-[#070d17]", isA ? "border-aurora-400/20" : "border-violet-400/20")}>
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-mono", isA ? "bg-aurora-400/15 text-aurora-300" : "bg-violet-400/15 text-violet-300")}>
                      {isA ? "A" : "B"}
                    </span>
                    <span className="truncate font-display text-base font-semibold text-slate-100">{pickName(locale, side.object)}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">{side.object.region} · {L(locale, side.variable.name, side.variable.nameEn)}</div>
                </div>
                <TrendBadge direction={side.stats.direction} confidence={side.stats.confidence} />
              </div>
              <div className="grid grid-cols-3 gap-2 px-5 py-3">
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-600">{L(locale, "наклон", "slope")}</div>
                  <div className={cn("mt-0.5 font-mono text-[12px]", side.stats.senSlope > 0 ? "text-aurora-300" : side.stats.senSlope < 0 ? "text-ember-400" : "text-slate-400")}>
                    {locale === "en" ? formatSignedEn(side.stats.senSlope * scale, sp) : formatSigned(side.stats.senSlope * scale, sp)}
                  </div>
                  <div className="text-[8px] text-slate-600">{locale === "en" ? slopeUnitEn(side.variable) : slopeUnit(side.variable)}</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-600">p / q</div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-300">{pf(side.stats.p)}</div>
                  <div className="text-[8px] text-slate-600">q {side.stats.q !== null ? pf(side.stats.q) : "—"}</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-600">{L(locale, "лет / покрытие", "years / coverage")}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-300">{side.stats.nYears}</div>
                  <div className="text-[8px] text-slate-600">{Math.round(side.stats.coverage * 100)}%</div>
                </div>
              </div>
              <div className="px-2 pb-2">
                <TrendChart payload={side} height={260} showMonthly={false} showBand yDomain={yDomain} />
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-2.5">
                <span className="text-[9px] text-slate-600">{side.dataset}</span>
                <Link href={`/analysis?object=${side.object.code}&variable=${side.variable.code}&from=${compare.period.from}&to=${compare.period.to}`} className="inline-flex items-center gap-1 text-[10px] text-aurora-300 hover:text-aurora-200">
                  {L(locale, "открыть анализ", "open analysis")} <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-aurora-400/20 bg-aurora-400/10 text-aurora-300">
            <GitCompare className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-200">{L(locale, "Что показывает сравнение", "What the comparison shows")}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{L(locale, compare.difference, compare.differenceEn)}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{L(locale, compare.caveat, compare.caveatEn)}</p>
          </div>
        </div>
      </div>

      {/* table */}
      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-px w-8 bg-aurora-400/60" />
              <span className="label text-aurora-300/90">{L(locale, "все объекты", "all objects")}</span>
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-50">{L(locale, "Таблица трендов", "Trend table")}</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {table?.tests ?? 0} {L(locale, "тестов; q — Benjamini–Hochberg. Сортировка по клику на заголовок.", "tests; q is Benjamini–Hochberg. Click a header to sort.")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadTable} className="btn-secondary btn-sm">
              <Download className="h-3.5 w-3.5" /> {L(locale, "CSV таблицы", "Table CSV")}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.025]">
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    {L(locale, "объект", "object")} {sortIcon("name")}
                  </button>
                </th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-wider text-slate-500">{L(locale, "тренд", "trend")}</th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("slope")} className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    {L(locale, "наклон", "slope")} {sortIcon("slope")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("p")} className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    p {sortIcon("p")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("q")} className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    q (FDR) {sortIcon("q")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("coverage")} className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    {L(locale, "покрытие", "coverage")} {sortIcon("coverage")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const scale = slopeDisplayScale(variable);
                const sp = slopePrecision(r.stats.senSlope, variable);
                const isA = r.object.code === compare.a.object.code;
                const isB = r.object.code === compare.b.object.code;
                return (
                  <tr
                    key={r.object.code}
                    onClick={() => router.push(`/analysis?object=${r.object.code}&variable=${variable.code}&from=${compare.period.from}&to=${compare.period.to}`)}
                    className={cn(
                      "cursor-pointer border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.035]",
                      isA && "bg-aurora-400/[0.04]",
                      isB && "bg-violet-400/[0.04]",
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-200">{pickName(locale, r.object)}</span>
                        {isA && <span className="rounded bg-aurora-400/15 px-1 py-0.5 text-[8px] font-mono text-aurora-300">A</span>}
                        {isB && <span className="rounded bg-violet-400/15 px-1 py-0.5 text-[8px] font-mono text-violet-300">B</span>}
                      </div>
                      <div className="text-[9px] text-slate-600">{r.object.region}</div>
                    </td>
                    <td className="px-4 py-2.5"><TrendBadge direction={r.stats.direction} confidence={r.stats.confidence} compact /></td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-300">
                      {locale === "en" ? formatSignedEn(r.stats.senSlope * scale, sp) : formatSigned(r.stats.senSlope * scale, sp)}
                      <span className="ml-1 text-[8px] text-slate-600">{locale === "en" ? slopeUnitEn(variable) : slopeUnit(variable)}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{pf(r.stats.p)}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{r.q !== null ? pf(r.q) : "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{Math.round(r.stats.coverage * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-aurora-400/15 bg-aurora-400/[0.04] px-5 py-4 sm:flex-row">
        <div className="flex items-center gap-2 text-[11px] text-aurora-100/70">
          <Sparkles className="h-4 w-4 text-aurora-300" />
          {L(locale, "Хотите, AI объяснит различие и предложит следующий шаг?", "Want the AI to explain the difference and suggest the next step?")}
        </div>
        <button type="button" onClick={askAi} className="btn-primary btn-sm">
          <MessageCircle className="h-3.5 w-3.5" /> {L(locale, "Спросить AI", "Ask AI")}
        </button>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link href="/explore" className="btn-ghost btn-sm">
          <ArrowLeft className="h-3.5 w-3.5" /> {L(locale, "Исследовать другой параметр", "Explore another variable")}
        </Link>
        <Link href="/method" className="text-[10px] text-slate-500 transition hover:text-aurora-300">
          {L(locale, "как считается FDR", "how FDR is computed")} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
