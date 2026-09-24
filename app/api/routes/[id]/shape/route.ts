import { NextResponse } from "next/server";
import { getRegionData, getShape, getStop } from "@/lib/gtfs/store";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tripId = new URL(req.url).searchParams.get("tripId");
  const data = getRegionData();

  const trip = data.trips.find((t) => t.routeId === id && (!tripId || t.id === tripId) && t.shapeId && getShape(t.shapeId))
    || data.trips.find((t) => t.routeId === id && t.shapeId && getShape(t.shapeId));

  const shape = trip?.shapeId ? getShape(trip.shapeId) : undefined;
  if (!trip || !shape) {
    return NextResponse.json({ routeId: id, geometry: null, reason: "Kein shape verfügbar" });
  }

  const firstTripStop = trip.stops[0];
  const lastTripStop = trip.stops[trip.stops.length - 1];
  const firstStop = firstTripStop ? getStop(firstTripStop.stopId) : undefined;
  const lastStop = lastTripStop ? getStop(lastTripStop.stopId) : undefined;

  return NextResponse.json({
    routeId: id,
    tripId: trip.id,
    geometry: { type: "LineString", coordinates: shape },
    start: firstStop ? {
      id: firstStop.id,
      name: firstStop.name,
      latitude: firstStop.lat,
      longitude: firstStop.lon,
      departure: firstTripStop?.departure,
    } : null,
    end: lastStop ? {
      id: lastStop.id,
      name: lastStop.name,
      latitude: lastStop.lat,
      longitude: lastStop.lon,
      arrival: lastTripStop?.arrival,
    } : null,
  });
}
