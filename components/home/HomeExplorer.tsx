"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CloudRain,
  Flame,
  Globe2,
  Layers,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Snowflake,
  Sparkles,
} from "lucide-react";
import { KyrgyzstanMap } from "@/components/map/KyrgyzstanMap";
import { DualTrendChart } from "@/components/charts/DualTrendChart";
import { PeriodSlider } from "@/components/ui/PeriodSlider";
import { TrendBadge, SourceFlags } from "@/components/ui/TrendBadge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { formatNumber, formatNumberEn, formatP, slopePrecision, slopeUnit, slopeUnitEn } from "@/lib/format";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L, pickName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Phenomenon, PhenomenonMapPayload, TrendPayload } from "@/lib/types";


const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  "cloud-rain": CloudRain,
  snowflake: Snowflake,
  globe: Globe2,
  layers: Layers,
};

function slopeText(payload: TrendPayload, locale: "ru" | "en") {
  const v = payload.variable;
  const scale = v.unit === "м" ? 100 : 1;
  const p = slopePrecision(payload.stats.senSlope, v);
  const nf = locale === "en" ? formatNumberEn : formatNumber;
  return `${payload.stats.senSlope > 0 ? "+" : "−"}${nf(Math.abs(payload.stats.senSlope) * scale, p)} ${locale === "en" ? slopeUnitEn(v) : slopeUnit(v)}`;
}

export function HomeExplorer({
  initialMap,
  phenomena,
  period,
}: {
  initialMap: PhenomenonMapPayload;
  phenomena: Phenomenon[];
  period: { from: number; to: number };
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [code, setCode] = useState(initialMap.phenomenon.code);
  const [map, setMap] = useState<PhenomenonMapPayload>(initialMap);
  const [from, setFrom] = useState(initialMap.period.from);
  const [to, setTo] = useState(initialMap.period.to);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<TrendPayload | null>(null);
  const [global, setGlobal] = useState<TrendPayload | null>(null);
  const [note, setNote] = useState<string>("");
  const [mapLoading, setMapLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const mapAbort = useRef<AbortController | null>(null);
  const detailAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (first.current && code === initialMap.phenomenon.code && from === initialMap.period.from && to === initialMap.period.to) {
      first.current = false;
      return;
    }
    first.current = false;
    mapAbort.current?.abort();
    const ctrl = new AbortController();
    mapAbort.current = ctrl;
    setMapLoading(true);
    setError(null);
    fetch(`/api/phenomena?code=${code}&from=${from}&to=${to}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.message || "Не удалось загрузить карту");
        return r.json();
      })
      .then((data: PhenomenonMapPayload) => {
        setMap(data);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError(e instanceof Error ? e.message : "Ошибка сети");
      })
      .finally(() => setMapLoading(false));
    return () => ctrl.abort();
  }, [code, from, to, initialMap]);

  const loadDetail = (objectCode: string, phenomenonCode = code, f = from, t = to) => {
    detailAbort.current?.abort();
    const ctrl = new AbortController();
    detailAbort.current = ctrl;
    setSelected(objectCode);
    setDetailLoading(true);
    setError(null);
    fetch(`/api/phenomena?code=${phenomenonCode}&object=${objectCode}&from=${f}&to=${t}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.message || "Нет данных для этого объекта");
        return r.json();
      })
      .then((data: { local: TrendPayload; global: TrendPayload | null; note: string; noteEn?: string }) => {
        setDetail(data.local);
        setGlobal(data.global);
        setNote(locale === "en" ? data.noteEn ?? data.note : data.note);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          setError(e instanceof Error ? e.message : "Ошибка сети");
          setDetail(null);
          setGlobal(null);
        }
      })
      .finally(() => setDetailLoading(false));
  };

  const handlePeriod = (f: number, t: number) => {
    setFrom(f);
    setTo(t);
    if (selected) loadDetail(selected, code, f, t);
  };

  const reset = () => {
    setSelected(null);
    setDetail(null);
    setGlobal(null);
    setNote("");
  };

  const phenomenon = phenomena.find((p) => p.code === code) ?? map.phenomenon;
  const Icon = ICONS[phenomenon.icon] ?? Globe2;
  const top = map.markers.slice(0, 7);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-aurora-400/20 bg-aurora-400/10 text-aurora-300">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-display text-sm font-semibold text-slate-100">{L(locale, phenomenon.name, phenomenon.nameEn)}</div>
              <div className="text-[10px] text-slate-500">{L(locale, "объекты ранжированы по силе локального тренда", "objects ranked by local trend strength")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] text-slate-500 sm:flex">
              <MousePointerClick className="h-3 w-3" /> {L(locale, "клик по карте = точка", "click the map = point")}
            </span>
            <button
              type="button"
              onClick={() => {
                setMap(initialMap);
                setCode(initialMap.phenomenon.code);
                setFrom(initialMap.period.from);
                setTo(initialMap.period.to);
                reset();
              }}
              className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-aurora-400/30 hover:text-aurora-300"
              aria-label="Сбросить"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="relative">
          {mapLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#04070d]/30 backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin text-aurora-300" />
            </div>
          )}
          <KyrgyzstanMap
            markers={map.markers}
            selected={selected}
            onSelect={loadDetail}
            onPoint={(lat, lon) => router.push(`/explore?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&from=${from}&to=${to}`)}
            variant="full"
            className="rounded-none"
          />
        </div>

        <div className="grid gap-4 border-t border-white/[0.07] px-5 py-4 sm:grid-cols-[1fr_1.2fr] sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {phenomena.map((p) => {
              const PIcon = ICONS[p.icon] ?? Globe2;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    setCode(p.code);
                    reset();
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium transition",
                    p.code === code
                      ? "border-aurora-400/35 bg-aurora-400/10 text-aurora-200"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200",
                  )}
                >
                  <PIcon className="h-3 w-3" /> {p.name}
                </button>
              );
            })}
          </div>
          <PeriodSlider from={from} to={to} min={period.from} max={period.to} onChange={handlePeriod} />
        </div>

        <div className="border-t border-white/[0.06] px-5 py-3 text-[10px] leading-relaxed text-slate-500">
          {L(locale, phenomenon.description, phenomenon.descriptionEn ?? phenomenon.description)}
        </div>
      </div>

      <div className="panel flex min-h-[560px] flex-col overflow-hidden">
        {selected && detail ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
              <div className="min-w-0">
                <div className="label mb-1">{L(locale, "локальный сигнал", "local signal")}</div>
                <div className="truncate font-display text-base font-semibold text-slate-100">{pickName(locale, detail.object)}</div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">
                  {L(locale, detail.variable.name, detail.variable.nameEn)} · {detail.period.from}–{detail.period.to}
                </div>
              </div>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-500 transition hover:text-slate-200"
              >
                {L(locale, "сбросить", "reset")}
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <TrendBadge direction={detail.stats.direction} confidence={detail.stats.confidence} />
                <SourceFlags
                  isProxy={detail.variable.isProxy}
                  isReconstruction={detail.variable.isReconstruction}
                  isRegulated={detail.object.isRegulated}
                  proxyNote={detail.variable.proxyNote}
                  reconstructionNote={detail.variable.reconstructionNote}
                  regulatedNote={detail.object.regulatedNote}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
                  <div className="label text-[8px]">{L(locale, "наклон", "slope")}</div>
                  <div className="mt-1 font-display text-sm font-semibold text-aurora-300">{slopeText(detail, locale)}</div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
                  <div className="label flex items-center gap-1 text-[8px]">
                    p-value <InfoTip label="Что такое p">Вероятность увидеть такой тренд случайно, если тренда нет.</InfoTip>
                  </div>
                  <div className="mt-1 font-mono text-sm text-slate-200">{formatP(detail.stats.p)}</div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
                  <div className="label flex items-center gap-1 text-[8px]">
                    q (FDR) <InfoTip label={L(locale, "Что такое q", "What is q?")}>{L(locale, "p с поправкой на множественные сравнения. Смотрите на q, когда сравниваете много объектов.", "p corrected for multiple comparisons. Look at q when comparing many objects.")}</InfoTip>
                  </div>
                  <div className="mt-1 font-mono text-sm text-slate-200">{detail.stats.q !== null ? formatP(detail.stats.q) : "—"}</div>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#070d17] p-2">
                <DualTrendChart local={detail} global={global} height={220} />
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">{note}</p>
              <p className="rounded-xl border border-solar-400/15 bg-solar-400/[0.04] px-3 py-2 text-[10px] leading-relaxed text-solar-200/80">
                {L(locale, phenomenon.caveat, phenomenon.caveatEn ?? phenomenon.caveat)}
              </p>
            </div>
            <div className="border-t border-white/[0.07] p-4">
              <Link href={`/analysis?object=${detail.object.code}&variable=${detail.variable.code}&from=${detail.period.from}&to=${detail.period.to}`} className="btn-primary w-full">
                {L(locale, "Полный анализ", "Full analysis")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : detailLoading ? (
          <div className="space-y-4 p-5">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
              <div>
                <div className="label mb-1">{L(locale, "топ сигналов", "top signals")}</div>
                <div className="font-display text-base font-semibold text-slate-100">{L(locale, "Куда смотреть первым", "Where to look first")}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{L(locale, "объекты с самым сильным нормированным трендом", "objects with the strongest normalised trend")}</div>
              </div>
              <Sparkles className="h-4 w-4 text-aurora-300" />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {error ? (
                <EmptyState icon="error" title={L(locale, "Не удалось загрузить", "Could not load")} description={error} className="border-0 bg-transparent" />
              ) : top.length === 0 ? (
                <EmptyState icon="no-data" title={L(locale, "Нет объектов для этого явления", "No objects for this phenomenon")} description={L(locale, "Попробуйте другой период или явление.", "Try another period or phenomenon.")} className="border-0 bg-transparent" />
              ) : (
                <div className="space-y-1.5">
                  {top.map((m, i) => {
                    const scale = m.variable.unit === "м" ? 100 : 1;
                    return (
                      <button
                        key={`${m.object.code}-${m.variable.code}`}
                        type="button"
                        onClick={() => loadDetail(m.object.code)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition hover:border-white/[0.08] hover:bg-white/[0.035]"
                      >
                        <span className="w-4 shrink-0 font-mono text-[9px] text-slate-600">{String(i + 1).padStart(2, "0")}</span>
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background:
                              m.trend.confidence === "confident"
                                ? m.trend.direction === "rising"
                                  ? "#2ee6c8"
                                  : "#fb7185"
                                : m.trend.confidence === "weak"
                                  ? "#fbbf24"
                                  : "#64748b",
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium text-slate-200">{pickName(locale, m.object)}</span>
                          <span className="block truncate text-[9px] text-slate-500">{L(locale, m.variable.name, m.variable.nameEn)}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-[10px] text-slate-300">
                            {m.trend.senSlope > 0 ? "+" : "−"}
                            {(locale === "en" ? formatNumberEn : formatNumber)(Math.abs(m.trend.senSlope) * scale, slopePrecision(m.trend.senSlope, m.variable))}
                          </span>
                          <span className="block text-[8px] text-slate-600">{locale === "en" ? slopeUnitEn(m.variable) : slopeUnit(m.variable)}</span>
                        </span>
                        <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-600 transition group-hover:text-aurora-300" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="border-t border-white/[0.07] px-5 py-3 text-[10px] leading-relaxed text-slate-500">
              {L(
                locale,
                "Сила = |наклон Сена| / σ; q учитывается в ранжировании. Значимость проверена, для массового сравнения применена FDR-поправка (q). Нажмите на объект, чтобы увидеть местный график рядом с глобальным.",
                "Strength = |Sen slope| / σ; q is used in the ranking. Significance is tested and FDR-corrected for mass comparison. Click an object to see its local series next to the global indicator.",
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
