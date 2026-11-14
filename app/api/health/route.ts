import { apiOk } from "@/lib/api";
import { getMeta } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const meta = getMeta();
  return apiOk({
    status: "ok",
    service: "k2",
    version: "1.0.0",
    generatedAt: meta.generatedAt,
    period: meta.period,
    objects: meta.objectCount,
    gridPoints: meta.gridCount,
    variables: meta.variableCount,
    series: meta.seriesCount,
    sources: meta.sources,
    supabase: isSupabaseConfigured() ? "configured" : "not_configured",
    ai: process.env.OPENROUTER_API_KEY ? "configured" : "fallback",
    now: new Date().toISOString(),
  });
}
