import { apiCached, apiError, getParam } from "@/lib/api";
import { getVariable } from "@/lib/catalog";
import { autoCompare, buildCompare, buildTrendTable } from "@/lib/compare";
import { clampPeriod } from "@/lib/trend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const variable = getParam(url, "variable");
  if (!variable) return apiError("bad_request", "Нужен параметр variable.");
  if (!getVariable(variable)) return apiError("not_found", "Переменная не найдена.", 404);
  const period = clampPeriod(getParam(url, "from"), getParam(url, "to"));
  const auto = getParam(url, "auto") === "1";
  const a = getParam(url, "a");
  const b = getParam(url, "b");
  let compare;
  if (auto || !a || !b) {
    compare = autoCompare(variable, period.from, period.to, getParam(url, "type"));
  } else {
    compare = buildCompare(variable, a, b, period.from, period.to);
  }
  if (!compare) return apiError("no_data", "Не удалось подобрать пару для сравнения.", 404);
  const table = buildTrendTable(variable, period.from, period.to, getParam(url, "type"));
  return apiCached({ compare, table });
}
