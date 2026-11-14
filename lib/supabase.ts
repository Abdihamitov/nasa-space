import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function ensureSession(sessionId: string, userAgent?: string | null): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb || !sessionId) return;
  try {
    await sb.from("sessions").upsert(
      {
        id: sessionId,
        user_agent: userAgent?.slice(0, 400) ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch (e) {
    console.warn("supabase ensureSession failed", e);
  }
}

export async function logChatMessage(input: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  context?: unknown;
  model?: string;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb || !input.sessionId || !input.content) return;
  try {
    await ensureSession(input.sessionId);
    await sb.from("chat_messages").insert({
      session_id: input.sessionId,
      role: input.role,
      content: input.content.slice(0, 20000),
      context: input.context ?? null,
      model: input.model ?? null,
    });
  } catch (e) {
    console.warn("supabase logChatMessage failed", e);
  }
}

export async function logExploration(input: {
  sessionId: string;
  objectCode?: string | null;
  variableCode?: string | null;
  from?: number | null;
  to?: number | null;
  path?: string | null;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb || !input.sessionId) return;
  try {
    await ensureSession(input.sessionId);
    await sb.from("explorations").insert({
      session_id: input.sessionId,
      object_code: input.objectCode ?? null,
      variable_code: input.variableCode ?? null,
      period_from: input.from ?? null,
      period_to: input.to ?? null,
      path: input.path?.slice(0, 500) ?? null,
    });
  } catch (e) {
    console.warn("supabase logExploration failed", e);
  }
}

export async function logFeedback(input: {
  sessionId: string;
  objectCode?: string | null;
  variableCode?: string | null;
  rating: number;
  comment?: string | null;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb || !input.sessionId) return;
  try {
    await ensureSession(input.sessionId);
    await sb.from("feedback").insert({
      session_id: input.sessionId,
      object_code: input.objectCode ?? null,
      variable_code: input.variableCode ?? null,
      rating: input.rating,
      comment: input.comment?.slice(0, 2000) ?? null,
    });
  } catch (e) {
    console.warn("supabase logFeedback failed", e);
  }
}
