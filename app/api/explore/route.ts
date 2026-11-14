import { NextResponse } from "next/server";
import { logExploration } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : "";
    if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });
    await logExploration({
      sessionId,
      objectCode: typeof body.objectCode === "string" ? body.objectCode.slice(0, 80) : null,
      variableCode: typeof body.variableCode === "string" ? body.variableCode.slice(0, 80) : null,
      from: Number.isFinite(Number(body.from)) ? Number(body.from) : null,
      to: Number.isFinite(Number(body.to)) ? Number(body.to) : null,
      path: typeof body.path === "string" ? body.path.slice(0, 500) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
