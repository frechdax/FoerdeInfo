import { FlensburgLiveProvider } from "@/lib/providers/flensburg-live";
import { NahSHRealtimeProvider } from "@/lib/providers/nahsh-realtime";
import { ScheduleEstimateProvider } from "@/lib/providers/schedule-estimate";
import { SiriEtProvider } from "@/lib/providers/siri-et";
import { getRegionData } from "@/lib/gtfs/store";
import type { ProviderStatus, Vehicle } from "@/lib/types";

const realtime = new NahSHRealtimeProvider();
const flensburg = new FlensburgLiveProvider();
const siriEt = new SiriEtProvider();
const scheduleEstimate = new ScheduleEstimateProvider();

const qualityRank: Record<Vehicle["accuracyType"], number> = {
  gps: 3,
  realtime: 2,
  estimated: 1,
};

export async function getVehicles(): Promise<Vehicle[]> {
  const batches = await Promise.allSettled([
    flensburg.getVehicles(),
    realtime.getVehicles(),
    siriEt.getVehicles(),
    scheduleEstimate.getVehicles(),
  ]);

  const all = batches.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  const byTrip = new Map<string, Vehicle>();

  for (const vehicle of all) {
    const key = vehicle.tripId || vehicle.id;
    const existing = byTrip.get(key);
    if (!existing || qualityRank[vehicle.accuracyType] > qualityRank[existing.accuracyType]) {
      byTrip.set(key, vehicle);
    }
  }

  return [...byTrip.values()];
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const data = getRegionData();
  const staticStatus: ProviderStatus = data.trips.length
    ? {
        id: "static-gtfs",
        name: "Regionale GTFS-Fahrplandaten",
        state: "online",
        lastUpdate: data.generatedAt || undefined,
        detail: `${data.routes.length} Buslinien · ${data.stops.length} Haltestellen · ${data.trips.length} Busfahrten · ${Object.keys(data.shapes).length} Shapes`,
      }
    : {
        id: "static-gtfs",
        name: "Regionale GTFS-Fahrplandaten",
        state: "disabled",
        detail: "Noch nicht importiert. `npm run gtfs:import` ausführen.",
      };

  const statuses = await Promise.all([
    realtime.getProviderStatus(),
    scheduleEstimate.getProviderStatus(),
    siriEt.getProviderStatus(),
    flensburg.getProviderStatus(),
  ]);

  return [staticStatus, ...statuses];
}
