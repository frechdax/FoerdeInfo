import { NextResponse } from "next/server";
import { getRegionData, getRoute } from "@/lib/gtfs/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const route = getRoute(id);
  if (!route) return NextResponse.json({ error: "Route nicht gefunden" }, { status: 404 });
  const trips = getRegionData().trips.filter((t) => t.routeId === id).slice(0, 50);
  return NextResponse.json({ route, trips });
}
