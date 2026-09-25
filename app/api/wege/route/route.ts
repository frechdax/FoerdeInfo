import { NextRequest, NextResponse } from "next/server";
import { inArea, type Point } from "@/lib/wege";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const start: Point = { lat: Number(params.get("slat")), lon: Number(params.get("slon")) };
  const end: Point = { lat: Number(params.get("elat")), lon: Number(params.get("elon")) };
  const mode = params.get("mode");
  if (!inArea(start) || !inArea(end) || !["walk", "stroller", "bike", "wheelchair"].includes(mode || "")) {
    return NextResponse.json({ error: "Start, Ziel oder Verkehrsart liegt außerhalb des Angebots." }, { status: 400 });
  }

  // FOSSGIS bietet Fuß- und Fahrradrouten. Es liefert keine geprüfte Rollstuhlroute.
  const profile = mode === "bike" ? "bike" : "foot";
  const coords = [start, end].map((p) => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "foerde.info Wegecheck/1.0 (https://xn--frde-5qa.info; Kontakt: /partner)" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Routing: ${response.status}`);
    const data = await response.json() as { code?: string; routes?: Array<{ distance: number; duration: number; geometry?: { coordinates?: [number, number][] } }> };
    const path = data.routes?.[0];
    if (data.code !== "Ok" || !path?.geometry?.coordinates?.length) throw new Error("Keine Route gefunden");
    return NextResponse.json({
      coordinates: path.geometry.coordinates,
      distance: path.distance,
      duration: path.duration,
      profile,
      accessibilityVerified: false,
      source: "https://routing.openstreetmap.de/about.html",
      message: mode === "wheelchair" ? "Fußroute: Eignung für Rollstühle nicht geprüft." :
        mode === "stroller" ? "Fußroute: Eignung für Kinderwagen nicht vollständig geprüft." : null,
    });
  } catch {
    return NextResponse.json({ error: "Die Routenberechnung ist gerade nicht erreichbar. Markierungen auf der Karte bleiben sichtbar." }, { status: 503 });
  }
}
