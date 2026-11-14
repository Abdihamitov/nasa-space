import { getObject, getObjectsWithVariable, getVariable } from "./catalog";
import { formatNumberEn, formatPEn, slopeUnitEn } from "./format";
import { analyzeByCode, clampPeriod, formatNumber, formatP, periodLabel, slopeDisplayScale, slopePrecision, slopeUnit } from "./trend";
import { benjaminiHochberg } from "./stats";
import type { CatalogObject, TrendPayload } from "./types";

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
}

export type CompareResult = {
  variable: string;
  period: { from: number; to: number };
  a: TrendPayload;
  b: TrendPayload;
  difference: string;
  differenceEn: string;
  pairType: "opposite" | "fallback" | "manual";
  caveat: string;
  caveatEn: string;
};

function differenceSentence(a: TrendPayload, b: TrendPayload): string {
  const v = a.variable;
  const scale = slopeDisplayScale(v);
  const unit = slopeUnit(v);
  const sa = a.stats.senSlope * scale;
  const sb = b.stats.senSlope * scale;
  const both = a.stats.confidence === "confident" && b.stats.confidence === "confident";
  const opposite = Math.sign(sa) !== Math.sign(sb) && sa !== 0 && sb !== 0;
  if (both && opposite) {
    return `Противоположные значимые тренды: «${a.object.name}» — ${sa > 0 ? "рост" : "снижение"} ${formatNumber(Math.abs(sa), slopePrecision(a.stats.senSlope, v))} ${unit}, «${b.object.name}» — ${sb > 0 ? "рост" : "снижение"} ${formatNumber(Math.abs(sb), slopePrecision(b.stats.senSlope, v))} ${unit}. Разница направлений внутри одной переменной — это и есть региональный контраст.`;
  }
  if (both && !opposite) {
    return `Оба тренда значимы и однонаправлены: «${a.object.name}» — ${formatNumber(sa, slopePrecision(a.stats.senSlope, v))} ${unit}, «${b.object.name}» — ${formatNumber(sb, slopePrecision(b.stats.senSlope, v))} ${unit}. Контраста по знаку нет, но скорость различается.`;
  }
  return `Пара не даёт уверенного контраста: значимость есть не у обоих объектов (p = ${formatP(a.stats.p)} и ${formatP(b.stats.p)}). Смотрите на таблицу ниже: возможно, более сильный контраст даст другая пара.`;
}

function differenceSentenceEn(a: TrendPayload, b: TrendPayload): string {
  const v = a.variable;
  const scale = slopeDisplayScale(v);
  const unit = slopeUnitEn(v);
  const sa = a.stats.senSlope * scale;
  const sb = b.stats.senSlope * scale;
  const both = a.stats.confidence === "confident" && b.stats.confidence === "confident";
  const opposite = Math.sign(sa) !== Math.sign(sb) && sa !== 0 && sb !== 0;
  if (both && opposite) {
    return `Opposite significant trends: ${a.object.nameEn} is ${sa > 0 ? "rising" : "falling"} by ${formatNumberEn(Math.abs(sa), slopePrecision(a.stats.senSlope, v))} ${unit}, while ${b.object.nameEn} is ${sb > 0 ? "rising" : "falling"} by ${formatNumberEn(Math.abs(sb), slopePrecision(b.stats.senSlope, v))} ${unit}. Opposite directions within the same variable are the regional contrast.`;
  }
  if (both && !opposite) {
    return `Both trends are significant and point in the same direction: ${a.object.nameEn} ${formatNumberEn(sa, slopePrecision(a.stats.senSlope, v))} ${unit}, ${b.object.nameEn} ${formatNumberEn(sb, slopePrecision(b.stats.senSlope, v))} ${unit}. There is no sign contrast, but the rates differ.`;
  }
  return `The pair does not give a confident contrast: not both objects are significant (p = ${formatPEn(a.stats.p)} and ${formatPEn(b.stats.p)}). Check the table below — another pair may be stronger.`;
}

export function buildCompare(
  variableCode: string,
  aCode: string,
  bCode: string,
  fromRaw?: string | number | null,
  toRaw?: string | number | null,
): CompareResult | null {
  const variable = getVariable(variableCode);
  const aObj = getObject(aCode);
  const bObj = getObject(bCode);
  if (!variable || !aObj || !bObj || aCode === bCode) return null;
  const period = clampPeriod(fromRaw, toRaw);
  const a = analyzeByCode(aCode, variableCode, period.from, period.to);
  const b = analyzeByCode(bCode, variableCode, period.from, period.to);
  if (!a || !b) return null;
  return {
    variable: variableCode,
    period,
    a,
    b,
    difference: differenceSentence(a, b),
    differenceEn: differenceSentenceEn(a, b),
    pairType: "manual",
    caveat:
      "Сравнение показывает разные направления тренда, но не объясняет их причину. Разные высоты, типы поверхности и качество данных могут влиять на результат.",
    caveatEn:
      "The comparison shows different trend directions but does not explain their cause. Elevation, surface type and data quality can affect the result.",
  };
}

export function autoCompare(
  variableCode: string,
  fromRaw?: string | number | null,
  toRaw?: string | number | null,
  type?: string | null,
): CompareResult | null {
  const variable = getVariable(variableCode);
  if (!variable) return null;
  const period = clampPeriod(fromRaw, toRaw);
  let objects = getObjectsWithVariable(variableCode).filter((o) => !o.isGrid && !o.isGlobal);
  if (type) objects = objects.filter((o) => o.type === type);
  if (objects.length < 2) return null;

  const payloads: { object: CatalogObject; payload: TrendPayload; norm: number; sd: number }[] = [];
  for (const object of objects) {
    const payload = analyzeByCode(object.code, variableCode, period.from, period.to);
    if (!payload) continue;
    const sd = std(payload.annual.map((p) => p.value));
    const norm = sd > 0 ? payload.stats.senSlope / sd : 0;
    payloads.push({ object, payload, norm, sd });
  }
  if (payloads.length < 2) return null;

  // FDR across the scan
  const qs = benjaminiHochberg(payloads.map((p) => p.payload.stats.p));
  payloads.forEach((p, i) => {
    p.payload.stats.q = qs[i];
    p.payload.qContext = { variable: variableCode, tests: payloads.length, q: qs[i] };
  });

  const confident = payloads.filter((p) => p.payload.stats.confidence === "confident");
  let best: { a: (typeof payloads)[number]; b: (typeof payloads)[number]; score: number } | null = null;
  for (let i = 0; i < confident.length - 1; i++) {
    for (let j = i + 1; j < confident.length; j++) {
      const a = confident[i];
      const b = confident[j];
      if (Math.sign(a.payload.stats.senSlope) === Math.sign(b.payload.stats.senSlope)) continue;
      if (a.payload.stats.senSlope === 0 || b.payload.stats.senSlope === 0) continue;
      const score = Math.abs(a.norm - b.norm);
      if (!best || score > best.score) best = { a, b, score };
    }
  }

  if (best) {
    return {
      variable: variableCode,
      period,
      a: best.a.payload,
      b: best.b.payload,
      difference: differenceSentence(best.a.payload, best.b.payload),
      differenceEn: differenceSentenceEn(best.a.payload, best.b.payload),
      pairType: "opposite",
      caveat:
        "Пара выбрана автоматически среди объектов с значимыми противоположными трендами; применена FDR-поправка на множественные сравнения. Это не доказательство причины.",
      caveatEn:
        "The pair was selected automatically among objects with significant opposite trends; FDR correction was applied. This is not proof of causation.",
    };
  }

  // Fallback: fastest trend vs most stable object
  const sorted = [...payloads].sort((a, b) => Math.abs(b.norm) - Math.abs(a.norm));
  const fastest = sorted[0];
  const stable = [...payloads]
    .filter((p) => p.object.code !== fastest.object.code)
    .sort((a, b) => Math.abs(a.norm) - Math.abs(b.norm))[0];
  if (!fastest || !stable) return null;
  return {
    variable: variableCode,
    period,
    a: fastest.payload,
    b: stable.payload,
    difference:
      `Автоподбор не нашёл пары с значимыми противоположными трендами. Показана честная альтернатива: самый сильный тренд («${fastest.object.name}») и самый стабильный объект («${stable.object.name}»). ` +
      differenceSentence(fastest.payload, stable.payload),
    differenceEn:
      `Auto-selection found no pair with significant opposite trends. Showing an honest alternative: the strongest trend (${fastest.object.nameEn}) and the most stable object (${stable.object.nameEn}). ` +
      differenceSentenceEn(fastest.payload, stable.payload),
    pairType: "fallback",
    caveat:
      "Fallback-пара не является контрастом противоположных трендов. Это самый сильный сигнал и самый стабильный объект; подпись честно указывает на это.",
    caveatEn:
      "The fallback pair is not a contrast of opposite trends. It is the strongest signal and the most stable object; the label says so honestly.",
  };
}

export type TrendTableRow = {
  object: CatalogObject;
  payload: TrendPayload;
  norm: number;
  q: number | null;
};

export function buildTrendTable(
  variableCode: string,
  fromRaw?: string | number | null,
  toRaw?: string | number | null,
  type?: string | null,
): { variable: string; period: { from: number; to: number }; rows: TrendTableRow[]; tests: number } | null {
  const variable = getVariable(variableCode);
  if (!variable) return null;
  const period = clampPeriod(fromRaw, toRaw);
  let objects = getObjectsWithVariable(variableCode).filter((o) => !o.isGrid && !o.isGlobal);
  if (type) objects = objects.filter((o) => o.type === type);
  const payloads: { object: CatalogObject; payload: TrendPayload; sd: number }[] = [];
  for (const object of objects) {
    const payload = analyzeByCode(object.code, variableCode, period.from, period.to);
    if (payload) payloads.push({ object, payload, sd: std(payload.annual.map((p) => p.value)) });
  }
  const qs = benjaminiHochberg(payloads.map((p) => p.payload.stats.p));
  const rows: TrendTableRow[] = payloads.map((p, i) => {
    p.payload.stats.q = qs[i];
    p.payload.qContext = { variable: variableCode, tests: payloads.length, q: qs[i] };
    return {
      object: p.object,
      payload: p.payload,
      norm: p.sd > 0 ? p.payload.stats.senSlope / p.sd : 0,
      q: qs[i],
    };
  });
  rows.sort((a, b) => Math.abs(b.norm) - Math.abs(a.norm));
  return { variable: variableCode, period, rows, tests: payloads.length };
}

export function compareSummaryLine(result: CompareResult): string {
  return `${result.variable}: ${periodLabel(result.period.from, result.period.to)}. ${result.difference}`;
}
