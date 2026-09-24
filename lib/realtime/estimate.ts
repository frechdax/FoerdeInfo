import { getAgencyName, getRoute, getShape, getStop, getTrip } from "@/lib/gtfs/store";
import { berlinParts, gtfsSeconds, serviceSecondsForDate } from "@/lib/time";
import type { TripUpdateSnapshot, Vehicle } from "@/lib/types";

function distance(a: [number, number], b: [number, number]) {
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function interpolatePath(points: [number, number][], ratio: number): [number, number] {
  if (!points.length) return [0, 0];
  if (points.length === 1) return points[0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
    lengths.push(total);
  }
  const target = Math.max(0, Math.min(1, ratio)) * total;
  let prev = 0;
  for (let i = 1; i < points.length; i++) {
    const curr = lengths[i - 1];
    if (target <= curr) {
      const local = curr === prev ? 0 : (target - prev) / (curr - prev);
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * local,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * local,
      ];
    }
    prev = curr;
  }
  return points[points.length - 1];
}

function sliceShape(shape: [number, number][], from: [number, number], to: [number, number]) {
  if (!shape.length) return [from, to] as [number, number][];
  const nearest = (point: [number, number]) => {
    let idx = 0, best = Number.POSITIVE_INFINITY;
    shape.forEach((p, i) => {
      const d = distance(p, point);
      if (d < best) { best = d; idx = i; }
    });
    return idx;
  };
  const a = nearest(from), b = nearest(to);
  if (a <= b) return shape.slice(a, b + 1);
  return shape.slice(b, a + 1).reverse();
}

function stopRealtime(update: TripUpdateSnapshot, stopId: string, sequence: number) {
  return update.stopUpdates.find((s) => s.stopId === stopId)
    || update.stopUpdates.find((s) => s.stopSequence === sequence);
}

export function estimateVehicle(update: TripUpdateSnapshot, now = new Date()): Vehicle | null {
  const trip = getTrip(update.tripId);
  if (!trip || trip.stops.length < 2) return null;
  const route = getRoute(trip.routeId);
  const serviceDate = update.startDate && /^\d{8}$/.test(update.startDate) ? update.startDate : berlinParts(now).ymd;
  const current = serviceSecondsForDate(serviceDate, now);

  let segment = -1;
  let segmentDeparture = 0;
  let segmentArrival = 0;
  let effectiveDelay = update.delaySeconds ?? 0;

  for (let i = 0; i < trip.stops.length - 1; i++) {
    const a = trip.stops[i];
    const b = trip.stops[i + 1];
    const aRt = stopRealtime(update, a.stopId, a.sequence);
    const bRt = stopRealtime(update, b.stopId, b.sequence);
    const departDelay = aRt?.departureDelay ?? aRt?.arrivalDelay ?? update.delaySeconds ?? 0;
    const arriveDelay = bRt?.arrivalDelay ?? bRt?.departureDelay ?? update.delaySeconds ?? departDelay;
    const depart = gtfsSeconds(a.departure) + departDelay;
    const arrive = gtfsSeconds(b.arrival) + arriveDelay;
    if (current >= depart && current <= arrive) {
      segment = i;
      segmentDeparture = depart;
      segmentArrival = arrive;
      effectiveDelay = arriveDelay;
      break;
    }
  }
  if (segment < 0) return null;

  const aStop = getStop(trip.stops[segment].stopId);
  const bStop = getStop(trip.stops[segment + 1].stopId);
  if (!aStop || !bStop) return null;
  const ratio = segmentArrival <= segmentDeparture ? 0 : (current - segmentDeparture) / (segmentArrival - segmentDeparture);

  const from: [number, number] = [aStop.lon, aStop.lat];
  const to: [number, number] = [bStop.lon, bStop.lat];
  const shape = getShape(trip.shapeId);
  // No shape => no position. A straight line would falsely imply a route the bus may not take.
  if (!shape?.length) return null;
  const path = sliceShape(shape, from, to);
  const [longitude, latitude] = interpolatePath(path, ratio);
  const feedTimestamp = update.timestamp && !Number.isNaN(Date.parse(update.timestamp)) ? update.timestamp : now.toISOString();

  return {
    id: `estimated:${trip.id}`,
    line: route?.shortName || route?.longName || trip.routeId,
    routeId: trip.routeId,
    tripId: trip.id,
    operator: getAgencyName(route?.agencyId) || "Unbekannter Betreiber",
    destination: trip.headsign,
    latitude,
    longitude,
    delaySeconds: effectiveDelay,
    nextStop: bStop.name,
    nextStopId: bStop.id,
    nextArrival: new Date(now.getTime() + Math.max(0, segmentArrival - current) * 1000).toISOString(),
    timestamp: feedTimestamp,
    accuracyType: "estimated",
    source: "GTFS + GTFS-RT (Shape-Interpolation)",
    color: route?.color ? `#${route.color.replace(/^#/, "")}` : undefined,
  };
}
