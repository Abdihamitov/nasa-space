import { getCatalog } from "@/lib/catalog";
import { apiOk } from "@/lib/api";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  return apiOk(getCatalog(), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
