import { apiError, apiOk, getParam } from "@/lib/api";
import { getPhenomena, getPhenomenon } from "@/lib/catalog";
import { buildPhenomenonMap, buildPhenomenonObject } from "@/lib/phenomena";
import { clampPeriod } from "@/lib/trend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (getParam(url, "list") === "1") {
    return apiOk({ phenomena: getPhenomena() });
  }
  const code = getParam(url, "code");
  if (!code) return apiError("bad_request", "Нужен параметр code или list=1.");
  if (!getPhenomenon(code)) return apiError("not_found", "Явление не найдено.", 404);
  const period = clampPeriod(getParam(url, "from"), getParam(url, "to"));
  const object = getParam(url, "object");
  if (object) {
    const payload = buildPhenomenonObject(
      code,
      object,
      period.from,
      period.to,
      getParam(url, "variable"),
    );
    if (!payload) return apiError("no_data", "Нет данных для этого объекта и явления.", 404);
    return apiOk(payload);
  }
  const map = buildPhenomenonMap(code, period.from, period.to);
  if (!map) return apiError("no_data", "Нет данных для этого явления.", 404);
  return apiOk(map);
}
