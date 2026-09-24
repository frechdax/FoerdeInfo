import fs from "node:fs";
import path from "node:path";
import type { Agency, RegionData, StaticRoute, StaticTrip, StopPoint } from "@/lib/types";

function loadRegionData(): RegionData {
  const file = path.join(process.cwd(), "data", "region.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as RegionData;
}

const regionData = loadRegionData();
const routes = new Map(regionData.routes.map((x) => [x.id, x]));
const trips = new Map(regionData.trips.map((x) => [x.id, x]));
const stops = new Map(regionData.stops.map((x) => [x.id, x]));
const agencies = new Map<string, Agency>(regionData.agencies.map((x) => [x.id, x]));

export function getRegionData() { return regionData; }
export function getRoute(id?: string): StaticRoute | undefined { return id ? routes.get(id) : undefined; }
export function getTrip(id?: string): StaticTrip | undefined { return id ? trips.get(id) : undefined; }
export function getStop(id?: string): StopPoint | undefined { return id ? stops.get(id) : undefined; }
export function getAgencyName(id?: string) { return id ? agencies.get(id)?.name : undefined; }
export function getShape(id?: string) { return id ? regionData.shapes[id] : undefined; }
