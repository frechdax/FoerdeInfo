import { NextRequest, NextResponse } from "next/server";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "Ungültige Herkunft." }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) return NextResponse.json({ error: "Ungültige Meldung." }, { status: 400 });
  let body: { verdict?: string; viewerId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 }); }
  if (!["still", "clear"].includes(body.verdict || "") || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(body.viewerId || "")) {
    return NextResponse.json({ error: "Ungültige Bestätigung." }, { status: 400 });
  }
  const { error } = await createPublicServerSupabase().from("way_report_votes").insert({ report_id: id, viewer_id: body.viewerId, verdict: body.verdict });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Du hast diese Stelle bereits bewertet." : "Bestätigung derzeit nicht möglich." }, { status: error.code === "23505" ? 409 : 503 });
  return NextResponse.json({ ok: true });
}
