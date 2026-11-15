import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { clampPeriod } from "@/lib/trend";
import { ExploreClient } from "@/components/explore/ExploreClient";

export const metadata: Metadata = {
  title: "Исследовать",
  description: "Пошаговый выбор: раздел → место → параметр → период. Анализ климатического тренда Кыргызстана.",
};

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function numberParam(v: string | null): number {
  if (v === null || v.trim() === "") return Number.NaN;
  return Number(v);
}

function nearestGrid(lat: number, lon: number) {
  const catalog = getCatalog();
  let best = null as null | (typeof catalog.objects)[number];
  let bestD = Infinity;
  for (const o of catalog.objects) {
    if (!o.isGrid) continue;
    const dLat = (o.lat - lat) * 111;
    const dLon = (o.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180);
    const d = dLat * dLat + dLon * dLon;
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const catalog = getCatalog();

  const sectionRaw = first(sp.section);
  const objectRaw = first(sp.object);
  const variableRaw = first(sp.variable);
  // Number(null) is 0, so a missing lat/lon must not be parsed as a number:
  // otherwise plain /explore jumps to the grid point nearest to (0, 0).
  const latRaw = numberParam(first(sp.lat));
  const lonRaw = numberParam(first(sp.lon));

  let section = catalog.sections.find((s) => s.code === sectionRaw)?.code ?? null;
  let object = catalog.objects.find((o) => o.code === objectRaw) ?? null;

  if (!object && Number.isFinite(latRaw) && Number.isFinite(lonRaw)) {
    object = nearestGrid(latRaw, lonRaw);
  }
  if (object && !object.isGlobal && !object.isGrid && !object.variables.length) object = null;

  // Shared link or map click without a section: infer it from the object's first
  // variable so the user lands on the parameter step, not on the section picker.
  if (!section && object) {
    const firstVar = object.variables[0];
    const sectionOfVar = firstVar
      ? catalog.variables.find((v) => v.code === firstVar)?.section ?? null
      : null;
    if (sectionOfVar) section = sectionOfVar;
  }

  const variable =
    object && variableRaw && object.variables.includes(variableRaw)
      ? catalog.variables.find((v) => v.code === variableRaw) ?? null
      : null;

  const period = clampPeriod(first(sp.from), first(sp.to));
  const bounds = catalog.meta.period;
  const from = Math.min(period.from, bounds.to - 9);
  const to = Math.min(bounds.to, Math.max(from + 9, period.to));
  const initial = {
    section,
    object: object?.code ?? null,
    variable: variable?.code ?? null,
    from,
    to,
    lat: object?.isGrid ? object.lat : Number.isFinite(latRaw) ? latRaw : null,
    lon: object?.isGrid ? object.lon : Number.isFinite(lonRaw) ? lonRaw : null,
  };

  return <ExploreClient catalog={catalog} initial={initial} />;
}
