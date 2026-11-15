"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Crosshair,
  Database,
  Globe2,
  Info,
  MapPin,
  RotateCcw,
  Search,
  Snowflake,
  Sparkles,
  Thermometer,
  Waves,
} from "lucide-react";
import { KyrgyzstanMap, POINT_TYPES, type MapPoint } from "@/components/map/KyrgyzstanMap";
import { PeriodSlider, YearSelect } from "@/components/ui/PeriodSlider";
import { SourceFlags } from "@/components/ui/TrendBadge";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L, pickName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Catalog, CatalogObject, SectionCode, Variable } from "@/lib/types";


const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  water: Waves,
  snow: Snowflake,
  climate: Thermometer,
  vegetation: Sparkles,
  global: Globe2,
};

const TYPE_LABEL: Record<string, string> = {
  lake: "Озеро",
  reservoir: "Водохранилище",
  river: "Бассейн реки",
  glacier: "Ледник",
  region: "Область",
  city: "Город",
  global: "Глобальный",
  grid: "Точка сетки",
};

const TYPE_ORDER = ["lake", "reservoir", "river", "glacier", "region", "city", "global", "grid"];

const QUICK = [
  { object: "issyk-kul", variable: "lake_level", label: "Иссык-Куль · уровень" },
  { object: "bishkek", variable: "t2m", label: "Бишкек · температура" },
  { object: "enilchek", variable: "snow_days", label: "Энильчек · снег" },
  { object: "naryn", variable: "precip", label: "Нарын · осадки" },
];

function buildHref(state: {
  section?: string | null;
  object?: string | null;
  variable?: string | null;
  from?: number;
  to?: number;
  lat?: number | null;
  lon?: number | null;
}) {
  const p = new URLSearchParams();
  if (state.section) p.set("section", state.section);
  if (state.object) p.set("object", state.object);
  if (state.variable) p.set("variable", state.variable);
  if (state.from) p.set("from", String(state.from));
  if (state.to) p.set("to", String(state.to));
  if (state.lat !== undefined && state.lat !== null) p.set("lat", state.lat.toFixed(3));
  if (state.lon !== undefined && state.lon !== null) p.set("lon", state.lon.toFixed(3));
  return `/explore?${p.toString()}`;
}

export function ExploreClient({
  catalog,
  initial,
}: {
  catalog: Catalog;
  initial: {
    section: string | null;
    object: string | null;
    variable: string | null;
    from: number;
    to: number;
    lat: number | null;
    lon: number | null;
  };
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [section, setSection] = useState<string | null>(initial.section);
  const [objectCode, setObjectCode] = useState<string | null>(initial.object);
  const [variableCode, setVariableCode] = useState<string | null>(initial.variable);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [search, setSearch] = useState("");

  const object = objectCode ? catalog.objects.find((o) => o.code === objectCode) ?? null : null;
  const variable = variableCode ? catalog.variables.find((v) => v.code === variableCode) ?? null : null;
  const sectionDef = section ? catalog.sections.find((s) => s.code === section) ?? null : null;

  const step = !section ? 1 : !object ? 2 : !variable ? 3 : 4;

  const sectionObjects = useMemo(() => {
    if (!section) return [];
    return catalog.objects.filter(
      (o) => !o.isGrid && o.variables.some((v) => catalog.variables.find((x) => x.code === v)?.section === section),
    );
  }, [catalog, section]);

  const objectVariables = useMemo(() => {
    if (!object) return [];
    return object.variables
      .map((code) => catalog.variables.find((v) => v.code === code))
      .filter((v): v is Variable => Boolean(v))
      .filter((v) => !section || v.section === section);
  }, [catalog, object, section]);

  const seriesMeta = useMemo(() => {
    if (!object || !variable) return null;
    return catalog.seriesIndex.find((s) => s.object === object.code && s.variable === variable.code) ?? null;
  }, [catalog, object, variable]);

  const mapPoints: MapPoint[] = useMemo(() => {
    const base = (section ? sectionObjects : catalog.objects.filter((o) => !o.isGrid && !o.isGlobal))
      .filter((o) => !o.isGlobal)
      .map((o) => ({
        code: o.code,
        lat: o.lat,
        lon: o.lon,
        name: o.name,
        type: o.type,
        selected: o.code === objectCode,
      }));
    if (object?.isGrid) {
      base.push({
        code: object.code,
        lat: object.lat,
        lon: object.lon,
        name: object.name,
        type: "grid",
        selected: true,
      });
    }
    return base;
  }, [catalog, section, sectionObjects, object, objectCode]);

  const filteredObjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sectionObjects.filter((o) => {
      if (!q) return true;
      return `${o.name} ${o.nameEn} ${o.region} ${o.tags.join(" ")}`.toLowerCase().includes(q);
    });
    return list.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name, "ru"));
  }, [sectionObjects, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogObject[]>();
    for (const o of filteredObjects) {
      const arr = map.get(o.type) ?? [];
      arr.push(o);
      map.set(o.type, arr);
    }
    return [...map.entries()].sort((a, b) => TYPE_ORDER.indexOf(a[0]) - TYPE_ORDER.indexOf(b[0]));
  }, [filteredObjects]);

  const go = (state: Parameters<typeof buildHref>[0], mode: "push" | "replace" = "push") => {
    const href = buildHref(state);
    if (mode === "replace") router.replace(href);
    else router.push(href);
  };

  const chooseSection = (code: string) => {
    setSection(code);
    setObjectCode(null);
    setVariableCode(null);
    setSearch("");
    go({ section: code, from, to });
  };

  const chooseObject = (code: string) => {
    const obj = catalog.objects.find((o) => o.code === code);
    if (!obj) return;
    const vars = obj.variables
      .map((v) => catalog.variables.find((x) => x.code === v))
      .filter((v): v is Variable => Boolean(v))
      .filter((v) => !section || v.section === section);
    const nextVar = vars.length === 1 ? vars[0].code : null;
    setObjectCode(code);
    setVariableCode(nextVar);
    go({
      section,
      object: code,
      variable: nextVar,
      from,
      to,
      lat: obj.isGrid ? obj.lat : null,
      lon: obj.isGrid ? obj.lon : null,
    });
  };

  const chooseObjectVariable = (objectCode: string, variableCode: string) => {
    const obj = catalog.objects.find((o) => o.code === objectCode);
    if (!obj) return;
    setObjectCode(objectCode);
    setVariableCode(variableCode);
    go({
      section: section ?? catalog.variables.find((v) => v.code === variableCode)?.section ?? null,
      object: objectCode,
      variable: variableCode,
      from,
      to,
      lat: obj.isGrid ? obj.lat : null,
      lon: obj.isGrid ? obj.lon : null,
    });
  };

  const chooseVariable = (code: string) => {
    setVariableCode(code);
    go({ section, object: objectCode, variable: code, from, to, lat: object?.isGrid ? object.lat : null, lon: object?.isGrid ? object.lon : null });
  };

  const handlePoint = (lat: number, lon: number) => {
    let best: CatalogObject | null = null;
    let bestD = Infinity;
    for (const o of catalog.objects) {
      if (!o.isGrid) continue;
      const dLat = (o.lat - lat) * 111;
      const dLon = (o.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180);
      const d = dLat * dLat + dLon * dLon;
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (!best) return;
    setObjectCode(best.code);
    setVariableCode(null);
    go({ section, object: best.code, from, to, lat: best.lat, lon: best.lon });
  };

  const setPeriod = (f: number, t: number) => {
    setFrom(f);
    setTo(t);
    go({ section, object: objectCode, variable: variableCode, from: f, to: t, lat: object?.isGrid ? object.lat : null, lon: object?.isGrid ? object.lon : null }, "replace");
  };

  const start = () => {
    if (!object || !variable) return;
    router.push(`/analysis?object=${object.code}&variable=${variable.code}&from=${from}&to=${to}`);
  };

  const reset = () => {
    setSection(null);
    setObjectCode(null);
    setVariableCode(null);
    setSearch("");
    setFrom(catalog.meta.period.from);
    setTo(catalog.meta.period.to);
    router.push("/explore");
  };

  const jump = (target: number) => {
    if (target === 1) {
      setSection(null);
      setObjectCode(null);
      setVariableCode(null);
      go({ from, to });
    } else if (target === 2) {
      setObjectCode(null);
      setVariableCode(null);
      go({ section, from, to });
    } else if (target === 3) {
      setVariableCode(null);
      go({ section, object: objectCode, from, to });
    }
  };

  return (
    <div className="section pb-20 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-px w-8 bg-aurora-400/60" />
            <span className="label text-aurora-300/90">исследовать</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-4xl">
            {L(locale, "Соберите запрос детектива", "Build a detective query")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            {L(
              locale,
              "Четыре шага, только доступные комбинации. В конце — вывод простыми словами, график, p/q, цепочка гипотез и CSV.",
              "Four steps, only available combinations. At the end: a plain-language verdict, a chart, p/q, a hypothesis chain and CSV.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className="btn-ghost btn-sm">
            <RotateCcw className="h-3.5 w-3.5" /> {L(locale, "Сбросить", "Reset")}
          </button>
          <span className="chip"><Sparkles className="h-3 w-3 text-aurora-300" /> {L(locale, "AI подскажет путь", "AI can suggest a path")}</span>
        </div>
      </div>

      {/* stepper */}
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { n: 1, ru: "Раздел", en: "Section" },
          { n: 2, ru: "Место", en: "Place" },
          { n: 3, ru: "Параметр", en: "Variable" },
          { n: 4, ru: "Период", en: "Period" },
        ].map((s) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => jump(s.n)}
              disabled={s.n > step}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition",
                active
                  ? "border-aurora-400/35 bg-aurora-400/[0.08]"
                  : done
                    ? "border-white/[0.09] bg-white/[0.03] hover:border-aurora-400/20"
                    : "border-white/[0.05] bg-white/[0.015] opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-mono",
                  active
                    ? "border-aurora-400/50 bg-aurora-400 text-ink-950"
                    : done
                      ? "border-aurora-400/30 bg-aurora-400/10 text-aurora-300"
                      : "border-white/10 text-slate-600",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : s.n}
              </span>
              <span className={cn("text-[11px] font-medium", active ? "text-slate-100" : done ? "text-slate-300" : "text-slate-600")}>
                {L(locale, s.ru, s.en)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_540px]">
        <div className="space-y-5">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="panel p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="label mb-1">шаг 1</div>
                  <h2 className="font-display text-lg font-semibold text-slate-100">{L(locale, "С чего начнём?", "Where do we start?")}</h2>
                </div>
                <span className="text-[10px] text-slate-500">4 {L(locale, "раздела", "sections")}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.sections.map((s) => {
                  const Icon = SECTION_ICONS[s.code] ?? Globe2;
                  const count = catalog.objects.filter(
                    (o) => !o.isGrid && o.variables.some((v) => catalog.variables.find((x) => x.code === v)?.section === s.code),
                  ).length;
                  return (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => chooseSection(s.code)}
                      className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition hover:border-aurora-400/30 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-aurora-300">
                          <Icon className="h-4 w-4" />
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-aurora-300" />
                      </div>
                      <div className="mt-4 font-display text-sm font-semibold text-slate-100">{L(locale, s.name, s.nameEn)}</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{L(locale, s.description, s.descriptionEn ?? s.description)}</p>
                      <div className="mt-3 text-[10px] text-slate-600">{count} {L(locale, "объектов с данными", "objects with data")}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 rounded-xl border border-aurora-400/15 bg-aurora-400/[0.04] px-4 py-3 text-[11px] leading-relaxed text-aurora-100/80">
                <span className="font-semibold text-aurora-200">{L(locale, "Быстрый старт:", "Quick start:")}</span>{" "}
                {L(locale, "Иссык-Куль → уровень озера → 2000–2025. Это сценарий, который показывает и силу, и ограничения метода.", "Issyk-Kul → lake level → 2000–2025. A scenario that shows both the power and the limits of the method.")}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && section && (
            <div className="panel p-5 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="label mb-1">шаг 2 · {sectionDef?.name}</div>
                  <h2 className="font-display text-lg font-semibold text-slate-100">{L(locale, "Выберите место", "Choose a place")}</h2>
                </div>
                <button type="button" onClick={() => jump(1)} className="btn-ghost btn-sm self-start">
                  <ArrowLeft className="h-3.5 w-3.5" /> {L(locale, "другой раздел", "another section")}
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={L(locale, "Найти озеро, ледник, регион…", "Find a lake, glacier or region…")}
                  className="input pl-9"
                  aria-label="Поиск объекта"
                />
              </div>

              <div className="mb-4 flex flex-wrap gap-1.5">
                {QUICK.filter((q) => {
                  const obj = catalog.objects.find((o) => o.code === q.object);
                  return obj?.variables.some((v) => catalog.variables.find((x) => x.code === v)?.section === section);
                }).map((q) => (
                  <button
                    key={q.object}
                    type="button"
                    onClick={() => chooseObjectVariable(q.object, q.variable)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-400 transition hover:border-aurora-400/30 hover:text-aurora-200"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {filteredObjects.length === 0 ? (
                <EmptyState icon="search" title="Ничего не найдено" description="Попробуйте другое название или выберите точку на карте." />
              ) : (
                <div className="space-y-5">
                  {grouped.map(([type, items]) => (
                    <div key={type}>
                      <div className="label mb-2">{TYPE_LABEL[type] ?? type}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((o) => (
                          <button
                            key={o.code}
                            type="button"
                            onClick={() => chooseObject(o.code)}
                            className={cn(
                              "group rounded-xl border p-3 text-left transition",
                              o.code === objectCode
                                ? "border-aurora-400/35 bg-aurora-400/[0.07]"
                                : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-[12px] font-semibold text-slate-100">{pickName(locale, o)}</div>
                                <div className="mt-0.5 truncate text-[10px] text-slate-500">{o.region}</div>
                              </div>
                              {o.code === objectCode ? (
                                <Check className="h-4 w-4 shrink-0 text-aurora-300" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-slate-300" />
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {o.isRegulated && <Badge tone="solar" className="px-1.5 py-0.5 text-[8px]">{L(locale, "регулируемый", "regulated")}</Badge>}
                              {o.type === "glacier" && <Badge tone="ice" className="px-1.5 py-0.5 text-[8px]">{L(locale, "прокси снега", "snow proxy")}</Badge>}
                              {o.isGlobal && <Badge tone="violet" className="px-1.5 py-0.5 text-[8px]">{L(locale, "глобальный", "global")}</Badge>}
                              <span className="text-[9px] text-slate-600">{o.variables.length} {L(locale, "перем.", "vars")}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {section !== "global" && (
                <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.015] p-4">
                  <div className="flex items-start gap-3">
                    <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-aurora-300" />
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200">{L(locale, "Произвольная точка", "Arbitrary point")}</div>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                        {L(
                          locale,
                          "Кликните по карте справа — анализ пойдёт по ближайшей ячейке сетки NASA POWER. Это не границы объекта, а точка 0,25°.",
                          "Click the map on the right — the analysis uses the nearest NASA POWER grid cell. This is not an object boundary, but a 0.25° point.",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && object && (
            <div className="panel p-5 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="label mb-1">шаг 3 · {object.name}</div>
                  <h2 className="font-display text-lg font-semibold text-slate-100">{L(locale, "Выберите параметр", "Choose a variable")}</h2>
                </div>
                <button type="button" onClick={() => jump(2)} className="btn-ghost btn-sm self-start">
                  <ArrowLeft className="h-3.5 w-3.5" /> {L(locale, "другое место", "another place")}
                </button>
              </div>

              {object.isGrid && (
                <div className="mb-4 rounded-xl border border-ice-400/15 bg-ice-400/[0.04] px-4 py-3 text-[11px] leading-relaxed text-ice-200/80">
                  Точка {object.lat.toFixed(2)}° с.ш., {object.lon.toFixed(2)}° в.д. Доступны только переменные сетки
                  NASA POWER; для остальных параметров выберите готовый объект.
                </div>
              )}

              {objectVariables.length === 0 ? (
                <EmptyState icon="no-data" title="Нет переменных в этом разделе" description="Вернитесь на шаг назад и выберите другой объект или раздел." />
              ) : (
                <div className="grid gap-2">
                  {objectVariables.map((v) => (
                    <button
                      key={v.code}
                      type="button"
                      onClick={() => chooseVariable(v.code)}
                      className={cn(
                        "group rounded-xl border p-4 text-left transition",
                        v.code === variableCode
                          ? "border-aurora-400/35 bg-aurora-400/[0.07]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-100">{L(locale, v.name, v.nameEn)}</span>
                            <span className="chip px-2 py-0.5 text-[9px]">{v.unit}</span>
                            {v.isProxy && <Badge tone="ice" className="px-1.5 py-0.5 text-[8px]">прокси</Badge>}
                            {v.isReconstruction && <Badge tone="violet" className="px-1.5 py-0.5 text-[8px]">реконструкция</Badge>}
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{L(locale, v.description, v.descriptionEn ?? v.description)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-slate-600">
                            <span>{v.source.name}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-700" />
                            <span>{L(locale, "годовая", "annual")}: {v.yearlyAgg === "mean" ? L(locale, "среднее", "mean") : v.yearlyAgg === "sum" ? L(locale, "сумма", "sum") : L(locale, "максимум", "max")}</span>
                            {v.seasonMonths && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-slate-700" />
                                <span>сезон: {v.seasonMonths.join(", ")}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {v.code === variableCode ? (
                          <Check className="h-4 w-4 shrink-0 text-aurora-300" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-slate-300" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && object && variable && (
            <div className="panel p-5 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="label mb-1">шаг 4 · финальный</div>
                  <h2 className="font-display text-lg font-semibold text-slate-100">{L(locale, "Выберите период", "Choose a period")}</h2>
                </div>
                <button type="button" onClick={() => jump(3)} className="btn-ghost btn-sm self-start">
                  <ArrowLeft className="h-3.5 w-3.5" /> {L(locale, "другой параметр", "another variable")}
                </button>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#070c14] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="slate" className="px-2 py-0.5 text-[9px]">тренд будет рассчитан</Badge>
                  <span className="text-[11px] text-slate-400">
                    {object.name} · {variable.name}
                  </span>
                </div>
                <div className="mt-4">
                  <PeriodSlider from={from} to={to} min={catalog.meta.period.from} max={catalog.meta.period.to} onChange={setPeriod} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <YearSelect value={from} min={catalog.meta.period.from} max={to - 9} onChange={(v) => setPeriod(v, Math.max(v + 9, to))} label="с" />
                  <YearSelect value={to} min={from + 9} max={catalog.meta.period.to} onChange={(v) => setPeriod(Math.min(v - 9, from), v)} label="по" />
                  <span className="text-[10px] text-slate-600">{L(locale, "минимум 10 лет для теста", "at least 10 years for the test")}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  ["Вывод простыми словами", "направление, скорость, значимость"],
                  ["График с линией Сена", "месячный ряд + годовые точки + 95% ДИ"],
                  ["Блок «Подробнее»", "p, q, τ, метод, пропуски, источник"],
                  ["Цепочка гипотез", "согласуется / противоречит / нет данных"],
                ].map(([t, d]) => (
                  <div key={t} className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aurora-300" />
                    <div>
                      <div className="text-[11px] font-medium text-slate-200">{t}</div>
                      <div className="text-[9px] text-slate-500">{d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={start} className="btn-primary flex-1">
                  {L(locale, "Запустить анализ", "Run the analysis")} <ArrowRight className="h-4 w-4" />
                </button>
                <span className="text-[10px] text-slate-600">{L(locale, "Ссылка сохранит объект, параметр и период.", "The link keeps the object, variable and period.")}</span>
              </div>

              {seriesMeta && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3 text-[10px] text-slate-500">
                  <Database className="h-3 w-3 text-aurora-300" />
                  <span>{seriesMeta.dataset}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-700" />
                  <span>покрытие {Math.round(seriesMeta.coverage * 100)}%</span>
                  <span className="h-1 w-1 rounded-full bg-slate-700" />
                  <span>{seriesMeta.nativeStep === "year" ? "годовой ряд" : "месячный ряд"}</span>
                  <InfoTip label="О покрытии">Доля валидных месяцев (или лет) от ожидаемого числа за выбранный период.</InfoTip>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-200">
                <MapPin className="h-3.5 w-3.5 text-aurora-300" /> {L(locale, "Карта объектов", "Object map")}
              </div>
              <span className="text-[9px] text-slate-600">{mapPoints.length} точек</span>
            </div>
            <KyrgyzstanMap
              markers={[]}
              points={mapPoints}
              selected={objectCode}
              onSelect={chooseObject}
              onPoint={section === "global" ? undefined : handlePoint}
              variant="hero"
              showLabels={false}
              className="rounded-none"
            />
            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-white/[0.06] px-4 py-2 text-[9px] text-slate-400">
              {POINT_TYPES.filter((t) => mapPoints.some((p) => p.type === t.type)).map((t) => (
                <span key={t.type} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                  {L(locale, t.ru, t.en)}
                </span>
              ))}
            </div>
            <div className="border-t border-white/[0.06] px-4 py-2.5 text-[9px] leading-relaxed text-slate-600">
              {section === "global"
                ? L(locale, "Для глобального контекста выберите «Планета Земля» в списке слева.", "For global context, choose “Planet Earth” in the list on the left.")
                : L(locale, "Клик по точке — выбрать объект. Клик по пустой области — ближайшая ячейка сетки.", "Click a point to select an object. Click empty space for the nearest grid cell.")}
            </div>
          </div>

          <div className="panel p-4">
            <div className="label mb-3">{L(locale, "ваш запрос", "your query")}</div>
            <div className="space-y-2.5">
              <SummaryRow label={L(locale, "Раздел", "Section")} value={sectionDef ? L(locale, sectionDef.name, sectionDef.nameEn) : "—"} active={Boolean(sectionDef)} />
              <SummaryRow label={L(locale, "Место", "Place")} value={object ? pickName(locale, object) : "—"} active={Boolean(object)} />
              <SummaryRow label={L(locale, "Параметр", "Variable")} value={variable ? L(locale, variable.name, variable.nameEn) : "—"} active={Boolean(variable)} />
              <SummaryRow label={L(locale, "Период", "Period")} value={`${from}–${to}`} active mono />
            </div>
            {variable && (
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-300">
                  <Database className="h-3 w-3 text-aurora-300" /> {variable.source.name}
                </div>
                <div className="mt-1 text-[9px] leading-relaxed text-slate-500">{variable.dataset}</div>
                <SourceFlags
                  className="mt-2"
                  isProxy={variable.isProxy}
                  isReconstruction={variable.isReconstruction}
                  isRegulated={object?.isRegulated}
                  proxyNote={variable.proxyNote}
                  reconstructionNote={variable.reconstructionNote}
                  regulatedNote={object?.regulatedNote}
                />
              </div>
            )}
            <button type="button" onClick={start} disabled={!object || !variable} className={cn("btn-primary mt-4 w-full", step === 4 && "hidden")}>
              {object && variable ? L(locale, "Запустить анализ", "Run the analysis") : L(locale, "Выберите параметр", "Choose a variable")} <ArrowRight className="h-4 w-4" />
            </button>
            <div className="mt-2 text-center text-[9px] text-slate-600">
              {step === 4 ? L(locale, "Параметры готовы — запускайте анализ слева", "Ready — run the analysis on the left") : `${L(locale, "Шаг", "Step")} ${step} ${L(locale, "из", "of")} 4`}
            </div>
          </div>

          <div className="rounded-2xl border border-aurora-400/15 bg-aurora-400/[0.04] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-aurora-200">
              <Info className="h-3.5 w-3.5" /> {L(locale, "Не знаете, что выбрать?", "Not sure what to choose?")}
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-aurora-100/60">
              Откройте AI-детектива: он видит ваш прогресс и предложит следующий клик.
            </p>
            <Link href="/" className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-aurora-300 hover:text-aurora-200">
              Вернуться к карте явлений <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, active, mono }: { label: string; value: string; active: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={cn("truncate text-[11px] font-medium", active ? "text-slate-200" : "text-slate-600", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}
