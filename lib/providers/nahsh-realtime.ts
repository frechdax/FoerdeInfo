import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { cached } from "@/lib/cache";
import { estimateVehicle } from "@/lib/realtime/estimate";
import type { ProviderStatus, ServiceAlertSnapshot, TransitRealtimeProvider, TripUpdateSnapshot, Vehicle } from "@/lib/types";

const DEFAULT_URL = "https://realtime.gtfs.de/realtime-free.pb";

type Snapshot = { tripUpdates: TripUpdateSnapshot[]; alerts: ServiceAlertSnapshot[]; fetchedAt: string };

export class NahSHRealtimeProvider implements TransitRealtimeProvider {
  readonly id = "nahsh-realtime";
  readonly name = "GTFS.de Realtime (Schleswig-Holstein enthalten)";
  private lastUpdate?: string;
  private lastError?: string;

  private async snapshot(): Promise<Snapshot> {
    const url = process.env.GTFS_RT_URL || DEFAULT_URL;
    return cached("gtfs-rt", 9_000, async () => {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: { "user-agent": "BusKarte/0.1" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
        const tripUpdates: TripUpdateSnapshot[] = [];
        const alerts: ServiceAlertSnapshot[] = [];

        for (const entity of feed.entity) {
          if (entity.tripUpdate?.trip?.tripId) {
            const tu = entity.tripUpdate;
            tripUpdates.push({
              tripId: tu.trip.tripId!,
              routeId: tu.trip.routeId || undefined,
              startDate: tu.trip.startDate || undefined,
              timestamp: tu.timestamp ? new Date(Number(tu.timestamp) * 1000).toISOString() : undefined,
              delaySeconds: tu.delay != null ? Number(tu.delay) : undefined,
              stopUpdates: (tu.stopTimeUpdate || []).map((s) => ({
                stopId: s.stopId || undefined,
                stopSequence: s.stopSequence == null ? undefined : Number(s.stopSequence),
                arrivalTime: s.arrival?.time == null ? undefined : Number(s.arrival.time),
                departureTime: s.departure?.time == null ? undefined : Number(s.departure.time),
                arrivalDelay: s.arrival?.delay == null ? undefined : Number(s.arrival.delay),
                departureDelay: s.departure?.delay == null ? undefined : Number(s.departure.delay),
              })),
            });
          }
          if (entity.alert) {
            const text = (translation: unknown) => {
              const obj = translation as { translation?: Array<{ text?: string }> } | undefined;
              return obj?.translation?.map((x) => x.text).filter(Boolean).join(" · ");
            };
            alerts.push({ id: entity.id, header: text(entity.alert.headerText), description: text(entity.alert.descriptionText) });
          }
        }
        this.lastUpdate = new Date().toISOString();
        this.lastError = undefined;
        return { tripUpdates, alerts, fetchedAt: this.lastUpdate };
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        throw error;
      }
    });
  }

  async getVehicles(): Promise<Vehicle[]> {
    // The free GTFS.de realtime feed is paired with GTFS.de static IDs. Our primary
    // static source is the official NAH.SH GTFS, and a live compatibility check found
    // zero direct trip-id matches. Do not attach delays to the wrong journeys.
    if (process.env.GTFS_RT_TRIP_IDS_COMPATIBLE !== "true") return [];
    const snapshot = await this.snapshot();
    return snapshot.tripUpdates.map((u) => estimateVehicle(u)).filter((v): v is Vehicle => Boolean(v));
  }

  async getTripUpdates() {
    if (process.env.GTFS_RT_ENABLE !== "true") return [];
    return (await this.snapshot()).tripUpdates;
  }

  async getServiceAlerts() {
    if (process.env.GTFS_RT_ENABLE !== "true") return [];
    return (await this.snapshot()).alerts;
  }

  getLastUpdate() { return this.lastUpdate; }

  async getProviderStatus(): Promise<ProviderStatus> {
    if (process.env.GTFS_RT_TRIP_IDS_COMPATIBLE !== "true") {
      return {
        id: this.id,
        name: this.name,
        state: "degraded",
        detail: "Öffentlicher Realtime-Feed vorhanden, aber seine Trip-IDs passen nicht zum offiziellen NAH.SH-GTFS (0 direkte Matches im Kompatibilitätstest). Daher keine falsche Zuordnung von Verspätungen oder Positionen.",
      };
    }
    try {
      const snap = await this.snapshot();
      return { id: this.id, name: this.name, state: "online", lastUpdate: snap.fetchedAt, detail: `${snap.tripUpdates.length} TripUpdates · keine allgemeinen VehiclePositions im freien Feed` };
    } catch {
      return { id: this.id, name: this.name, state: "offline", lastUpdate: this.lastUpdate, detail: this.lastError || "Feed nicht erreichbar" };
    }
  }
}
