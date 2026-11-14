import { apiError, getParam } from "@/lib/api";
import { getObject, getVariable } from "@/lib/catalog";
import { analyzeByCode, annualUnit, annualUnitEn, clampPeriod, formatP, formatPEn, slopeDisplayScale, slopeUnit, slopeUnitEn, unitEn } from "@/lib/trend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const object = getParam(url, "object");
  const variable = getParam(url, "variable");
  if (!object || !variable) return apiError("bad_request", "Нужны object и variable.");
  if (!getObject(object) || !getVariable(variable)) {
    return apiError("not_found", "Объект или переменная не найдены.", 404);
  }
  const period = clampPeriod(getParam(url, "from"), getParam(url, "to"));
  const en = getParam(url, "lang") === "en";
  const payload = analyzeByCode(object, variable, period.from, period.to);
  if (!payload) return apiError("no_data", "Нет данных для выгрузки.", 404);

  const v = payload.variable;
  const stats = payload.stats;
  const lines: string[] = [];
  const row = (cells: unknown[]) => lines.push(cells.map(csvEscape).join(","));
  const pf = en ? formatPEn : formatP;

  row(["# K2 — Earth System Trend Detective"]);
  row([en ? "# Generated" : "# Сгенерировано", new Date().toISOString()]);
  row([en ? "# Object" : "# Объект", en ? payload.object.nameEn : payload.object.name, payload.object.code]);
  row([en ? "# Variable" : "# Переменная", en ? v.nameEn : v.name, v.code]);
  row([en ? "# Period" : "# Период", `${payload.period.from}-${payload.period.to}`]);
  row([en ? "# Source" : "# Источник", payload.source.name]);
  row([en ? "# Dataset" : "# Набор", payload.dataset]);
  row([en ? "# License" : "# Лицензия", payload.source.license]);
  row([en ? "# Citation" : "# Цитирование", payload.source.citation]);
  row([en ? "# Method" : "# Метод", en ? (stats.hamedRaoApplied ? "Mann–Kendall with Hamed–Rao correction" : "Mann–Kendall") : stats.method]);
  row([en ? "# Direction" : "# Направление", stats.direction]);
  row([en ? "# Significance" : "# Значимость", stats.confidence]);
  row(["# p", pf(stats.p)]);
  row(["# q (FDR)", stats.q !== null ? pf(stats.q) : "—"]);
  row(["# tau", stats.tau]);
  row([en ? "# Sen slope" : "# Sen slope", stats.senSlope * slopeDisplayScale(v), en ? slopeUnitEn(v) : slopeUnit(v)]);
  row([
    "# Sen slope 95% CI",
    stats.slopeCi ? `${stats.slopeCi.lower * slopeDisplayScale(v)} .. ${stats.slopeCi.upper * slopeDisplayScale(v)}` : "—",
  ]);
  row([en ? "# Years" : "# Лет", stats.nYears]);
  row([en ? "# Missing" : "# Пропуски", `${(stats.missingShare * 100).toFixed(1)} %`]);
  row([en ? "# Summary" : "# Вывод", en ? stats.summaryEn : stats.summary]);
  row([en ? "# Caveat" : "# Оговорка", en ? stats.caveatEn : stats.caveat]);
  row([]);
  row(["annual_year", "annual_value", "unit", "quality"]);
  for (const p of payload.annual) {
    row([p.year, p.value, en ? annualUnitEn(v) : annualUnit(v), p.quality]);
  }
  if (payload.monthly.length) {
    row([]);
    row(["month", "value", "unit", "quality"]);
    for (const p of payload.monthly) {
      row([p.date, p.value, en ? unitEn(v) : v.unit, p.quality]);
    }
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const filename = `k2_${object}_${variable}_${payload.period.from}_${payload.period.to}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
