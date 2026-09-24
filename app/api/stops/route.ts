import { NextResponse } from "next/server";
import { getRegionData } from "@/lib/gtfs/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 250)));
  const stops = getRegionData().stops.filter((s) => !q || s.name.toLowerCase().includes(q)).slice(0, limit);
  return NextResponse.json({ stops });
}
