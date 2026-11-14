import { apiError, apiOk, getParam } from "@/lib/api";
import { getObject, getVariable } from "@/lib/catalog";
import { buildChain } from "@/lib/chain";
import { clampPeriod } from "@/lib/trend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const object = getParam(url, "object");
  const variable = getParam(url, "variable");
  if (!object || !variable) return apiError("bad_request", "Нужны object и variable.");
  if (!getObject(object) || !getVariable(variable)) {
    return apiError("not_found", "Объект или переменная не найдены.", 404);
  }
  const period = clampPeriod(getParam(url, "from"), getParam(url, "to"));
  const chain = buildChain(object, variable, period.from, period.to);
  if (!chain) return apiError("no_chain", "Для этой переменной нет шаблона цепочки.", 404);
  return apiOk(chain);
}
