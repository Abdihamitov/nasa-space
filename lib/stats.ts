// Statistical core: Mann–Kendall, Hamed–Rao, seasonal MK, Sen slope,
// Benjamini–Hochberg FDR, Spearman. No external dependencies.

export type MKResult = {
  s: number;
  z: number;
  p: number;
  tau: number;
  varS: number;
  n: number;
  method: string;
};

export type SenResult = {
  slope: number;
  intercept: number;
  lower: number | null;
  upper: number | null;
};

export type SeasonalMKResult = {
  s: number;
  z: number;
  p: number;
  tau: number;
  n: number;
  method: string;
};

export function normalCdf(z: number): number {
  const x = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  let p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  // The expression above is the upper-tail Q(|z|). Convert to the lower tail.
  if (z >= 0) p = 1 - p;
  return Math.min(1, Math.max(0, p));
}

function tieCounts(values: number[]): number[] {
  const map = new Map<number, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.values()];
}

export function mannKendall(values: number[]): MKResult {
  const n = values.length;
  if (n < 3) {
    return { s: 0, z: 0, p: Number.NaN, tau: Number.NaN, varS: Number.NaN, n, method: "Mann–Kendall" };
  }
  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      s += Math.sign(values[j] - values[i]);
    }
  }
  const ties = tieCounts(values);
  const varS = (n * (n - 1) * (2 * n + 5) - ties.reduce((a, t) => a + t * (t - 1) * (2 * t + 5), 0)) / 18;
  // Kendall tau-a (the same convention as pymannkendall); ties are still
  // accounted for in var(S) and therefore in the p-value.
  const tau = n > 1 ? s / (0.5 * n * (n - 1)) : 0;
  if (varS <= 0) {
    return { s, z: 0, p: 1, tau, varS: 0, n, method: "Mann–Kendall" };
  }
  let z = 0;
  if (s > 0) z = (s - 1) / Math.sqrt(varS);
  else if (s < 0) z = (s + 1) / Math.sqrt(varS);
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { s, z, p: Math.min(1, Math.max(0, p)), tau, varS, n, method: "Mann–Kendall" };
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return Number.NaN;
  const ma = a.slice(0, n).reduce((x, y) => x + y, 0) / n;
  const mb = b.slice(0, n).reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

/** Hamed–Rao (1998) variance correction, including all significant lags. */
export function hamedRao(values: number[], base: MKResult, senSlope: number): MKResult & { r1: number; applied: boolean } {
  const n = values.length;
  if (n < 4 || !Number.isFinite(base.varS) || base.varS <= 0) {
    return { ...base, r1: 0, applied: false };
  }

  // Detrend, then rank (Hamed & Rao use the autocorrelation of the ranks of
  // the detrended series).
  const detrended = values.map((v, i) => v - (i + 1) * senSlope);
  const ranks = rank(detrended);
  const mean = ranks.reduce((a, b) => a + b, 0) / n;
  const y = ranks.map((r) => r - mean);
  const denom = y.reduce((a, b) => a + b * b, 0);
  if (denom <= 0) return { ...base, r1: 0, applied: false };

  const acf: number[] = [1];
  for (let lag = 1; lag < n; lag++) {
    let num = 0;
    for (let i = 0; i < n - lag; i++) num += y[i] * y[i + lag];
    acf[lag] = num / denom;
  }

  const interval = 1.959964 / Math.sqrt(n);
  let sni = 0;
  let significantLags = 0;
  for (let lag = 1; lag < n; lag++) {
    if (Math.abs(acf[lag]) > interval) {
      sni += (n - lag) * (n - lag - 1) * (n - lag - 2) * acf[lag];
      significantLags++;
    }
  }
  const nNs = 1 + (2 / (n * (n - 1) * (n - 2))) * sni;
  const varS = base.varS * nNs;
  if (!Number.isFinite(varS) || varS <= 0) {
    return { ...base, r1: acf[1] ?? 0, applied: false };
  }
  let z = 0;
  if (base.s > 0) z = (base.s - 1) / Math.sqrt(varS);
  else if (base.s < 0) z = (base.s + 1) / Math.sqrt(varS);
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const applied = significantLags > 0 && Math.abs(nNs - 1) > 1e-12;
  return {
    ...base,
    z,
    p: Math.min(1, Math.max(0, p)),
    varS,
    r1: acf[1] ?? 0,
    applied,
    method: applied ? "Mann–Kendall с поправкой Хамеда–Рао" : "Mann–Kendall",
  };
}

/** Seasonal Mann–Kendall (Hirsch–Slack) for monthly data. */
export function seasonalMannKendall(byMonth: Map<number, number[]>): SeasonalMKResult {
  let sTotal = 0;
  let varTotal = 0;
  let nTotal = 0;
  let n0Total = 0;
  let n1Total = 0;
  for (const vals of byMonth.values()) {
    if (vals.length < 3) continue;
    const mk = mannKendall(vals);
    sTotal += mk.s;
    varTotal += mk.varS;
    nTotal += vals.length;
    const n = vals.length;
    n0Total += (n * (n - 1)) / 2;
    const ties = tieCounts(vals);
    for (const t of ties) n1Total += (t * (t - 1)) / 2;
  }
  if (varTotal <= 0) {
    return { s: sTotal, z: 0, p: 1, tau: 0, n: nTotal, method: "Seasonal Mann–Kendall (Hirsch–Slack)" };
  }
  let z = 0;
  if (sTotal > 0) z = (sTotal - 1) / Math.sqrt(varTotal);
  else if (sTotal < 0) z = (sTotal + 1) / Math.sqrt(varTotal);
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const denom = Math.sqrt(Math.max(0, (n0Total - n1Total) * (n0Total - n1Total)));
  return {
    s: sTotal,
    z,
    p: Math.min(1, Math.max(0, p)),
    tau: denom > 0 ? sTotal / denom : 0,
    n: nTotal,
    method: "Seasonal Mann–Kendall (Hirsch–Slack)",
  };
}

export function senSlope(years: number[], values: number[], varS?: number): SenResult {
  const n = values.length;
  if (n < 2) return { slope: Number.NaN, intercept: Number.NaN, lower: null, upper: null };
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dt = years[j] - years[i];
      if (dt !== 0) slopes.push((values[j] - values[i]) / dt);
    }
  }
  if (!slopes.length) return { slope: Number.NaN, intercept: Number.NaN, lower: null, upper: null };
  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  const slope = slopes.length % 2 === 0 ? (slopes[mid - 1] + slopes[mid]) / 2 : slopes[mid];
  const intercepts = values.map((v, i) => v - slope * years[i]).sort((a, b) => a - b);
  const imid = Math.floor(intercepts.length / 2);
  const intercept =
    intercepts.length % 2 === 0 ? (intercepts[imid - 1] + intercepts[imid]) / 2 : intercepts[imid];
  let lower: number | null = null;
  let upper: number | null = null;
  if (varS && varS > 0) {
    const c = 1.96 * Math.sqrt(varS);
    const N = slopes.length;
    const lo = Math.floor((N - c) / 2);
    const hi = Math.ceil((N + c) / 2);
    lower = slopes[Math.max(0, Math.min(N - 1, lo))];
    upper = slopes[Math.max(0, Math.min(N - 1, hi))];
  }
  return { slope, intercept, lower, upper };
}

/** Benjamini–Hochberg FDR. NaN p-values receive NaN q-values. */
export function benjaminiHochberg(pValues: number[]): number[] {
  const q = new Array<number>(pValues.length).fill(Number.NaN);
  const valid: { p: number; i: number }[] = [];
  pValues.forEach((p, i) => {
    if (Number.isFinite(p)) valid.push({ p, i });
  });
  if (!valid.length) return q;
  valid.sort((a, b) => a.p - b.p);
  const m = valid.length;
  let prev = 1;
  for (let rank = m; rank >= 1; rank--) {
    const { p, i } = valid[rank - 1];
    const val = Math.min(prev, (p * m) / rank);
    q[i] = Math.min(1, Math.max(0, val));
    prev = q[i];
  }
  return q;
}

export function rank(values: number[]): number[] {
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(values.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k].i] = r;
    i = j + 1;
  }
  return out;
}

export function spearman(a: number[], b: number[]): { rho: number; p: number; n: number } {
  const n = Math.min(a.length, b.length);
  if (n < 5) return { rho: Number.NaN, p: Number.NaN, n };
  const ra = rank(a.slice(0, n));
  const rb = rank(b.slice(0, n));
  const rho = pearson(ra, rb);
  // permutation test, deterministic seed
  const rng = mulberry32(42);
  let count = 0;
  const B = 1000;
  for (let bIdx = 0; bIdx < B; bIdx++) {
    const shuffled = [...rb];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const r = pearson(ra, shuffled);
    if (Math.abs(r) >= Math.abs(rho)) count++;
  }
  return { rho, p: (count + 1) / (B + 1), n };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Illustrative projection: at the current Sen slope and residual noise,
 * when would MK reach p < 0.05? Not a forecast.
 */
export function yearsToSignificance(
  years: number[],
  values: number[],
  slope: number,
  intercept: number,
  currentP: number,
  maxYear = 2050,
): { year: number | null; probability: number | null; note: string; noteEn: string } {
  if (currentP < 0.05) return { year: null, probability: null, note: "Тренд уже значим.", noteEn: "The trend is already significant." };
  if (years.length < 8 || !Number.isFinite(slope) || slope === 0) {
    return { year: null, probability: null, note: "Слишком короткий или плоский ряд для проекции.", noteEn: "The series is too short or too flat for a projection." };
  }
  const lastYear = years[years.length - 1];
  if (lastYear >= maxYear) {
    return { year: null, probability: null, note: "Период уже достигает 2050 года.", noteEn: "The period already reaches 2050." };
  }
  const residuals = values.map((v, i) => v - (intercept + slope * years[i]));
  const rng = mulberry32(20261114);
  const B = 160;
  const n0 = values.length;
  const slopeSign = Math.sign(slope);

  // S and the tie structure of the observed part are shared by every run, so
  // compute them once. Each simulated point then only adds its own pairs:
  // against the observed points via binary search on a sorted copy, and
  // against the other simulated points directly. This replaces the full
  // O(n²) Mann–Kendall per run and gives exactly the same S and Var(S).
  let s0 = 0;
  for (let i = 0; i < n0 - 1; i++) {
    for (let j = i + 1; j < n0; j++) s0 += Math.sign(values[j] - values[i]);
  }
  const tieTerm = (t: number) => t * (t - 1) * (2 * t + 5);
  let baseTieTerm = 0;
  for (const t of tieCounts(values)) baseTieTerm += tieTerm(t);
  const sorted = [...values].sort((a, b) => a - b);
  // Number of observed values strictly below / above x.
  const countBelow = (x: number) => {
    let lo = 0;
    let hi = n0;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const countAbove = (x: number) => {
    let lo = 0;
    let hi = n0;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid] <= x) lo = mid + 1;
      else hi = mid;
    }
    return n0 - lo;
  };

  const simulated = new Array<number>(maxYear - lastYear);

  for (let y = lastYear + 1; y <= maxYear; y++) {
    let hits = 0;
    const n = n0 + (y - lastYear);
    const varBase = n * (n - 1) * (2 * n + 5);
    for (let b = 0; b < B; b++) {
      let s = s0;
      let ties = baseTieTerm;
      for (let yy = lastYear + 1, k = 0; yy <= y; yy++, k++) {
        const r = residuals[Math.floor(rng() * residuals.length)];
        const x = intercept + slope * yy + r;
        const below = countBelow(x);
        const above = countAbove(x);
        s += below - above;
        // c = how many earlier points (observed + simulated) equal x.
        let c = n0 - below - above;
        for (let i = 0; i < k; i++) {
          const d = x - simulated[i];
          if (d > 0) s++;
          else if (d < 0) s--;
          else c++;
        }
        simulated[k] = x;
        if (c > 0) ties += tieTerm(c + 1) - tieTerm(c);
      }
      // Same decision rule as mannKendall(extended).
      const varS = (varBase - ties) / 18;
      if (varS <= 0) continue;
      let z = 0;
      if (s > 0) z = (s - 1) / Math.sqrt(varS);
      else if (s < 0) z = (s + 1) / Math.sqrt(varS);
      const p = Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(z)))));
      if (p < 0.05 && Math.sign(s) === slopeSign) hits++;
    }
    const prob = hits / B;
    if (prob >= 0.5) {
      return {
        year: y,
        probability: prob,
        note: `При сохранении текущего темпа тест достигнет p < 0.05 примерно к ${y} году (доля симуляций ${Math.round(prob * 100)} %). Это иллюстративная проекция, а не прогноз.`,
        noteEn: `At the current rate, the test reaches p < 0.05 around ${y} (share of simulations: ${Math.round(prob * 100)}%). This is an illustrative projection, not a forecast.`,
      };
    }
  }
  return {
    year: null,
    probability: null,
    note: "При сохранении текущего темпа тест не достигает p < 0.05 до 2050 года. Это иллюстративная проекция, а не прогноз.",
    noteEn: "At the current rate, the test does not reach p < 0.05 by 2050. This is an illustrative projection, not a forecast.",
  };
}
