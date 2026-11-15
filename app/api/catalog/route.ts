import { getCatalog } from "@/lib/catalog";
import { apiCached } from "@/lib/api";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  return apiCached(getCatalog());
}
