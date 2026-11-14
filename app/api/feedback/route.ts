import { NextResponse } from "next/server";
import { logFeedback } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : "";
    const rating = Number(body.rating);
    if (!sessionId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await logFeedback({
      sessionId,
      objectCode: typeof body.objectCode === "string" ? body.objectCode.slice(0, 80) : null,
      variableCode: typeof body.variableCode === "string" ? body.variableCode.slice(0, 80) : null,
      rating: Math.round(rating),
      comment: typeof body.comment === "string" ? body.comment.slice(0, 2000) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
