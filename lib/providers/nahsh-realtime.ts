import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { cached } from "@/lib/cache";
import { estimateVehicle } from "@/lib/realtime/estimate";
import { getRealtimeTripMapStats, resolveRealtimeTripId } from "@/lib/realtime/crosswalk";
import type { ProviderStatus, ServiceAlertSnapshot, TransitRealtimeProvider, TripUpdateSnapshot, Vehicle } from "@/lib/types";

const DEFAULT_URL = "https://realtime.gtfs.de/realtime-free.pb";

type Snapshot = { tripUpdates: TripUpdateSnapshot[]; alerts: ServiceAlertSnapshot[]; fetchedAt: string };

export class NahSHRealtimeProvider implements TransitRealtimeProvider {
  readonly id = "nahsh-realtime";
  readonly name = "GTFS.de Echtzeit · Schleswig-Holstein";
  private lastUpdate?: string;
  private lastError?: string;

  private async snapshot(): Promise<Snapshot> {
    const url = process.env.GTFS_RT_URL || DEFAULT_URL;
    return cached("gtfs-rt", 8_000, async () => {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: { "user-agent": "BusKarte/0.2" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const bytes = new Uint8Array(await response.arrayBuffer());
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
        const feedTimestamp = feed.header.timestamp
          ? new Date(Number(feed.header.timestamp) * 1000).toISOString()
          : new Date().toISOString();

        const tripUpdates: TripUpdateSnapshot[] = [];
        const alerts: ServiceAlertSnapshot[] = [];

        for (const entity of feed.entity) {
          if (entity.tripUpdate?.trip?.tripId) {
            const tu = entity.tripUpdate;
            tripUpdates.push({
              tripId: tu.trip.tripId!,
              routeId: tu.trip.routeId || undefined,
              startDate: tu.trip.startDate || undefined,
              timestamp: tu.timestamp ? new Date(Number(tu.timestamp) * 1000).toISOString() : feedTimestamp,
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
            alerts.push({
              id: entity.id,
              header: text(entity.alert.headerText),
              description: text(entity.alert.descriptionText),
            });
          }
        }

        this.lastUpdate = feedTimestamp;
        this.lastError = undefined;
        return { tripUpdates, alerts, fetchedAt: feedTimestamp };
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        throw error;
      }
    });
  }

  private mapUpdate(update: TripUpdateSnapshot): TripUpdateSnapshot | undefined {
    const localTripId = resolveRealtimeTripId(update.tripId, update.startDate);
    return localTripId ? { ...update, tripId: localTripId } : undefined;
  }

  async getVehicles(): Promise<Vehicle[]> {
    const snapshot = await this.snapshot();
    const now = new Date();
    const vehicles: Vehicle[] = [];

    for (const update of snapshot.tripUpdates) {
      const mapped = this.mapUpdate(update);
      if (!mapped) continue;
      const vehicle = estimateVehicle(mapped, now);
      if (!vehicle) continue;
      vehicles.push({
        ...vehicle,
        id: `realtime:${mapped.tripId}`,
        accuracyType: "realtime",
        source: "GTFS.de Echtzeit-Prognose · NAH.SH Liniengeometrie",
      });
    }

    return vehicles;
  }

  async getTripUpdates() {
    const snapshot = await this.snapshot();
    return snapshot.tripUpdates
      .map((update) => this.mapUpdate(update))
      .filter((update): update is TripUpdateSnapshot => Boolean(update));
  }

  async getServiceAlerts() {
    return (await this.snapshot()).alerts;
  }

  getLastUpdate() { return this.lastUpdate; }

  async getProviderStatus(): Promise<ProviderStatus> {
    const stats = getRealtimeTripMapStats();
    if (!stats.matchedRealtimeTrips) {
      return {
        id: this.id,
        name: this.name,
        state: "degraded",
        detail: "Realtime-Feed ist verfügbar, aber der Trip-Crosswalk wurde noch nicht erzeugt. GTFS-Refresh ausführen.",
      };
    }

    try {
      const snapshot = await this.snapshot();
      const mappedNow = snapshot.tripUpdates.filter((u) => Boolean(resolveRealtimeTripId(u.tripId, u.startDate))).length;
      return {
        id: this.id,
        name: this.name,
        state: mappedNow ? "online" : "degraded",
        lastUpdate: snapshot.fetchedAt,
        detail: `${mappedNow} aktuelle Realtime-Fahrten in der Region zugeordnet · Crosswalk: ${stats.matchedRealtimeTrips}/${stats.regionalRealtimeTrips} regionale GTFS.de-Fahrten`,
      };
    } catch {
      return {
        id: this.id,
        name: this.name,
        state: "offline",
        lastUpdate: this.lastUpdate,
        detail: this.lastError || "Realtime-Feed nicht erreichbar",
      };
    }
  }
}
