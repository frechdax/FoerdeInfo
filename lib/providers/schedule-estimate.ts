import { cached } from "@/lib/cache";
import { getAgencyName, getRegionData, getRoute, getShape, getStop } from "@/lib/gtfs/store";
import { candidateServiceClocks, gtfsSeconds, isServiceActive } from "@/lib/time";
import type { ProviderStatus, ServiceAlertSnapshot, TransitRealtimeProvider, TripUpdateSnapshot, Vehicle } from "@/lib/types";

function distance(a: [number, number], b: [number, number]) {
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function interpolatePath(points: [number, number][], ratio: number): [number, number] {
  if (points.length === 1) return points[0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
    lengths.push(total);
  }
  if (!total) return points[0];
  const target = Math.max(0, Math.min(1, ratio)) * total;
  let previous = 0;
  for (let i = 1; i < points.length; i++) {
    const current = lengths[i - 1];
    if (target <= current) {
      const local = current === previous ? 0 : (target - previous) / (current - previous);
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * local,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * local,
      ];
    }
    previous = current;
  }
  return points[points.length - 1];
}

function segmentPath(shape: [number, number][], from: [number, number], to: [number, number]): [number, number][] | undefined {
  const nearest = (point: [number, number]) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < shape.length; i++) {
      const d = distance(shape[i], point);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
    return bestIndex;
  };

  const a = nearest(from);
  const b = nearest(to);
  const part = a <= b ? shape.slice(a, b + 1) : shape.slice(b, a + 1).reverse();

  // Never fabricate a straight connection when the route shape cannot
  // resolve a usable segment between two stops.
  return part.length >= 2 ? part : undefined;
}

function colorFor(value?: string) {
  return value ? `#${value.replace(/^#/, "")}` : undefined;
}

export class ScheduleEstimateProvider implements TransitRealtimeProvider {
  readonly id = "schedule-estimate";
  readonly name = "NAH.SH Fahrplan-Positionsschätzung";
  private lastUpdate?: string;

  async getVehicles(): Promise<Vehicle[]> {
    return cached("schedule-estimated-vehicles", 9_000, async () => {
      const now = new Date();
      const data = getRegionData();
      const clocks = candidateServiceClocks(now);
      const vehicles: Vehicle[] = [];
      const seen = new Set<string>();

      for (const trip of data.trips) {
        if (!trip.shapeId || trip.stops.length < 2 || seen.has(trip.id)) continue;
        const shape = getShape(trip.shapeId);
        if (!shape || shape.length < 2) continue;

        for (const clock of clocks) {
          if (!isServiceActive(data, trip.serviceId, clock.serviceDate)) continue;

          const first = gtfsSeconds(trip.stops[0].departure);
          const last = gtfsSeconds(trip.stops[trip.stops.length - 1].arrival);
          if (clock.currentSeconds < first || clock.currentSeconds > last) continue;

          let segmentIndex = -1;
          let departure = 0;
          let arrival = 0;
          for (let i = 0; i < trip.stops.length - 1; i++) {
            const a = trip.stops[i];
            const b = trip.stops[i + 1];
            const dep = gtfsSeconds(a.departure);
            const arr = gtfsSeconds(b.arrival);
            if (clock.currentSeconds >= dep && clock.currentSeconds <= arr) {
              segmentIndex = i;
              departure = dep;
              arrival = arr;
              break;
            }
          }
          if (segmentIndex < 0) continue;

          const aStop = getStop(trip.stops[segmentIndex].stopId);
          const bStop = getStop(trip.stops[segmentIndex + 1].stopId);
          if (!aStop || !bStop) continue;

          const ratio = arrival <= departure ? 0 : (clock.currentSeconds - departure) / (arrival - departure);
          const path = segmentPath(shape, [aStop.lon, aStop.lat], [bStop.lon, bStop.lat]);
          if (!path) continue;

          const [longitude, latitude] = interpolatePath(path, ratio);
          const route = getRoute(trip.routeId);

          vehicles.push({
            id: `schedule:${trip.id}`,
            line: route?.shortName || route?.longName || trip.routeId,
            routeId: trip.routeId,
            tripId: trip.id,
            operator: getAgencyName(route?.agencyId) || "Unbekannter Betreiber",
            destination: trip.headsign,
            latitude,
            longitude,
            nextStop: bStop.name,
            nextStopId: bStop.id,
            nextArrival: new Date(now.getTime() + Math.max(0, arrival - clock.currentSeconds) * 1000).toISOString(),
            timestamp: now.toISOString(),
            accuracyType: "estimated",
            source: "NAH.SH GTFS Fahrplan · ohne Echtzeitkorrektur",
            color: colorFor(route?.color),
          });

          seen.add(trip.id);
          break;
        }
      }

      this.lastUpdate = now.toISOString();
      return vehicles;
    });
  }

  async getTripUpdates(): Promise<TripUpdateSnapshot[]> { return []; }
  async getServiceAlerts(): Promise<ServiceAlertSnapshot[]> { return []; }
  getLastUpdate() { return this.lastUpdate; }

  async getProviderStatus(): Promise<ProviderStatus> {
    const vehicles = await this.getVehicles();
    return {
      id: this.id,
      name: this.name,
      state: "online",
      lastUpdate: this.lastUpdate,
      detail: `${vehicles.length} aktuell fahrende Busse aus Fahrplan + echter GTFS-Liniengeometrie geschätzt · keine Echtzeitkorrektur`,
    };
  }
}
