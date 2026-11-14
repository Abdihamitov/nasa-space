import {
  getChainForVariable,
  getObject,
  getVariable,
} from "./catalog";
import { analyzeByCode, clampPeriod, formatNumber, formatP, periodLabel } from "./trend";
import { spearman } from "./stats";
import type { AnnualPoint, ChainLinkResult, ChainResult, Variable } from "./types";

function align(a: AnnualPoint[], b: AnnualPoint[]): { x: number[]; y: number[] } {
  const mapB = new Map(b.map((p) => [p.year, p.value]));
  const x: number[] = [];
  const y: number[] = [];
  for (const p of a) {
    const v = mapB.get(p.year);
    if (v !== undefined) {
      x.push(p.value);
      y.push(v);
    }
  }
  return { x, y };
}

export function buildChain(
  objectCode: string,
  variableCode: string,
  fromRaw?: string | number | null,
  toRaw?: string | number | null,
): ChainResult | null {
  const object = getObject(objectCode);
  const variable = getVariable(variableCode);
  const chain = getChainForVariable(variableCode);
  if (!object || !variable || !chain) return null;
  const period = clampPeriod(fromRaw, toRaw);

  const results: ChainLinkResult[] = [];
  for (const link of chain.links) {
    const v = getVariable(link.variable);
    if (!v) continue;
    const payload = object.variables.includes(link.variable)
      ? analyzeByCode(object.code, link.variable, period.from, period.to)
      : null;
    let status: ChainLinkResult["status"] = "insufficient";
    let statusLabel = "нет данных";
    let statusLabelEn = "no data";
    if (payload) {
      const stats = payload.stats;
      if (stats.confidence === "confident") {
        const sign = Math.sign(stats.senSlope);
        const expectedSign = link.expected === "+" ? 1 : -1;
        if (sign === expectedSign) {
          status = "confirmed";
          statusLabel = "согласуется";
          statusLabelEn = "agrees";
        } else {
          status = "contradicted";
          statusLabel = "противоречит";
          statusLabelEn = "contradicts";
        }
      } else if (stats.confidence === "weak") {
        status = "weak";
        statusLabel = "слабые признаки";
        statusLabelEn = "weak evidence";
      } else if (stats.confidence === "none") {
        status = "none";
        statusLabel = "тренда нет";
        statusLabelEn = "no trend";
      } else {
        status = "insufficient";
        statusLabel = "мало данных";
        statusLabelEn = "not enough data";
      }
    }
    results.push({
      variable: v,
      annual: payload?.annual ?? [],
      trend: payload?.stats ?? null,
      expected: link.expected,
      status,
      statusLabel,
      statusLabelEn,
      correlation: null,
      explanation: link.explanation,
      explanationEn: link.explanationEn ?? link.explanation,
      href: `/analysis?object=${object.code}&variable=${link.variable}&from=${period.from}&to=${period.to}`,
    });
  }

  // Spearman with the neighbouring link (annual values, same years).
  for (let i = 0; i < results.length - 1; i++) {
    const a = results[i];
    const b = results[i + 1];
    if (a.annual.length && b.annual.length) {
      const { x, y } = align(a.annual, b.annual);
      if (x.length >= 5) {
        const sp = spearman(x, y);
        a.correlation = { rho: sp.rho, p: sp.p, n: sp.n };
      }
    }
  }
  if (results.length > 1) {
    const last = results[results.length - 1];
    const prev = results[results.length - 2];
    if (last.annual.length && prev.annual.length && !last.correlation) {
      const { x, y } = align(prev.annual, last.annual);
      if (x.length >= 5) {
        const sp = spearman(x, y);
        last.correlation = { rho: sp.rho, p: sp.p, n: sp.n };
      }
    }
  }

  const confirmed = results.filter((r) => r.status === "confirmed").length;
  const contradicted = results.filter((r) => r.status === "contradicted").length;
  const noTrend = results.filter((r) => r.status === "none").length;
  const known = results.filter((r) => r.status !== "insufficient").length;
  const summary =
    known === 0
      ? `Для ${periodLabel(period.from, period.to)} не хватает данных, чтобы проверить звенья гипотезы.`
      : `С гипотезой согласуются ${confirmed} из ${known} звеньев с достаточными данными${contradicted ? `; ${contradicted} противоречат ожидаемому направлению` : ""}${noTrend ? `; в ${noTrend} тренда не выявлено` : ""}. Это проверка согласованности, а не доказательство причинной связи.`;
  const summaryEn =
    known === 0
      ? `There is not enough data to test the hypothesis links for ${periodLabel(period.from, period.to)}.`
      : `${confirmed} of ${known} links with sufficient data agree with the hypothesis${contradicted ? `; ${contradicted} contradict the expected direction` : ""}${noTrend ? `; ${noTrend} show no trend` : ""}. This is a consistency check, not proof of causation.`;

  return {
    chain,
    object,
    links: results,
    summary,
    summaryEn,
    caveat:
      "Цепочка — фиксированный граф гипотез из литературы. Мы показываем знак и значимость тренда каждого звена и корреляцию соседних звеньев. Корреляция трендовых рядов может быть ложной (spurious correlation), поэтому формулировки — «согласуется», «может объясняться», а не «доказывает».",
    caveatEn:
      "The chain is a fixed hypothesis graph from the literature. We show each link's trend sign and significance plus the correlation between neighbouring links. Correlations between trending series can be spurious, so the wording is “agrees” or “may be explained by”, not “proves”.",
  };
}

export function chainStatusColor(status: ChainLinkResult["status"]): string {
  if (status === "confirmed") return "text-aurora-300 border-aurora-400/30 bg-aurora-400/10";
  if (status === "contradicted") return "text-ember-400 border-ember-400/30 bg-ember-400/10";
  if (status === "weak") return "text-solar-300 border-solar-400/30 bg-solar-400/10";
  if (status === "none") return "text-slate-300 border-white/10 bg-white/[0.04]";
  return "text-slate-400 border-white/10 bg-white/[0.03]";
}

export function chainSummaryNumbers(chain: ChainResult) {
  const known = chain.links.filter((l) => l.status !== "insufficient");
  return {
    total: chain.links.length,
    known: known.length,
    confirmed: chain.links.filter((l) => l.status === "confirmed").length,
    contradicted: chain.links.filter((l) => l.status === "contradicted").length,
  };
}

export function formatCorrelation(rho: number, p: number): string {
  return `ρ = ${formatNumber(rho, 2)}; p = ${formatP(p)}`;
}
