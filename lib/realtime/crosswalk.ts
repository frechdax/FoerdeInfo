import fs from "node:fs";
import path from "node:path";
import { getRegionData, getTrip } from "@/lib/gtfs/store";
import { isServiceActive } from "@/lib/time";

type RealtimeTripMapData = {
  generatedAt: string | null;
  sourceUrl: string | null;
  regionalRealtimeTrips: number;
  matchedRealtimeTrips: number;
  exactPathMatches: number;
  endpointMatches: number;
  matches: Record<string, string[]>;
};

const EMPTY: RealtimeTripMapData = {
  generatedAt: null,
  sourceUrl: null,
  regionalRealtimeTrips: 0,
  matchedRealtimeTrips: 0,
  exactPathMatches: 0,
  endpointMatches: 0,
  matches: {},
};

function loadRealtimeTripMap(): RealtimeTripMapData {
  try {
    const file = path.join(process.cwd(), "data", "realtime-trip-map.json");
    return JSON.parse(fs.readFileSync(file, "utf8")) as RealtimeTripMapData;
  } catch {
    return EMPTY;
  }
}

const realtimeTripMap = loadRealtimeTripMap();

export function getRealtimeTripMapStats() {
  return {
    generatedAt: realtimeTripMap.generatedAt,
    sourceUrl: realtimeTripMap.sourceUrl,
    regionalRealtimeTrips: realtimeTripMap.regionalRealtimeTrips,
    matchedRealtimeTrips: realtimeTripMap.matchedRealtimeTrips,
    exactPathMatches: realtimeTripMap.exactPathMatches,
    endpointMatches: realtimeTripMap.endpointMatches,
  };
}

export function resolveRealtimeTripId(realtimeTripId: string, serviceDate?: string) {
  const candidates = realtimeTripMap.matches[realtimeTripId];
  if (!candidates?.length) return undefined;

  if (serviceDate && /^\d{8}$/.test(serviceDate)) {
    const data = getRegionData();
    const active = candidates.find((id) => {
      const trip = getTrip(id);
      return trip ? isServiceActive(data, trip.serviceId, serviceDate) : false;
    });
    if (active) return active;
  }

  return candidates[0];
}
