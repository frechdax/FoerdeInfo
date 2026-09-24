import { XMLParser } from "fast-xml-parser";
import { cached } from "@/lib/cache";
import { estimateVehicle } from "@/lib/realtime/estimate";
import type { ProviderStatus, ServiceAlertSnapshot, TransitRealtimeProvider, TripUpdateSnapshot, Vehicle } from "@/lib/types";

function arr<T>(value: T | T[] | undefined): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

function valueOf(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && value && "#text" in value) return String((value as { "#text": unknown })["#text"]);
  return undefined;
}

export class SiriEtProvider implements TransitRealtimeProvider {
  readonly id = "siri-et-sh";
  readonly name = "DELFI SIRI-ET Schleswig-Holstein";
  private lastUpdate?: string;
  private lastError?: string;

  async getTripUpdates(): Promise<TripUpdateSnapshot[]> {
    const url = process.env.SIRI_ET_SH_URL;
    if (!url) return [];

    return cached("siri-et-sh", 15_000, async () => {
      try {
        const headers: HeadersInit = {
          accept: "application/xml,text/xml",
          "user-agent": "BusKarte/0.1",
        };
        if (process.env.SIRI_ET_SH_AUTHORIZATION) {
          headers.authorization = process.env.SIRI_ET_SH_AUTHORIZATION;
        }

        const response = await fetch(url, {
          cache: "no-store",
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const xml = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
        const doc = parser.parse(xml) as any;
        const deliveries = arr(doc?.Siri?.ServiceDelivery?.EstimatedTimetableDelivery);
        const out: TripUpdateSnapshot[] = [];

        for (const delivery of deliveries) {
          for (const frame of arr(delivery?.EstimatedJourneyVersionFrame)) {
            for (const journey of arr(frame?.EstimatedVehicleJourney)) {
              const tripId =
                valueOf(journey?.DatedVehicleJourneyRef)
                || valueOf(journey?.FramedVehicleJourneyRef?.DatedVehicleJourneyRef);
              if (!tripId) continue;

              const calls = arr(journey?.EstimatedCalls?.EstimatedCall);
              const stopUpdates = calls.map((call: any) => ({
                stopId: valueOf(call?.StopPointRef),
                stopSequence: call?.Order == null ? undefined : Number(call.Order),
                arrivalTime: call?.ExpectedArrivalTime ? Math.floor(new Date(call.ExpectedArrivalTime).getTime() / 1000) : undefined,
                departureTime: call?.ExpectedDepartureTime ? Math.floor(new Date(call.ExpectedDepartureTime).getTime() / 1000) : undefined,
              }));

              out.push({
                tripId,
                routeId: valueOf(journey?.LineRef),
                timestamp: new Date().toISOString(),
                stopUpdates,
              });
            }
          }
        }

        this.lastUpdate = new Date().toISOString();
        this.lastError = undefined;
        return out;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        throw error;
      }
    });
  }

  async getVehicles(): Promise<Vehicle[]> {
    const updates = await this.getTripUpdates();
    return updates
      .map((u) => estimateVehicle(u))
      .filter((v): v is Vehicle => Boolean(v))
      .map((v) => ({ ...v, id: `realtime:${v.tripId || v.id}`, accuracyType: "realtime" as const, source: "DELFI SIRI-ET Echtzeit-Prognose · NAH.SH Liniengeometrie" }));
  }

  async getServiceAlerts(): Promise<ServiceAlertSnapshot[]> { return []; }
  getLastUpdate() { return this.lastUpdate; }

  async getProviderStatus(): Promise<ProviderStatus> {
    if (!process.env.SIRI_ET_SH_URL) {
      return {
        id: this.id,
        name: this.name,
        state: "disabled",
        detail: "Das Schleswig-Holstein-SIRI-ET-Angebot ist öffentlich katalogisiert. Der aktuelle Mobilithek-Paketabruf verlangt jedoch Authorization; der noauth-Pfad liefert 403. Nach rechtmäßigem Zugang SIRI_ET_SH_URL und SIRI_ET_SH_AUTHORIZATION setzen.",
      };
    }

    try {
      const updates = await this.getTripUpdates();
      return {
        id: this.id,
        name: this.name,
        state: "online",
        lastUpdate: this.lastUpdate,
        detail: `${updates.length} EstimatedVehicleJourneys gelesen`,
      };
    } catch {
      return {
        id: this.id,
        name: this.name,
        state: "offline",
        lastUpdate: this.lastUpdate,
        detail: this.lastError || "SIRI-ET nicht erreichbar",
      };
    }
  }
}
