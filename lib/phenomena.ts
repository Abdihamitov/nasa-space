import { getObject, getPhenomenon, getVariable } from "./catalog";
import { analyzeByCode, clampPeriod } from "./trend";
import type {
  MapMarker,
  MarkerTrend,
  PhenomenonMapPayload,
  TrendPayload,
} from "./types";

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function buildPhenomenonMap(
  code: string,
  fromRaw?: string | number | null,
  toRaw?: string | number | null,
): PhenomenonMapPayload | null {
  const phenomenon = getPhenomenon(code);
  if (!phenomenon) return null;
  const period = clampPeriod(fromRaw, toRaw);
  const byObject = new Map<string, { objectCode: string; variables: string[] }>();
  for (const link of phenomenon.links) {
    const entry = byObject.get(link.object) ?? { objectCode: link.object, variables: [] };
    if (!entry.variables.includes(link.variable)) entry.variables.push(link.variable);
    byObject.set(link.object, entry);
  }

  const markers: MapMarker[] = [];
  for (const entry of byObject.values()) {
    const object = getObject(entry.objectCode);
    if (!object) continue;
    let best: TrendPayload | null = null;
    let bestStrength = -1;
    for (const varCode of entry.variables) {
      const payload = analyzeByCode(object.code, varCode, period.from, period.to);
      if (!payload) continue;
      const sd = std(payload.annual.map((p) => p.value));
      const strength = sd > 0 ? Math.abs(payload.stats.senSlope) / sd : 0;
      const score = strength + (payload.stats.confidence === "confident" ? 0.5 : payload.stats.confidence === "weak" ? 0.2 : 0);
      if (score > bestStrength) {
        bestStrength = score;
        best = payload;
      }
    }
    if (!best) continue;
    const sd = std(best.annual.map((p) => p.value));
    const q = best.stats.q;
    const effectiveConfidence =
      q !== null
        ? q < 0.05
          ? "confident"
          : q < 0.1
            ? "weak"
            : "none"
        : best.stats.confidence;
    const trend: MarkerTrend = {
      confidence: effectiveConfidence,
      direction: effectiveConfidence === "none" ? "flat" : best.stats.direction,
      senSlope: best.stats.senSlope,
      p: best.stats.p,
      q: best.stats.q,
    };
    markers.push({
      object,
      variable: best.variable,
      trend,
      strength: sd > 0 ? Math.abs(best.stats.senSlope) / sd : 0,
      q: best.stats.q,
      href: `/analysis?object=${object.code}&variable=${best.variable.code}&from=${period.from}&to=${period.to}`,
    });
  }
  markers.sort((a, b) => {
    const score = (m: MapMarker) => {
      const qWeight = m.q === null ? 0.8 : m.q < 0.05 ? 1 : m.q < 0.1 ? 0.5 : 0.25;
      const regulatedPenalty = m.object.isRegulated ? 0.7 : 1;
      return m.strength * qWeight * regulatedPenalty;
    };
    return score(b) - score(a);
  });

  let global: PhenomenonMapPayload["global"] = null;
  if (phenomenon.globalVariable) {
    const payload = analyzeByCode("earth", phenomenon.globalVariable, period.from, period.to);
    if (payload) {
      global = { variable: payload.variable, annual: payload.annual, trend: payload.stats };
    }
  }

  return {
    phenomenon,
    period,
    markers,
    global,
    caveat: phenomenon.caveat,
  };
}

export function buildPhenomenonObject(
  code: string,
  objectCode: string,
  fromRaw?: string | number | null,
  toRaw?: string | number | null,
  variableCode?: string | null,
) {
  const phenomenon = getPhenomenon(code);
  const object = getObject(objectCode);
  if (!phenomenon || !object) return null;
  const period = clampPeriod(fromRaw, toRaw);
  const candidates = phenomenon.links
    .filter((l) => l.object === objectCode)
    .map((l) => l.variable)
    .filter((v) => object.variables.includes(v));
  const chosen = variableCode && candidates.includes(variableCode) ? variableCode : candidates[0];
  if (!chosen) return null;
  const local = analyzeByCode(objectCode, chosen, period.from, period.to);
  if (!local) return null;
  let global: TrendPayload | null = null;
  if (phenomenon.globalVariable) {
    global = analyzeByCode("earth", phenomenon.globalVariable, period.from, period.to);
  }
  const localVar = getVariable(chosen);
  return {
    phenomenon,
    object,
    local,
    global,
    note:
      `Сопоставление локального тренда (${localVar?.name ?? chosen}) с ` +
      (phenomenon.globalVariable ? `глобальным показателем «${phenomenon.globalLabel}». ` : "локальными индикаторами. ") +
      "Совпадение направлений не доказывает причинную связь.",
    noteEn:
      `Comparing the local trend (${localVar?.nameEn ?? chosen}) with ` +
      (phenomenon.globalVariable ? `the global indicator “${phenomenon.globalLabelEn ?? phenomenon.globalLabel}”. ` : "local indicators. ") +
      "Matching directions do not prove causation.",
  };
}
