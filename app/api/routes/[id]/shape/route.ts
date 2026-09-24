import { NextResponse } from "next/server";
import { getRegionData, getShape } from "@/lib/gtfs/store";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tripId = new URL(req.url).searchParams.get("tripId");
  const trip = getRegionData().trips.find((t) => t.routeId === id && (!tripId || t.id === tripId) && t.shapeId && getShape(t.shapeId))
    || getRegionData().trips.find((t) => t.routeId === id && t.shapeId && getShape(t.shapeId));
  const shape = trip?.shapeId ? getShape(trip.shapeId) : undefined;
  if (!shape) return NextResponse.json({ routeId: id, geometry: null, reason: "Kein shape verfügbar" });
  return NextResponse.json({ routeId: id, geometry: { type: "LineString", coordinates: shape } });
}
