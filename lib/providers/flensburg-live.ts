import { insideRegion } from "@/lib/region";
import type { ProviderStatus, ServiceAlertSnapshot, TransitRealtimeProvider, TripUpdateSnapshot, Vehicle } from "@/lib/types";

function toNumber(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : undefined; }

export class FlensburgLiveProvider implements TransitRealtimeProvider {
  readonly id = "flensburg-live";
  readonly name = "Aktiv Bus Flensburg GPS";
  private lastUpdate?: string;
  private lastError?: string;

  async getVehicles(): Promise<Vehicle[]> {
    const url = process.env.FLENSBURG_LIVE_API_URL;
    if (!url) return [];
    try {
      const headers: HeadersInit = { accept: "application/json", "user-agent": "BusRadar/0.1" };
      if (process.env.FLENSBURG_LIVE_API_KEY) headers.authorization = `Bearer ${process.env.FLENSBURG_LIVE_API_KEY}`;
      const response = await fetch(url, { cache: "no-store", headers, signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json() as unknown;
      const list = Array.isArray(raw) ? raw : (raw as { vehicles?: unknown[] })?.vehicles || [];
      const vehicles: Vehicle[] = [];
      for (const item of list) {
        const v = item as Record<string, unknown>;
        const latitude = toNumber(v.latitude ?? v.lat);
        const longitude = toNumber(v.longitude ?? v.lon ?? v.lng);
        const line = String(v.line ?? v.routeShortName ?? v.route ?? "").trim();
        if (latitude == null || longitude == null || !line || !insideRegion(latitude, longitude)) continue;
        vehicles.push({
          id: String(v.id ?? v.vehicleId ?? `fl-${line}-${latitude}-${longitude}`),
          line,
          routeId: String(v.routeId ?? v.route ?? line),
          tripId: v.tripId ? String(v.tripId) : undefined,
          operator: String(v.operator ?? "Aktiv Bus Flensburg"),
          destination: v.destination ? String(v.destination) : undefined,
          latitude,
          longitude,
          bearing: toNumber(v.bearing),
          speed: toNumber(v.speed),
          delaySeconds: toNumber(v.delaySeconds ?? v.delay),
          nextStop: v.nextStop ? String(v.nextStop) : undefined,
          nextArrival: v.nextArrival ? String(v.nextArrival) : undefined,
          timestamp: String(v.timestamp ?? new Date().toISOString()),
          accuracyType: "gps",
          source: "Flensburg Live Provider",
          color: v.color ? String(v.color) : undefined,
        });
      }
      this.lastUpdate = new Date().toISOString();
      this.lastError = undefined;
      return vehicles;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async getTripUpdates(): Promise<TripUpdateSnapshot[]> { return []; }
  async getServiceAlerts(): Promise<ServiceAlertSnapshot[]> { return []; }
  getLastUpdate() { return this.lastUpdate; }
  async getProviderStatus(): Promise<ProviderStatus> {
    if (!process.env.FLENSBURG_LIVE_API_URL) {
      return { id: this.id, name: this.name, state: "disabled", detail: "Deaktiviert: Die Nutzungsbedingungen des öffentlichen Busradars untersagen automatisierten Datenabruf/App-Integration ohne ausdrückliche schriftliche Genehmigung. Nur einen separat freigegebenen Endpoint konfigurieren." };
    }
    try {
      const vehicles = await this.getVehicles();
      return { id: this.id, name: this.name, state: vehicles.length ? "online" : "degraded", lastUpdate: this.lastUpdate, detail: `${vehicles.length} GPS-Fahrzeuge empfangen` };
    } catch {
      return { id: this.id, name: this.name, state: "offline", lastUpdate: this.lastUpdate, detail: this.lastError || "Endpoint nicht erreichbar" };
    }
  }
}
