import { NextResponse } from "next/server";
import { buildSystemPrompt, fallbackAnswer } from "@/lib/assistant";
import { getCatalog } from "@/lib/catalog";
import { getConfidenceLabel, getDirectionLabel, slopeUnit } from "@/lib/format";
import { analyzeByCode } from "@/lib/trend";
import { logChatMessage } from "@/lib/supabase";
import type { AssistantAction, AssistantContext, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 30;
const buckets = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (buckets.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) {
    buckets.set(ip, arr);
    return true;
  }
  arr.push(now);
  buckets.set(ip, arr);
  return false;
}

function actionBlock(actions: AssistantAction[]): string {
  if (!actions.length) return "";
  return (
    "\n\n" +
    actions
      .map((a) => `[[ACTION]]${JSON.stringify(a)}[[/ACTION]]`)
      .join("\n")
  );
}

function streamText(text: string, headers?: HeadersInit): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const chunks = text.match(/[\s\S]{1,48}/g) ?? [text];
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      ...headers,
    },
  });
}

const OBJECT_ALIASES: Record<string, string[]> = {
  "issyk-kul": ["иссык-куль", "иссык куль", "issyk"],
  "son-kul": ["сон-куль", "сон куль"],
  "chatyr-kul": ["чатыр-куль", "чатыр куль"],
  toktogul: ["токтогул", "токтогульск"],
  naryn: ["нарын", "бассейн нарына"],
  chu: ["чу", "бассейн чу"],
  enilchek: ["энильчек", "энильчек"],
  petrov: ["петрова", "петров"],
  "ak-shyirak": ["ак-шыйрак", "ак шыйрак"],
  golubina: ["голубина", "голубин"],
  chuy: ["чуйская", "чуй"],
  talas: ["талас"],
  "jalal-abad": ["джалал-абад", "джалал абад", "джалалабад"],
  "osh-region": ["ошская", "ошская область"],
  batken: ["баткен"],
  "naryn-region": ["нарынская", "нарынская область"],
  "issyk-kul-region": ["иссык-кульская", "иссык кульская"],
  bishkek: ["бишкек"],
  "osh-city": ["ош", "город ош"],
  earth: ["земля", "планета", "глобальн", "earth"],
};

/**
 * Give the model real numbers when the user asks about a concrete
 * object/variable/period. This runs on the server against the same cube as
 * the UI, so the assistant does not have to guess or invent.
 */
function enrichContext(message: string, context: AssistantContext): AssistantContext {
  try {
    const catalog = getCatalog();
    const lower = message.toLowerCase();
    const years = [...message.matchAll(/\b(20\d{2})\b/g)]
      .map((m) => Number(m[1]))
      .filter((y) => y >= 2000 && y <= 2025);
    const from = years.length ? Math.min(...years) : context.from ?? 2000;
    const to = years.length ? Math.max(...years) : context.to ?? 2025;

    let objectCode = context.objectCode ?? null;
    let bestLen = 0;
    for (const o of catalog.objects) {
      if (o.isGrid) continue;
      const names = [o.name, o.nameEn, o.code, ...(OBJECT_ALIASES[o.code] ?? [])]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      for (const n of names) {
        if (n.length > bestLen && lower.includes(n)) {
          objectCode = o.code;
          bestLen = n.length;
        }
      }
    }
    if (!objectCode && /глобальн|планет|earth/.test(lower)) objectCode = "earth";

    const variableMap: [RegExp, string][] = [
      [/уровень|озер|lake/, "lake_level"],
      [/сезон.*снег|снег.*сезон|snow.?days/, "snow_days"],
      [/снегопад|осадк.*снег|snow.?precip/, "snow_precip"],
      [/глубин.*снег|снег.*глубин|snow.?depth/, "snow_depth"],
      [/температур|тепле|t2m/, "t2m"],
      [/осадк|дожд|precip/, "precip"],
      [/почв|влажност|soil/, "soil_moisture"],
      [/испарен|evapor/, "evaporation"],
      [/co2|co₂|углекисл/, "co2"],
      [/глобальн.*температур|аномал.*температур|global.?temp/, "global_temp"],
      [/глобальн|потеплен/, "global_temp"],
      [/снег|snow/, "snow_days"],
    ];
    let variableCode = context.variableCode ?? null;
    for (const [re, code] of variableMap) {
      if (re.test(lower)) {
        variableCode = code;
        break;
      }
    }

    if (!objectCode || !variableCode) return context;
    const payload = analyzeByCode(objectCode, variableCode, from, to);
    if (!payload) return context;
    return {
      ...context,
      objectCode,
      variableCode,
      from: payload.period.from,
      to: payload.period.to,
      analysis: {
        object: payload.object.name,
        variable: payload.variable.name,
        from: payload.period.from,
        to: payload.period.to,
        summary: payload.stats.summary,
        summaryEn: payload.stats.summaryEn,
        p: Number.isFinite(payload.stats.p) ? payload.stats.p : null,
        q: payload.stats.q,
        senSlope: payload.stats.senSlope,
        slopeUnit: slopeUnit(payload.variable),
        confidenceLabel: getConfidenceLabel(payload.stats.confidence),
        directionLabel: getDirectionLabel(payload.stats.direction),
      },
    };
  } catch (e) {
    console.warn("context enrichment failed", e);
    return context;
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { code: "rate_limited", message: "Слишком много запросов к AI. Подождите пару минут." },
      { status: 429 },
    );
  }

  let body: {
    messages?: ChatMessage[];
    context?: AssistantContext;
    sessionId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "bad_request", message: "Некорректный JSON." }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-14)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
  const context: AssistantContext = body.context ?? { path: "/" };
  const safeContext: AssistantContext =
    JSON.stringify(context).length > 24000 ? { path: context.path || "/" } : context;
  const sessionId = body.sessionId || req.headers.get("x-session-id") || "";
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const enrichedContext = lastUser ? enrichContext(lastUser, safeContext) : safeContext;

  if (!lastUser) {
    return NextResponse.json({ code: "bad_request", message: "Нужно сообщение пользователя." }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.LLM_MODEL || "deepseek/deepseek-v4.1-flash-1017";
  const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";

  if (!apiKey) {
    const fb = fallbackAnswer(enrichedContext, lastUser);
    const text = fb.text + actionBlock(fb.actions);
    if (sessionId) {
      await logChatMessage({ sessionId, role: "user", content: lastUser, context: enrichedContext });
      await logChatMessage({ sessionId, role: "assistant", content: text, context: enrichedContext, model: "fallback" });
    }
    return streamText(text);
  }

  if (sessionId) {
    await logChatMessage({ sessionId, role: "user", content: lastUser, context: enrichedContext });
  }

  const system = buildSystemPrompt(enrichedContext);
  const payload = {
    model,
    stream: true,
    temperature: 0.35,
    max_tokens: Number(process.env.LLM_MAX_TOKENS || 1600),
    messages: [{ role: "system", content: system }, ...messages],
  };

  let upstream: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://k2.vercel.app",
        "X-Title": "K2 - Earth System Trend Detective",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (e) {
    console.warn("OpenRouter request failed", e);
    const fb = fallbackAnswer(enrichedContext, lastUser);
    const text =
      "AI-сервис сейчас недоступен, поэтому отвечаю по правилам продукта.\n\n" +
      fb.text +
      actionBlock(fb.actions);
    if (sessionId) {
      await logChatMessage({ sessionId, role: "assistant", content: text, context: enrichedContext, model: "fallback" });
    }
    return streamText(text);
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    console.warn("OpenRouter error", upstream.status, errText.slice(0, 500));
    const fb = fallbackAnswer(enrichedContext, lastUser);
    const text =
      "AI-сервис вернул ошибку, поэтому отвечаю по правилам продукта.\n\n" +
      fb.text +
      actionBlock(fb.actions);
    if (sessionId) {
      await logChatMessage({ sessionId, role: "assistant", content: text, context: enrichedContext, model: "fallback" });
    }
    return streamText(text);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let full = "";
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length) {
                full += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // ignore malformed keepalive lines
            }
          }
        }
      } catch (e) {
        console.warn("stream read failed", e);
      } finally {
        controller.close();
        if (sessionId && full.trim()) {
          await logChatMessage({ sessionId, role: "assistant", content: full, context: enrichedContext, model });
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
