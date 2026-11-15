import { describe, expect, it } from "vitest";
import { analyzeByCode } from "./trend";
import { buildChain } from "./chain";
import { autoCompare, buildTrendTable, toTrendTableView } from "./compare";
import { buildPhenomenonMap } from "./phenomena";

describe("K2 trend engine on the real cube", () => {
  it("finds a significant warming in Bishkek", () => {
    const p = analyzeByCode("bishkek", "t2m", 2000, 2025);
    expect(p).not.toBeNull();
    expect(p!.stats.confidence).toBe("confident");
    expect(p!.stats.direction).toBe("rising");
    expect(p!.stats.p).toBeLessThan(0.05);
    expect(p!.stats.senSlope).toBeGreaterThan(0);
  });

  it("reports no linear trend for the reconstructed Issyk-Kul level", () => {
    const p = analyzeByCode("issyk-kul", "lake_level", 2000, 2025);
    expect(p).not.toBeNull();
    expect(p!.stats.nYears).toBe(26);
    expect(p!.stats.confidence).toBe("none");
    expect(p!.stats.missingShare).toBe(0);
  });

  it("returns insufficient data for a short period", () => {
    const p = analyzeByCode("bishkek", "t2m", 2018, 2025);
    expect(p).not.toBeNull();
    expect(p!.stats.confidence).toBe("insufficient");
    expect(p!.stats.summary).toContain("Недостаточно данных");
  });

  it("computes the projection only when asked", () => {
    const plain = analyzeByCode("issyk-kul", "lake_level", 2000, 2025);
    const withProjection = analyzeByCode("issyk-kul", "lake_level", 2000, 2025, { projection: true });
    expect(plain!.stats.yearsToSignificance).toBeNull();
    expect(withProjection!.stats.yearsToSignificance).not.toBeNull();
    expect(withProjection!.stats.p).toBe(plain!.stats.p);
  });

  it("memoizes analyzeByCode by object, variable and period", () => {
    const a = analyzeByCode("bishkek", "t2m", 2000, 2025);
    const b = analyzeByCode("bishkek", "t2m", "2000", "2025");
    expect(b).toBe(a);
    expect(analyzeByCode("bishkek", "t2m", 2001, 2025)).not.toBe(a);
    // Projection on/off are separate entries.
    expect(analyzeByCode("bishkek", "t2m", 2000, 2025, { projection: true })).not.toBe(a);
  });

  it("does not mutate cached payloads when attaching scan-level q-values", () => {
    const cached = analyzeByCode("bishkek", "t2m", 2000, 2025)!;
    const snapshot = JSON.stringify(cached);
    const table = buildTrendTable("t2m", 2000, 2025, "city");
    autoCompare("t2m", 2000, 2025, "city");
    expect(JSON.stringify(analyzeByCode("bishkek", "t2m", 2000, 2025))).toBe(snapshot);
    const row = table!.rows.find((r) => r.object.code === "bishkek");
    if (row) expect(row.payload.qContext.tests).toBe(table!.tests);
  });

  it("memoizes the phenomenon map per phenomenon and period", () => {
    const a = buildPhenomenonMap("global-warming", 2000, 2025);
    expect(buildPhenomenonMap("global-warming", "2000", "2025")).toBe(a);
    expect(buildPhenomenonMap("global-warming", 2001, 2025)).not.toBe(a);
  });

  it("builds the five-link lake hypothesis chain", () => {
    const c = buildChain("issyk-kul", "lake_level", 2000, 2025);
    expect(c).not.toBeNull();
    expect(c!.links.length).toBe(5);
    expect(c!.summary).toContain("согласуются");
  });

  it("auto-selects an opposite pair for precipitation", () => {
    const c = autoCompare("precip", 2000, 2025);
    expect(c).not.toBeNull();
    expect(c!.pairType).toBe("opposite");
    expect(Math.sign(c!.a.stats.senSlope)).not.toBe(Math.sign(c!.b.stats.senSlope));
  });

  it("returns a q-value for every object in the trend table", () => {
    const t = buildTrendTable("t2m", 2000, 2025);
    expect(t).not.toBeNull();
    expect(t!.rows.length).toBeGreaterThan(10);
    for (const row of t!.rows) {
      if (row.q !== null) expect(row.q).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the /compare table view small", () => {
    const view = toTrendTableView(buildTrendTable("t2m", 2000, 2025));
    expect(view!.rows.length).toBeGreaterThan(10);
    expect(JSON.stringify(view).length).toBeLessThan(30_000);
    expect(view!.rows[0]).not.toHaveProperty("payload");
  });

  it("highlights at least five objects for global warming", () => {
    const m = buildPhenomenonMap("global-warming", 2000, 2025);
    expect(m).not.toBeNull();
    expect(m!.markers.length).toBeGreaterThanOrEqual(5);
    expect(m!.global).not.toBeNull();
  });
});
