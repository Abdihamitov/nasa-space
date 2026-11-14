import type { Confidence, TrendDirection, Variable } from "./types";

export function annualUnit(v: Variable): string {
  if (v.yearlyAgg === "sum" && v.unit === "мм/мес") return "мм/год";
  return v.unit;
}

export function annualUnitEn(v: Variable): string {
  if (v.yearlyAgg === "sum" && v.unit === "мм/мес") return "mm/year";
  if (v.unit === "дней/год") return "days/year";
  return v.unit;
}

export function slopeUnitEn(v: Variable): string {
  if (v.unit === "%") return "pp/year";
  if (v.unit === "мм/мес") return "mm/year";
  if (v.unit === "м") return "cm/year";
  if (v.unit === "индекс") return "index/year";
  if (v.unit === "дней/год") return "days/year";
  if (v.unit === "ppm") return "ppm/year";
  return `${v.unit}/year`;
}

export function changeUnitEn(v: Variable): string {
  if (v.unit === "м") return "cm";
  if (v.unit === "мм/мес") return "mm";
  if (v.unit === "дней/год") return "days";
  if (v.unit === "%") return "pp";
  if (v.unit === "индекс") return "index";
  return v.unit;
}

export function unitEn(v: Variable): string {
  if (v.unit === "мм/мес") return "mm/month";
  if (v.unit === "м") return "m";
  if (v.unit === "см") return "cm";
  if (v.unit === "дней/год") return "days/year";
  if (v.unit === "индекс") return "index";
  return v.unit;
}

export function slopeUnit(v: Variable): string {
  if (v.unit === "%") return "п.п./год";
  if (v.unit === "мм/мес") return "мм/год";
  if (v.unit === "м") return "см/год";
  if (v.unit === "индекс") return "индекса/год";
  if (v.unit === "дней/год") return "дней/год";
  if (v.unit === "ppm") return "ppm/год";
  return `${v.unit}/год`;
}

export function changeUnit(v: Variable): string {
  if (v.unit === "м") return "см";
  if (v.unit === "мм/мес") return "мм";
  if (v.unit === "дней/год") return "дней";
  if (v.unit === "%") return "п.п.";
  if (v.unit === "индекс") return "индекса";
  return v.unit;
}

export function slopeDisplayScale(v: Variable): number {
  return v.unit === "м" ? 100 : 1;
}

export function slopePrecision(value: number, v: Variable): number {
  const scaled = Math.abs(value) * slopeDisplayScale(v);
  if (!Number.isFinite(scaled) || scaled === 0) return 2;
  if (scaled < 0.001) return 5;
  if (scaled < 0.01) return 4;
  if (scaled < 0.1) return 3;
  if (scaled < 1) return 2;
  return 1;
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  let d = digits;
  if (abs >= 1000) d = 0;
  else if (abs >= 100) d = Math.min(d, 1);
  else if (abs >= 10) d = Math.min(d, 2);
  else if (abs > 0 && abs < 0.01) d = Math.max(d, 3);
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

export function formatNumberEn(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  let d = digits;
  if (abs >= 1000) d = 0;
  else if (abs >= 100) d = Math.min(d, 1);
  else if (abs >= 10) d = Math.min(d, 2);
  else if (abs > 0 && abs < 0.01) d = Math.max(d, 3);
  return value.toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

export function formatP(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 0.001) return "< 0,001";
  return p.toLocaleString("ru-RU", { maximumFractionDigits: 3, minimumFractionDigits: 3 });
}

export function formatPEn(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 0.001) return "< 0.001";
  return p.toLocaleString("en-US", { maximumFractionDigits: 3, minimumFractionDigits: 3 });
}

export function formatPStatementEn(label: string, p: number): string {
  if (!Number.isFinite(p)) return `${label} = —`;
  return p < 0.001 ? `${label} < 0.001` : `${label} = ${formatPEn(p)}`;
}

export function formatSignedEn(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const s = formatNumberEn(Math.abs(value), digits);
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${s}`;
}

export function formatPStatement(label: string, p: number): string {
  if (!Number.isFinite(p)) return `${label} = —`;
  return p < 0.001 ? `${label} < 0,001` : `${label} = ${formatP(p)}`;
}

export function formatSigned(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const s = formatNumber(Math.abs(value), digits);
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${s}`;
}

export function periodLabel(from: number, to: number): string {
  return `${from}–${to}`;
}

export function getDirectionLabel(direction: TrendDirection): string {
  if (direction === "rising") return "Рост";
  if (direction === "falling") return "Снижение";
  return "Тренда нет";
}

export function getConfidenceLabel(confidence: Confidence): string {
  if (confidence === "confident") return "уверенный";
  if (confidence === "weak") return "слабый";
  if (confidence === "insufficient") return "недостаточно данных";
  return "не выявлен";
}

export function getConfidenceColor(confidence: Confidence): string {
  if (confidence === "confident") return "text-aurora-300";
  if (confidence === "weak") return "text-solar-300";
  if (confidence === "insufficient") return "text-slate-400";
  return "text-slate-400";
}

export function getDirectionLabelEn(direction: TrendDirection): string {
  if (direction === "rising") return "Rising";
  if (direction === "falling") return "Falling";
  return "No trend";
}

export function getConfidenceLabelEn(confidence: Confidence): string {
  if (confidence === "confident") return "confident";
  if (confidence === "weak") return "weak";
  if (confidence === "insufficient") return "not enough data";
  return "not found";
}

const MONTH_NAMES = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function monthName(month: number): string {
  return MONTH_NAMES[(month - 1 + 12) % 12];
}

export function sectionLabel(code: string): string {
  if (code === "water") return "Вода";
  if (code === "snow") return "Снег и лёд";
  if (code === "climate") return "Климат";
  if (code === "vegetation") return "Растительность";
  if (code === "global") return "Глобальный контекст";
  return code;
}

export function sectionLabelEn(code: string): string {
  if (code === "water") return "Water";
  if (code === "snow") return "Snow & ice";
  if (code === "climate") return "Climate";
  if (code === "vegetation") return "Vegetation";
  if (code === "global") return "Global context";
  return code;
}
