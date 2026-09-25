import { NextRequest, NextResponse } from "next/server";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";
import { inArea, type Point, type WayReport } from "@/lib/wege";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cooldowns = new Map<string, number>();
const KINDS = new Set(["blocked", "construction", "surface", "flooding", "other"]);
const MODES = new Set(["walk", "stroller", "bike", "wheelchair", "all"]);

function limited(request: NextRequest, action: string, delayMs: number): boolean {
  const id = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${id}:${action}`;
  const now = Date.now();
  if ((cooldowns.get(key) || 0) > now) return true;
  cooldowns.set(key, now + delayMs);
  if (cooldowns.size > 3000) for (const [k, until] of cooldowns) if (until < now) cooldowns.delete(k);
  return false;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return !!origin && !!host && new URL(origin).host === host;
}

export async function GET() {
  const db = createPublicServerSupabase();
  const { data, error } = await db.from("way_reports")
    .select("id,latitude,longitude,kind,mode,description,photo_data,created_at,expires_at")
    .eq("status", "active").gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: "Meldungen momentan nicht abrufbar." }, { status: 503 });
  const reports = (data || []) as WayReport[];
  const ids = reports.map(r => r.id);
  const votesResult = ids.length ? await db.from("way_report_votes").select("report_id,verdict").in("report_id", ids).limit(1000) : null;
  const votes: Record<string, { still: number; clear: number }> = {};
  for (const vote of votesResult?.data || []) {
    const entry = votes[vote.report_id] ||= { still: 0, clear: 0 };
    if (vote.verdict === "clear") entry.clear += 1;
    if (vote.verdict === "still") entry.still += 1;
  }
  return NextResponse.json({ reports, votes, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Ungültige Herkunft." }, { status: 403 });
  if (limited(request, "report", 60_000)) return NextResponse.json({ error: "Bitte warte eine Minute vor der nächsten Meldung." }, { status: 429 });
  if (Number(request.headers.get("content-length") || 0) > 160_000) return NextResponse.json({ error: "Foto zu groß." }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 }); }
  if (body.website) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  const point: Point = { lat: Number(body.latitude), lon: Number(body.longitude) };
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const photo = typeof body.photo_data === "string" ? body.photo_data : null;
  if (!inArea(point) || !KINDS.has(String(body.kind)) || !MODES.has(String(body.mode)) || description.length < 8 || description.length > 280 ||
    (photo !== null && (photo.length > 140000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)))) {
    return NextResponse.json({ error: "Bitte eine gültige Stelle, Art und kurze Beschreibung angeben." }, { status: 400 });
  }
  const { data, error } = await createPublicServerSupabase().from("way_reports").insert({
    latitude: point.lat, longitude: point.lon, kind: body.kind, mode: body.mode,
    description, photo_data: photo,
  }).select("id").single();
  if (error) return NextResponse.json({ error: "Die Meldung konnte nicht gespeichert werden." }, { status: 503 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
