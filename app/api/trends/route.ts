import { apiCached, apiError, getParam } from "@/lib/api";
import { getVariable } from "@/lib/catalog";
import { buildTrendTable } from "@/lib/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const variable = getParam(url, "variable");
  if (!variable) return apiError("bad_request", "Нужен параметр variable.");
  if (!getVariable(variable)) return apiError("not_found", "Переменная не найдена.", 404);
  const table = buildTrendTable(
    variable,
    getParam(url, "from"),
    getParam(url, "to"),
    getParam(url, "type"),
  );
  if (!table) return apiError("no_data", "Нет данных для этой переменной.", 404);
  return apiCached(table);
}
