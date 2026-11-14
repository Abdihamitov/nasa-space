/**
 * Seed Supabase with the K2 catalog + normalized cube + analytics schema.
 *
 * Usage:
 *   1. Run supabase/migrations/0001_init.sql in the Supabase SQL editor.
 *   2. Put NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 *   3. npm run seed
 *
 * The script is idempotent: it upserts by primary keys and (series_id, date).
 * The app itself reads the precomputed JSON cube; this seed prepares the
 * production path and powers chat/exploration analytics.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { analyzeByCode } from "../lib/trend";

type AnyRecord = Record<string, unknown>;

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertBatches(
  sb: ReturnType<typeof createClient>,
  table: string,
  rows: AnyRecord[],
  onConflict: string,
  batchSize = 500,
) {
  let done = 0;
  for (const part of chunk(rows, batchSize)) {
    const { error } = await sb.from(table).upsert(part, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    done += part.length;
    if (rows.length > 1000) process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  if (rows.length > 1000) process.stdout.write("\n");
  console.log(`  ${table}: ${rows.length}`);
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Add them to .env.local and run: npm run seed");
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/catalog.json"), "utf8"));
  const seriesMap = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/series.json"), "utf8")) as Record<string, AnyRecord>;
  const geo = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/geo/kyrgyzstan.json"), "utf8"));
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log("K2 → Supabase seed");
  console.log(`  objects: ${catalog.objects.length}, series: ${catalog.seriesIndex.length}`);

  // Sources: union of variable sources and series sources.
  const sourceMap = new Map<string, AnyRecord>();
  for (const v of catalog.variables) {
    if (v.source) sourceMap.set(v.source.name, v.source);
  }
  for (const s of Object.values(seriesMap)) {
    const src = (s as AnyRecord).source as AnyRecord | undefined;
    if (src?.name) sourceMap.set(src.name as string, src);
  }
  const sourceCode = (name: string) => slug(name);
  const sources = [...sourceMap.values()].map((s) => ({
    code: sourceCode(s.name as string),
    name: s.name,
    url: s.url ?? null,
    license: s.license ?? null,
    citation: s.citation ?? null,
  }));
  await upsertBatches(sb, "sources", sources, "code");

  const sections = catalog.sections.map((s: AnyRecord) => ({
    code: s.code,
    name: s.name,
    name_en: s.nameEn,
    description: s.description,
    accent: s.accent,
    icon: s.icon,
    sort_order: s.order,
  }));
  await upsertBatches(sb, "sections", sections, "code");

  const variables = catalog.variables.map((v: AnyRecord) => ({
    code: v.code,
    section_code: v.section,
    name: v.name,
    name_en: v.nameEn,
    short_name: v.shortName,
    unit: v.unit,
    display_unit: v.displayUnit,
    display_scale: v.displayScale,
    yearly_agg: v.yearlyAgg,
    season_months: v.seasonMonths,
    native_step: v.nativeStep,
    direction_note: v.directionNote,
    description: v.description,
    why_it_matters: v.whyItMatters,
    source_code: sourceCode(v.source.name),
    dataset: v.dataset,
    precision: v.precision,
    is_proxy: v.isProxy,
    proxy_note: v.proxyNote ?? null,
    is_reconstruction: v.isReconstruction,
    reconstruction_note: v.reconstructionNote ?? null,
    color: v.color,
  }));
  await upsertBatches(sb, "variables", variables, "code");

  const geoByCode = new Map<string, unknown>(geo.features.map((f: AnyRecord) => [f.properties.code, f]));
  const objects = catalog.objects.map((o: AnyRecord) => ({
    code: o.code,
    type: o.type,
    name: o.name,
    name_en: o.nameEn,
    lat: o.lat,
    lon: o.lon,
    region: o.region,
    elevation: o.elevation,
    area_km2: o.areaKm2,
    description: o.description,
    tags: o.tags,
    geom: geoByCode.get(o.code) ?? null,
    marker: { type: "Point", coordinates: [o.lon, o.lat] },
    parent_code: null,
    is_grid: Boolean(o.isGrid),
    is_global: Boolean(o.isGlobal),
    is_regulated: Boolean(o.isRegulated),
    regulated_note: o.regulatedNote ?? null,
    is_proxy: Boolean(o.isProxy),
    highlight: Boolean(o.highlight),
  }));
  await upsertBatches(sb, "objects", objects, "code", 300);

  const indexById = new Map(catalog.seriesIndex.map((s: AnyRecord) => [s.id, s]));
  const seriesRows = Object.entries(seriesMap).map(([id, s]) => {
    const meta = (indexById.get(id) ?? {}) as AnyRecord;
    const src = s.source as AnyRecord;
    return {
      id,
      object_code: s.object,
      variable_code: s.variable,
      source_code: sourceCode(src.name as string),
      dataset_id: s.dataset,
      native_step: s.nativeStep,
      date_from: meta.dateFrom ?? null,
      date_to: meta.dateTo ?? null,
      is_proxy: Boolean(meta.isProxy),
      is_reconstruction: Boolean(meta.isReconstruction),
      coverage: meta.coverage ?? null,
    };
  });
  await upsertBatches(sb, "series", seriesRows, "id");

  const observations: AnyRecord[] = [];
  for (const [id, s] of Object.entries(seriesMap)) {
    for (const [date, value, quality] of (s.points as [string, number, string][])) {
      observations.push({ series_id: id, date, value, quality });
    }
  }
  await upsertBatches(sb, "observations", observations, "series_id,date", 1000);

  // Precompute default trend results (2000–2025).
  console.log("  computing trends...");
  const trends: AnyRecord[] = [];
  for (const meta of catalog.seriesIndex) {
    const p = analyzeByCode(meta.object, meta.variable, 2000, 2025);
    if (!p) continue;
    trends.push({
      series_id: meta.id,
      date_from: p.period.from,
      date_to: p.period.to,
      agg: "annual",
      trend: p.stats.direction,
      p_value: Number.isFinite(p.stats.p) ? p.stats.p : null,
      q_value: p.stats.q,
      tau: Number.isFinite(p.stats.tau) ? p.stats.tau : null,
      sen_slope: Number.isFinite(p.stats.senSlope) ? p.stats.senSlope : null,
      slope_ci_low: p.stats.slopeCi?.lower ?? null,
      slope_ci_high: p.stats.slopeCi?.upper ?? null,
      intercept: Number.isFinite(p.stats.intercept) ? p.stats.intercept : null,
      n_years: p.stats.nYears,
      method: p.stats.method,
      missing_share: p.stats.missingShare,
      computed_at: new Date().toISOString(),
    });
  }
  await upsertBatches(sb, "trend_results", trends, "series_id,date_from,date_to,agg");

  const templates = catalog.chains.map((c: AnyRecord) => ({
    id: c.id,
    section_code: c.section,
    target_variable: c.targetVariable,
    name: c.name,
    description: c.description,
  }));
  await upsertBatches(sb, "chain_templates", templates, "id");

  const links: AnyRecord[] = [];
  for (const c of catalog.chains) {
    for (const l of c.links) {
      links.push({
        template_id: c.id,
        sort_order: l.order,
        variable_code: l.variable,
        expected_relation: l.expected,
        explanation_text: l.explanation,
      });
    }
  }
  // chain_links has a serial id; delete existing rows for idempotency.
  await sb.from("chain_links").delete().neq("template_id", "__none__");
  const { error: linkErr } = await sb.from("chain_links").insert(links);
  if (linkErr) throw new Error(`chain_links: ${linkErr.message}`);
  console.log(`  chain_links: ${links.length}`);

  const phenomena = catalog.phenomena.map((p: AnyRecord) => ({
    code: p.code,
    name: p.name,
    name_en: p.nameEn,
    description: p.description,
    global_variable: p.globalVariable,
    global_label: p.globalLabel,
    caveat: p.caveat,
    accent: p.accent,
    icon: p.icon,
  }));
  await upsertBatches(sb, "phenomena", phenomena, "code");

  const phLinks: AnyRecord[] = [];
  for (const p of catalog.phenomena) {
    for (const l of p.links) {
      phLinks.push({
        phenomenon_code: p.code,
        object_code: l.object,
        local_variable: l.variable,
        weight: l.weight,
        note: l.note,
      });
    }
  }
  await sb.from("phenomenon_objects").delete().neq("phenomenon_code", "__none__");
  for (const part of chunk(phLinks, 500)) {
    const { error } = await sb.from("phenomenon_objects").insert(part);
    if (error) throw new Error(`phenomenon_objects: ${error.message}`);
  }
  console.log(`  phenomenon_objects: ${phLinks.length}`);

  await sb.from("ingest_runs").insert({
    source_code: "etl",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    status: "success",
    rows: observations.length,
    error: null,
  });

  console.log("Done. Supabase is seeded.");
  console.log("Next: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
