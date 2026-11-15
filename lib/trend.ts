import {
  getObject,
  getObjectsWithVariable,
  getSeries,
  getSeriesIndex,
  getVariable,
  getPeriodBounds,
} from "./catalog";
import {
  benjaminiHochberg,
  hamedRao,
  mannKendall,
  seasonalMannKendall,
  senSlope,
  yearsToSignificance,
} from "./stats";
import {
  annualUnit,
  annualUnitEn,
  changeUnit,
  changeUnitEn,
  formatNumber,
  formatNumberEn,
  formatP,
  formatPEn,
  formatPStatement,
  formatPStatementEn,
  formatSigned,
  formatSignedEn,
  getConfidenceColor,
  getConfidenceLabel,
  getDirectionLabel,
  monthName,
  periodLabel,
  slopeDisplayScale,
  slopePrecision,
  slopeUnit,
  slopeUnitEn,
  unitEn,
} from "./format";
import { LruCache } from "./lru";
import type {
  AnnualPoint,
  CatalogObject,
  Confidence,
  Series,
  TrendDirection,
  TrendPayload,
  TrendStats,
  Variable,
} from "./types";

export {
  annualUnit,
  annualUnitEn,
  changeUnit,
  changeUnitEn,
  formatNumber,
  formatNumberEn,
  formatP,
  formatPEn,
  formatPStatement,
  formatSigned,
  formatSignedEn,
  getConfidenceColor,
  getConfidenceLabel,
  getDirectionLabel,
  monthName,
  periodLabel,
  slopeDisplayScale,
  slopePrecision,
  slopeUnit,
  slopeUnitEn,
  unitEn,
};

export function clampPeriod(
  fromRaw?: string | number | null,
  toRaw?: string | number | null,
): { from: number; to: number } {
  const bounds = getPeriodBounds();
  const fromNum =
    fromRaw === null || fromRaw === undefined || fromRaw === "" ? Number.NaN : Number(fromRaw);
  const toNum = toRaw === null || toRaw === undefined || toRaw === "" ? Number.NaN : Number(toRaw);
  let from = Number.isFinite(fromNum) ? Math.round(fromNum) : bounds.from;
  let to = Number.isFinite(toNum) ? Math.round(toNum) : bounds.to;
  from = Math.max(bounds.from, Math.min(bounds.to, from));
  to = Math.max(bounds.from, Math.min(bounds.to, to));
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

export function parseDate(date: string): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) || 1 };
}

function expectedMonths(v: Variable): number {
  return v.seasonMonths?.length ?? 12;
}

function minMonths(v: Variable): number {
  return Math.max(2, Math.ceil(expectedMonths(v) * 0.75));
}

export function monthlySlice(series: Series, from: number, to: number) {
  return series.points
    .filter(([date]) => {
      const y = Number(date.slice(0, 4));
      return y >= from && y <= to;
    })
    .map(([date, value, quality]) => ({ date, value, quality }));
}

export function aggregateAnnual(
  series: Series,
  variable: Variable,
  from: number,
  to: number,
): AnnualPoint[] {
  if (series.nativeStep === "year") {
    return series.points
      .filter(([date]) => {
        const y = Number(date.slice(0, 4));
        return y >= from && y <= to;
      })
      .map(([date, value, quality]) => ({
        year: Number(date.slice(0, 4)),
        value,
        nMonths: 12,
        quality,
      }));
  }
  const groups = new Map<number, { values: number[]; quality: string[] }>();
  const season = variable.seasonMonths;
  for (const [date, value, quality] of series.points) {
    const { year, month } = parseDate(date);
    if (year < from || year > to) continue;
    if (season && !season.includes(month)) continue;
    const g = groups.get(year) ?? { values: [], quality: [] };
    g.values.push(value);
    g.quality.push(quality);
    groups.set(year, g);
  }
  const min = minMonths(variable);
  const out: AnnualPoint[] = [];
  for (const [year, g] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    if (g.values.length < min) continue;
    let value: number;
    if (variable.yearlyAgg === "sum") value = g.values.reduce((a, b) => a + b, 0);
    else if (variable.yearlyAgg === "max") value = Math.max(...g.values);
    else value = g.values.reduce((a, b) => a + b, 0) / g.values.length;
    const quality = g.quality.every((q) => q === "ok" || q === "reconstructed") ? g.quality[0] ?? "ok" : "outlier";
    out.push({ year, value, nMonths: g.values.length, quality });
  }
  return out;
}

function confidenceFromP(p: number): Confidence {
  if (!Number.isFinite(p)) return "insufficient";
  if (p < 0.05) return "confident";
  if (p < 0.1) return "weak";
  return "none";
}

function directionFromSlope(slope: number, confidence: Confidence): TrendDirection {
  if (confidence === "none" || confidence === "insufficient") return "flat";
  if (slope > 0) return "rising";
  if (slope < 0) return "falling";
  return "flat";
}

const PHRASES: Record<string, { noun: string; genitive: string; up: string; down: string }> = {
  t2m: { noun: "Температура воздуха", genitive: "температуры воздуха", up: "растёт", down: "снижается" },
  precip: { noun: "Сумма осадков", genitive: "осадков", up: "растёт", down: "снижается" },
  soil_moisture: { noun: "Влажность почвы", genitive: "влажности почвы", up: "растёт", down: "снижается" },
  evaporation: { noun: "Испарение", genitive: "испарения", up: "растёт", down: "снижается" },
  snow_depth: { noun: "Глубина снега", genitive: "глубины снега", up: "растёт", down: "снижается" },
  snow_precip: { noun: "Осадки в виде снега", genitive: "снегопада", up: "растут", down: "снижаются" },
  snow_cover: { noun: "Доля снежного покрова", genitive: "снежного покрова", up: "растёт", down: "снижается" },
  snow_days: { noun: "Длительность снежного сезона", genitive: "длительности снежного сезона", up: "растёт", down: "сокращается" },
  ndvi: { noun: "NDVI", genitive: "NDVI", up: "растёт", down: "снижается" },
  lake_level: { noun: "Уровень озера", genitive: "уровня озера", up: "растёт", down: "снижается" },
  global_temp: { noun: "Глобальная аномалия температуры", genitive: "глобальной аномалии температуры", up: "растёт", down: "снижается" },
  co2: { noun: "Концентрация CO₂", genitive: "концентрации CO₂", up: "растёт", down: "снижается" },
};

function placePhrase(object: CatalogObject): string {
  if (object.isGlobal) return "на планете";
  if (object.isGrid) return `в точке ${object.lat.toFixed(1)}° с.ш., ${object.lon.toFixed(1)}° в.д.`;
  if (object.type === "region" || object.type === "city") return `в регионе «${object.name}»`;
  return `в районе «${object.name}»`;
}

function qText(q: number | null): string {
  if (q === null || !Number.isFinite(q)) return "";
  return q < 0.001 ? "; q (FDR) < 0,001" : `; q (FDR) = ${formatP(q)}`;
}

export function buildSummary(
  object: CatalogObject,
  variable: Variable,
  stats: Pick<TrendStats, "confidence" | "p" | "q" | "senSlope" | "changeOverPeriod" | "nYears">,
  from: number,
  to: number,
): string {
  const phrase = PHRASES[variable.code] ?? { noun: variable.name, genitive: variable.name, up: "растёт", down: "снижается" };
  const scale = slopeDisplayScale(variable);
  const sp = slopePrecision(stats.senSlope, variable);
  const slopeAbs = formatNumber(Math.abs(stats.senSlope) * scale, sp);
  const changeAbs = formatNumber(Math.abs(stats.changeOverPeriod) * scale, sp);
  const unit = slopeUnit(variable);
  const changeUnitLabel = changeUnit(variable);
  const place = placePhrase(object);
  const period = periodLabel(from, to);

  if (stats.confidence === "insufficient") {
    return `Недостаточно данных, чтобы проверить тренд ${phrase.genitive} ${place} за ${period}. Нужно минимум 10 валидных лет, есть ${stats.nYears}.`;
  }

  if (stats.confidence === "none") {
    return `${place.charAt(0).toUpperCase() + place.slice(1)} за ${period} не выявлено устойчивого тренда ${phrase.genitive}. Оценка наклона Сена — ${slopeAbs} ${unit}, но она статистически неотличима от нуля (${formatPStatement("p", stats.p)}${qText(stats.q)}). Это не значит, что изменений нет: они могут быть нелинейными или требовать более длинного ряда.`;
  }

  const verb = stats.senSlope >= 0 ? phrase.up : phrase.down;
  const significance =
    stats.confidence === "confident"
      ? `Тренд статистически значим: ${formatPStatement("p", stats.p)}${qText(stats.q)}.`
      : `Признаки слабые: ${formatPStatement("p", stats.p)}${qText(stats.q)}; вывод осторожный.`;

  return `${phrase.noun} ${place} за ${period} ${verb} в среднем на ${slopeAbs} ${unit}. ${significance} За весь период изменение составило около ${changeAbs} ${changeUnitLabel}.`;
}

export function buildDetail(
  variable: Variable,
  stats: TrendStats,
  from: number,
  to: number,
  dataset: string,
): string {
  const parts = [
    `Метод: ${stats.method}.`,
    `Годовых значений: ${stats.nYears}; пропусков: ${(stats.missingShare * 100).toFixed(0)} %.`,
    `S = ${formatNumber(stats.s, 0)}; τ Кендалла = ${formatNumber(stats.tau, 3)}; ${formatPStatement("p", stats.p)}${stats.q !== null ? `; ${formatPStatement("q", stats.q)}` : ""}.`,
    `Наклон Сена: ${formatSigned(stats.senSlope * slopeDisplayScale(variable), slopePrecision(stats.senSlope, variable))} ${slopeUnit(variable)}${stats.slopeCi ? ` (95 % ДИ: ${formatSigned(stats.slopeCi.lower * slopeDisplayScale(variable), slopePrecision(stats.slopeCi.lower, variable))} … ${formatSigned(stats.slopeCi.upper * slopeDisplayScale(variable), slopePrecision(stats.slopeCi.upper, variable))})` : ""}.`,
  ];
  if (stats.seasonalP !== null) {
    parts.push(`Сезонный MK (месячные данные): ${formatPStatement("p", stats.seasonalP)}.`);
  }
  if (stats.hamedRaoApplied) {
    parts.push(`Поправка Хамеда–Рао применена: автокорреляция r₁ = ${formatNumber(stats.autocorrelation, 2)}.`);
  }
  parts.push(`Период: ${from}–${to}. Набор: ${dataset}.`);
  return parts.join(" ");
}

export function buildCaveat(
  object: CatalogObject,
  variable: Variable,
  stats: TrendStats,
): string {
  const notes: string[] = [
    "Тренд — статистическая оценка направления, а не доказательство причины. Он зависит от выбранного периода.",
  ];
  if (variable.isReconstruction) {
    notes.push(
      variable.reconstructionNote ??
        "Ряд является реконструкцией по опубликованным данным, а не сырыми наблюдениями.",
    );
  }
  if (object.isRegulated) {
    notes.push(
      object.regulatedNote ??
        "Объект регулируемый: ряд отражает режим управления, а не только климат.",
    );
  }
  if (object.isGrid) {
    notes.push("Это сеточная точка: анализ идёт по ближайшей ячейке NASA POWER, а не по границам объекта или бассейна.");
  }
  if (variable.isProxy) {
    notes.push(variable.proxyNote ?? "Это косвенный показатель, а не прямое измерение.");
  }
  if (object.type === "glacier") {
    notes.push("MODIS видит сезонный снежный покров, а не массу ледника. Выводы о массе льда по этим данным делать нельзя.");
  }
  if (variable.code === "ndvi") {
    notes.push("NDVI — индекс зелёности, а не биомасса или продуктивность экосистемы.");
  }
  if (variable.code === "global_temp" || variable.code === "co2") {
    notes.push("Глобальный ряд — контекст для сопоставления, а не объяснение местного тренда.");
  }
  if (stats.confidence === "weak") {
    notes.push("p находится между 0,05 и 0,10: это лишь слабые признаки, а не уверенный вывод.");
  }
  if (stats.confidence === "none") {
    notes.push("Отсутствие значимого линейного тренда не означает отсутствия изменений: возможны нелинейные сдвиги и короткие эпизоды.");
  }
  return notes.join(" ");
}

const PHRASES_EN: Record<string, { noun: string; up: string; down: string }> = {
  t2m: { noun: "Air temperature", up: "is rising", down: "is falling" },
  precip: { noun: "Precipitation", up: "is rising", down: "is falling" },
  soil_moisture: { noun: "Soil moisture", up: "is rising", down: "is falling" },
  evaporation: { noun: "Evaporation", up: "is rising", down: "is falling" },
  snow_depth: { noun: "Snow depth", up: "is increasing", down: "is decreasing" },
  snow_precip: { noun: "Snowfall", up: "is increasing", down: "is decreasing" },
  snow_days: { noun: "Snow-season length", up: "is lengthening", down: "is shortening" },
  lake_level: { noun: "Lake level", up: "is rising", down: "is falling" },
  global_temp: { noun: "Global temperature anomaly", up: "is rising", down: "is falling" },
  co2: { noun: "CO₂ concentration", up: "is rising", down: "is falling" },
};

function placePhraseEn(object: CatalogObject): string {
  if (object.isGlobal) return "on the planet";
  if (object.isGrid) return `at ${object.lat.toFixed(1)}°N, ${object.lon.toFixed(1)}°E`;
  if (object.type === "region") return `in ${object.nameEn}`;
  if (object.type === "city") return `in ${object.nameEn}`;
  return `in the ${object.nameEn} area`;
}

function qTextEn(q: number | null): string {
  if (q === null || !Number.isFinite(q)) return "";
  return q < 0.001 ? "; q (FDR) < 0.001" : `; q (FDR) = ${formatPEn(q)}`;
}

export function buildSummaryEn(
  object: CatalogObject,
  variable: Variable,
  stats: Pick<TrendStats, "confidence" | "p" | "q" | "senSlope" | "changeOverPeriod" | "nYears">,
  from: number,
  to: number,
): string {
  const phrase = PHRASES_EN[variable.code] ?? { noun: variable.nameEn, up: "is rising", down: "is falling" };
  const scale = slopeDisplayScale(variable);
  const sp = slopePrecision(stats.senSlope, variable);
  const slopeAbs = formatNumberEn(Math.abs(stats.senSlope) * scale, sp);
  const changeAbs = formatNumberEn(Math.abs(stats.changeOverPeriod) * scale, sp);
  const unit = slopeUnitEn(variable);
  const changeUnitLabel = changeUnitEn(variable);
  const place = placePhraseEn(object);
  const period = periodLabel(from, to);
  const noun = phrase.noun.toLowerCase();

  if (stats.confidence === "insufficient") {
    return `Not enough data to test the trend of ${noun} ${place} over ${period}. At least 10 valid years are required; found ${stats.nYears}.`;
  }

  if (stats.confidence === "none") {
    return `${place.charAt(0).toUpperCase() + place.slice(1)} over ${period}, no stable trend in ${noun} was found. Sen's slope is ${slopeAbs} ${unit}, but it is statistically indistinguishable from zero (${formatPStatementEn("p", stats.p)}${qTextEn(stats.q)}). This does not mean nothing changed: changes may be non-linear or require a longer record.`;
  }

  const verb = stats.senSlope >= 0 ? phrase.up : phrase.down;
  const significance =
    stats.confidence === "confident"
      ? `The trend is statistically significant: ${formatPStatementEn("p", stats.p)}${qTextEn(stats.q)}.`
      : `The evidence is weak: ${formatPStatementEn("p", stats.p)}${qTextEn(stats.q)}; treat the conclusion with caution.`;

  return `${phrase.noun} ${place} over ${period} ${verb} by about ${slopeAbs} ${unit}. ${significance} Over the period the change was about ${changeAbs} ${changeUnitLabel}.`;
}

export function buildDetailEn(
  variable: Variable,
  stats: TrendStats,
  from: number,
  to: number,
  dataset: string,
): string {
  const sp = (v: number) => slopePrecision(v, variable);
  const scale = slopeDisplayScale(variable);
  const parts = [
    `Method: ${stats.method}.`,
    `Annual values: ${stats.nYears}; missing: ${(stats.missingShare * 100).toFixed(0)}%.`,
    `S = ${formatNumberEn(stats.s, 0)}; Kendall τ = ${formatNumberEn(stats.tau, 3)}; ${formatPStatementEn("p", stats.p)}${stats.q !== null ? `; ${formatPStatementEn("q", stats.q)}` : ""}.`,
    `Sen slope: ${formatSignedEn(stats.senSlope * scale, sp(stats.senSlope))} ${slopeUnitEn(variable)}${stats.slopeCi ? ` (95% CI: ${formatSignedEn(stats.slopeCi.lower * scale, sp(stats.slopeCi.lower))} … ${formatSignedEn(stats.slopeCi.upper * scale, sp(stats.slopeCi.upper))})` : ""}.`,
  ];
  if (stats.seasonalP !== null) {
    parts.push(`Seasonal MK (monthly data): ${formatPStatementEn("p", stats.seasonalP)}.`);
  }
  if (stats.hamedRaoApplied) {
    parts.push(`Hamed–Rao correction applied: rank autocorrelation r₁ = ${formatNumberEn(stats.autocorrelation, 2)}.`);
  }
  parts.push(`Period: ${from}–${to}. Dataset: ${dataset}.`);
  return parts.join(" ");
}

export function buildCaveatEn(object: CatalogObject, variable: Variable, stats: TrendStats): string {
  const notes: string[] = [
    "A trend is a statistical estimate of direction, not proof of causation. It depends on the chosen period.",
  ];
  if (variable.isReconstruction) {
    notes.push("This series is a reconstruction from published values and rates, not raw observations.");
  }
  if (object.isRegulated) {
    notes.push("This object is regulated: the series reflects management as well as climate.");
  }
  if (object.isGrid) {
    notes.push("This is a grid point: the analysis uses the nearest NASA POWER cell, not object or basin boundaries.");
  }
  if (variable.isProxy) {
    notes.push("This is an indirect indicator, not a direct measurement.");
  }
  if (object.type === "glacier") {
    notes.push("MODIS sees seasonal snow cover, not glacier mass. Do not infer ice-mass change from these data.");
  }
  if (variable.code === "ndvi") {
    notes.push("NDVI is a greenness index, not biomass or ecosystem productivity.");
  }
  if (variable.code === "global_temp" || variable.code === "co2") {
    notes.push("A global series is context for comparison, not an explanation of the local trend.");
  }
  if (stats.confidence === "weak") {
    notes.push("p is between 0.05 and 0.10: this is weak evidence, not a confident conclusion.");
  }
  if (stats.confidence === "none") {
    notes.push("No significant linear trend does not mean no change: non-linear shifts and short episodes are possible.");
  }
  return notes.join(" ");
}

export function computeTrendStats(
  series: Series,
  variable: Variable,
  annual: AnnualPoint[],
  monthly: { date: string; value: number; quality: string }[],
  from: number,
  to: number,
  q: number | null,
  options: { projection?: boolean } = {},
): TrendStats {
  const nYears = annual.length;
  const expectedYears = to - from + 1;
  const expectedMonthsCount = expectedYears * expectedMonths(variable);
  const expectedCount = series.nativeStep === "year" ? expectedYears : expectedMonthsCount;
  const validCount = series.nativeStep === "year" ? nYears : monthly.length;
  const missingShare = Math.max(0, Math.min(1, 1 - validCount / Math.max(1, expectedCount)));
  const coverage = 1 - missingShare;

  if (nYears < 10) {
    const stats: TrendStats = {
      direction: "flat",
      confidence: "insufficient",
      p: Number.NaN,
      q: null,
      tau: Number.NaN,
      s: 0,
      z: 0,
      senSlope: Number.NaN,
      slopeCi: null,
      intercept: Number.NaN,
      nYears,
      nMonths: monthly.length,
      missingShare,
      coverage,
      method: "Mann–Kendall",
      seasonalP: null,
      seasonalMethod: null,
      autocorrelation: 0,
      hamedRaoApplied: false,
      changeOverPeriod: Number.NaN,
      yearsToSignificance: null,
      summary: "",
      summaryEn: "",
      detail: "",
      detailEn: "",
      caveat: "",
      caveatEn: "",
    };
    return stats;
  }

  const years = annual.map((p) => p.year);
  const values = annual.map((p) => p.value);
  const mk = mannKendall(values);
  const sen = senSlope(years, values, mk.varS);
  const hr = hamedRao(values, mk, sen.slope);
  const confidence = confidenceFromP(hr.p);
  const direction = directionFromSlope(sen.slope, confidence);

  let seasonalP: number | null = null;
  let seasonalMethod: string | null = null;
  if (series.nativeStep === "month") {
    const byMonth = new Map<number, number[]>();
    for (const m of monthly) {
      const month = Number(m.date.slice(5, 7));
      const arr = byMonth.get(month) ?? [];
      arr.push(m.value);
      byMonth.set(month, arr);
    }
    const smk = seasonalMannKendall(byMonth);
    if (Number.isFinite(smk.p)) {
      seasonalP = smk.p;
      seasonalMethod = smk.method;
    }
  }

  const changeOverPeriod = sen.slope * (years[years.length - 1] - years[0]);
  // The Monte-Carlo projection is the most expensive part of the analysis and
  // is only shown on the single-object analysis view.
  const yts =
    confidence === "confident" || !options.projection
      ? null
      : yearsToSignificance(years, values, sen.slope, sen.intercept, hr.p);

  const stats: TrendStats = {
    direction,
    confidence,
    p: hr.p,
    q,
    tau: hr.tau,
    s: hr.s,
    z: hr.z,
    senSlope: sen.slope,
    slopeCi: sen.lower !== null && sen.upper !== null ? { lower: sen.lower, upper: sen.upper } : null,
    intercept: sen.intercept,
    nYears,
    nMonths: monthly.length,
    missingShare,
    coverage,
    method: hr.method,
    seasonalP,
    seasonalMethod,
    autocorrelation: hr.r1,
    hamedRaoApplied: hr.applied,
    changeOverPeriod,
    yearsToSignificance: yts,
    summary: "",
    summaryEn: "",
    detail: "",
    detailEn: "",
    caveat: "",
    caveatEn: "",
  };
  return stats;
}

// Cache q-value scans briefly (per server instance).
const qCache = new Map<string, Map<string, number | null>>();

export function computeQScan(variable: string, from: number, to: number): Map<string, number | null> {
  const key = `${variable}|${from}|${to}`;
  const cached = qCache.get(key);
  if (cached) return cached;
  const v = getVariable(variable);
  if (!v || v.section === "global") {
    const empty = new Map<string, number | null>();
    qCache.set(key, empty);
    return empty;
  }
  const objects = getObjectsWithVariable(variable);
  const entries: { object: string; p: number }[] = [];
  for (const obj of objects) {
    const s = getSeries(obj.code, variable);
    if (!s) continue;
    const annual = aggregateAnnual(s, v, from, to);
    if (annual.length < 10) continue;
    const monthly = monthlySlice(s, from, to);
    const mk = mannKendall(annual.map((a) => a.value));
    const sen = senSlope(annual.map((a) => a.year), annual.map((a) => a.value), mk.varS);
    const hr = hamedRao(annual.map((a) => a.value), mk, sen.slope);
    entries.push({ object: obj.code, p: hr.p });
  }
  const qs = benjaminiHochberg(entries.map((e) => e.p));
  const map = new Map<string, number | null>();
  entries.forEach((e, i) => map.set(e.object, qs[i]));
  qCache.set(key, map);
  return map;
}

export type AnalyzeOptions = {
  /**
   * Compute the illustrative "years to significance" projection. It costs far
   * more than the rest of the analysis, so it is off by default and only
   * enabled where it is displayed (analysis page, /api/trend).
   */
  projection?: boolean;
};

// Data are static (data/series.json), so a payload depends only on the
// arguments. Cached payloads are shared between callers: treat them as
// read-only and copy before changing anything (see lib/compare.ts).
const analyzeCache = new LruCache<string, TrendPayload>(500);

export function analyzeByCode(
  objectCode: string,
  variableCode: string,
  fromRaw?: string | number | null,
  toRaw?: string | number | null,
  options: AnalyzeOptions = {},
): TrendPayload | null {
  const requested = clampPeriod(fromRaw, toRaw);
  const projection = options.projection ?? false;
  const key = `${objectCode}|${variableCode}|${requested.from}|${requested.to}|${projection ? "p" : "-"}`;
  const cached = analyzeCache.get(key);
  if (cached) return cached;
  const payload = computeAnalysis(objectCode, variableCode, requested, projection);
  // Unknown codes are cheap to reject and would only evict useful entries.
  if (payload) analyzeCache.set(key, payload);
  return payload;
}

function computeAnalysis(
  objectCode: string,
  variableCode: string,
  requested: { from: number; to: number },
  projection: boolean,
): TrendPayload | null {
  const object = getObject(objectCode);
  const variable = getVariable(variableCode);
  if (!object || !variable) return null;
  const series = getSeries(objectCode, variableCode);
  if (!series || series.points.length === 0) return null;

  const firstYear = Number(series.points[0][0].slice(0, 4));
  const lastYear = Number(series.points[series.points.length - 1][0].slice(0, 4));
  const from = Math.max(requested.from, firstYear);
  const to = Math.min(requested.to, lastYear);
  const monthly = monthlySlice(series, from, to);
  const annual = aggregateAnnual(series, variable, from, to);
  const qMap = computeQScan(variableCode, from, to);
  const q = qMap.get(objectCode) ?? null;
  const stats = computeTrendStats(series, variable, annual, monthly, from, to, q, { projection });
  stats.summary = buildSummary(object, variable, stats, from, to);
  stats.summaryEn = buildSummaryEn(object, variable, stats, from, to);
  stats.detail = buildDetail(variable, stats, from, to, series.dataset);
  stats.detailEn = buildDetailEn(variable, stats, from, to, series.dataset);
  stats.caveat = buildCaveat(object, variable, stats);
  stats.caveatEn = buildCaveatEn(object, variable, stats);

  return {
    object,
    variable,
    period: { from, to },
    annual,
    monthly,
    stats,
    source: series.source,
    dataset: series.dataset,
    seriesMeta: getSeriesIndex(objectCode, variableCode),
    qContext: {
      variable: variableCode,
      tests: qMap.size,
      q,
    },
  };
}
