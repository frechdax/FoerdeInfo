import { NextRequest, NextResponse } from "next/server";
import { inArea } from "@/lib/wege";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (query.length < 3 || query.length > 100) return NextResponse.json({ error: "Bitte einen Ort oder eine Adresse eingeben." }, { status: 400 });
  try {
    const params = new URLSearchParams({
      q: query, format: "jsonv2", limit: "4", countrycodes: "de", addressdetails: "0",
      viewbox: "9.27,54.95,9.87,54.68", bounded: "1", "accept-language": "de",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "foerde.info Wegecheck/1.0 (https://xn--frde-5qa.info; Kontakt: /partner)", "Accept-Language": "de" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Suche nicht erreichbar");
    const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
    return NextResponse.json({ matches: results.map((r) => ({ lat: Number(r.lat), lon: Number(r.lon), label: r.display_name })).filter(inArea) });
  } catch {
    return NextResponse.json({ error: "Die Adresssuche ist gerade nicht erreichbar. Bitte einen Punkt auf der Karte setzen." }, { status: 503 });
  }
}
