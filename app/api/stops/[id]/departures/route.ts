import { NextResponse } from "next/server";
import { getRegionData, getRoute, getStop } from "@/lib/gtfs/store";
import { candidateServiceClocks, gtfsSeconds, isServiceActive } from "@/lib/time";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stop = getStop(id);
  if (!stop) return NextResponse.json({ error: "Haltestelle nicht gefunden" }, { status: 404 });
  const data = getRegionData();
  const now = new Date();
  const departures = data.trips.flatMap((trip) => {
    const st = trip.stops.find((s) => s.stopId === id);
    if (!st) return [];
    const route = getRoute(trip.routeId);
    const scheduledSeconds = gtfsSeconds(st.departure);

    for (const clock of candidateServiceClocks(now)) {
      if (!isServiceActive(data, trip.serviceId, clock.serviceDate)) continue;
      if (scheduledSeconds < clock.currentSeconds || scheduledSeconds > clock.currentSeconds + 7200) continue;
      return [{
        tripId: trip.id,
        line: route?.shortName || route?.longName || trip.routeId,
        destination: trip.headsign,
        departure: st.departure,
        inMinutes: Math.max(0, Math.round((scheduledSeconds - clock.currentSeconds) / 60)),
      }];
    }
    return [];
  }).sort((a,b) => a.inMinutes-b.inMinutes).slice(0, 20);
  return NextResponse.json({ stop, departures });
}
