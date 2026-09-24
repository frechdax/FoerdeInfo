import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { cached } from "@/lib/cache";
import { estimateVehicle } from "@/lib/realtime/estimate";
import type { ProviderStatus, ServiceAlertSnapshot, TransitRealtimeProvider, TripUpdateSnapshot, Vehicle } from "@/lib/types";

const DEFAULT_URL = "https://realtime.gtfs.de/realtime-free.pb";

type Snapshot = { tripUpdates: TripUpdateSnapshot[]; alerts: ServiceAlertSnapshot[]; fetchedAt: string };

export class NahSHRealtimeProvider implements TransitRealtimeProvider {
  readonly id = "nahsh-realtime";
  readonly name = "Schleswig-Holstein Realtime (GTFS-RT)";
  private lastUpdate?: string;
  private lastError?: string;

  private async snapshot(): Promise<Snapshot> {
    const url = process.env.GTFS_RT_URL || DEFAULT_URL;
    return cached("gtfs-rt", 9_000, async () => {
      try {
        const response = await fetch(url, { cache: "no-store", headers: { "user-agent": "BusRadar/0.1" }, signal: AbortSignal.timeout(8_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
        const tripUpdates: TripUpdateSnapshot[] = [];
        const alerts: ServiceAlertSnapshot[] = [];

        for (const entity of feed.entity) {
          if (entity.tripUpdate?.trip?.tripId) {
            const tu = entity.tripUpdate;
            const firstDelay = tu.delay != null ? Number(tu.delay) : undefined;
            tripUpdates.push({
              tripId: tu.trip.tripId,
              routeId: tu.trip.routeId || undefined,
              startDate: tu.trip.startDate || undefined,
              timestamp: tu.timestamp ? new Date(Number(tu.timestamp) * 1000).toISOString() : undefined,
              delaySeconds: firstDelay,
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
    const snapshot = await this.snapshot();
    return snapshot.tripUpdates.map((u) => estimateVehicle(u)).filter((v): v is Vehicle => Boolean(v));
  }
  async getTripUpdates() { return (await this.snapshot()).tripUpdates; }
  async getServiceAlerts() { return (await this.snapshot()).alerts; }
  getLastUpdate() { return this.lastUpdate; }
  async getProviderStatus(): Promise<ProviderStatus> {
    try {
      const snap = await this.snapshot();
      return { id: this.id, name: this.name, state: "online", lastUpdate: snap.fetchedAt, detail: `${snap.tripUpdates.length} TripUpdates · keine VehiclePositions im freien Feed` };
    } catch {
      return { id: this.id, name: this.name, state: "offline", lastUpdate: this.lastUpdate, detail: this.lastError || "Feed nicht erreichbar" };
    }
  }
}
