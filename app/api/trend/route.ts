import { apiCached, apiError, getParam } from "@/lib/api";
import { getObject, getVariable } from "@/lib/catalog";
import { analyzeByCode, clampPeriod } from "@/lib/trend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const object = getParam(url, "object");
  const variable = getParam(url, "variable");
  if (!object || !variable) {
    return apiError("bad_request", "Нужны параметры object и variable.");
  }
  if (!getObject(object) || !getVariable(variable)) {
    return apiError("not_found", "Объект или переменная не найдены.", 404);
  }
  const period = clampPeriod(getParam(url, "from"), getParam(url, "to"));
  const payload = analyzeByCode(object, variable, period.from, period.to, { projection: true });
  if (!payload) {
    return apiError("no_data", "Для этой пары объект × переменная нет данных.", 404);
  }
  return apiCached(payload);
}
