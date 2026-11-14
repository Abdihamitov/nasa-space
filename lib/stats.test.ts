import { describe, expect, it } from "vitest";
import {
  benjaminiHochberg,
  hamedRao,
  mannKendall,
  normalCdf,
  seasonalMannKendall,
  senSlope,
  spearman,
} from "./stats";

// Reference values were produced with pymannkendall (Python) on the exact
// annual series from data/series.json. This is the regression guard against
// silent changes in the MK / Hamed–Rao / Sen implementation.
const BISHKEK_T2M = [
  13.9142, 13.8267, 14.0725, 13.0108, 13.88, 14.0, 14.0592, 14.1725, 13.9958, 13.4442,
  13.805, 13.0392, 12.9692, 14.0917, 13.1433, 14.1333, 14.2025, 13.6417, 13.2125, 14.11,
  13.165, 14.4192, 14.54, 15.0008, 14.2125, 15.6275,
];
const ISSYK_KUL_LEVEL = [
  1606.3, 1606.38, 1606.47, 1606.56, 1606.65, 1606.74, 1606.83, 1606.9, 1606.94, 1606.97,
  1607.0, 1607.02, 1606.99, 1606.96, 1606.93, 1606.9, 1606.87, 1606.84, 1606.81, 1606.78,
  1606.75, 1606.72, 1606.69, 1606.66, 1606.63, 1606.6,
];
const ENILCHEK_SNOW_DAYS = [
  326, 330, 315, 328, 333, 324, 314, 298, 294, 334, 322, 329, 319, 313, 314, 339, 351, 351,
  360, 353, 359, 346, 346, 356, 353, 332,
];

describe("normalCdf", () => {
  it("is 0.5 at zero", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3);
  });
  it("is 0.975 at 1.96", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });
});

describe("Mann–Kendall", () => {
  it("detects a significant increasing trend", () => {
    const values = Array.from({ length: 20 }, (_, i) => 10 + i * 0.8 + (i % 3 === 0 ? -0.5 : 0.3));
    const r = mannKendall(values);
    expect(r.s).toBeGreaterThan(0);
    expect(r.p).toBeLessThan(0.05);
  });

  it("detects a significant decreasing trend", () => {
    const values = Array.from({ length: 20 }, (_, i) => 20 - i * 0.7 + (i % 4 === 0 ? 0.4 : -0.2));
    const r = mannKendall(values);
    expect(r.s).toBeLessThan(0);
    expect(r.p).toBeLessThan(0.05);
  });

  it("does not invent a trend in alternating noise", () => {
    const values = Array.from({ length: 24 }, (_, i) => (i % 2 === 0 ? 1 : -1) + (i % 3) * 0.1);
    const r = mannKendall(values);
    expect(r.p).toBeGreaterThan(0.05);
  });

  it("returns NaN for fewer than 3 points", () => {
    expect(Number.isNaN(mannKendall([1, 2]).p)).toBe(true);
  });
});

describe("Sen slope", () => {
  it("recovers an exact linear slope", () => {
    const years = Array.from({ length: 10 }, (_, i) => 2000 + i);
    const values = years.map((y) => 3 + 2 * (y - 2000));
    const r = senSlope(years, values);
    expect(r.slope).toBeCloseTo(2, 10);
  });
});

describe("seasonal Mann–Kendall", () => {
  it("runs on grouped months", () => {
    const byMonth = new Map<number, number[]>();
    for (let m = 1; m <= 12; m++) {
      byMonth.set(
        m,
        Array.from({ length: 15 }, (_, i) => m * 2 + i * 0.5),
      );
    }
    const r = seasonalMannKendall(byMonth);
    expect(r.p).toBeLessThan(0.05);
    expect(r.n).toBe(180);
  });
});

describe("Benjamini–Hochberg", () => {
  it("returns 0.04 for four small p-values", () => {
    const q = benjaminiHochberg([0.01, 0.02, 0.03, 0.04]);
    q.forEach((v) => expect(v).toBeCloseTo(0.04, 6));
  });

  it("keeps NaN for invalid p", () => {
    const q = benjaminiHochberg([0.01, Number.NaN, 0.2]);
    expect(Number.isNaN(q[1])).toBe(true);
    expect(q[0]).toBeLessThanOrEqual(q[2]);
  });
});

describe("Spearman", () => {
  it("is 1 for a monotonic relationship", () => {
    const r = spearman([1, 2, 3, 4, 5, 6], [2, 4, 6, 8, 10, 12]);
    expect(r.rho).toBeCloseTo(1, 6);
    expect(r.p).toBeLessThan(0.05);
  });
});

describe("reference values vs pymannkendall", () => {
  it("matches Bishkek temperature (original MK)", () => {
    const r = mannKendall(BISHKEK_T2M);
    expect(r.s).toBe(103);
    expect(r.tau).toBeCloseTo(0.3169230769, 8);
    expect(r.z).toBeCloseTo(2.248238, 5);
    expect(r.p).toBeCloseTo(0.024561, 5);
    const years = BISHKEK_T2M.map((_, i) => 2000 + i);
    const sen = senSlope(years, BISHKEK_T2M);
    expect(sen.slope).toBeCloseTo(0.02303, 5);
  });

  it("matches Issyk-Kul level with Hamed–Rao correction", () => {
    const base = mannKendall(ISSYK_KUL_LEVEL);
    const years = ISSYK_KUL_LEVEL.map((_, i) => 2000 + i);
    const sen = senSlope(years, ISSYK_KUL_LEVEL);
    const hr = hamedRao(ISSYK_KUL_LEVEL, base, sen.slope);
    expect(hr.s).toBe(-14);
    expect(hr.tau).toBeCloseTo(-0.0430769231, 8);
    expect(hr.z).toBeCloseTo(-0.1581818, 5);
    expect(hr.p).toBeCloseTo(0.8743136, 5);
    expect(hr.applied).toBe(true);
  });

  it("matches Enilchek snow-season with Hamed–Rao correction", () => {
    const base = mannKendall(ENILCHEK_SNOW_DAYS);
    const years = ENILCHEK_SNOW_DAYS.map((_, i) => 2000 + i);
    const sen = senSlope(years, ENILCHEK_SNOW_DAYS);
    const hr = hamedRao(ENILCHEK_SNOW_DAYS, base, sen.slope);
    expect(hr.s).toBe(131);
    expect(hr.tau).toBeCloseTo(0.4030769231, 8);
    expect(hr.z).toBeCloseTo(2.118035, 5);
    expect(hr.p).toBeCloseTo(0.034172, 5);
    expect(hr.applied).toBe(true);
  });
});
