import fs from "node:fs/promises";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const data = JSON.parse(await fs.readFile("data/region.json", "utf8"));
const tripIds = new Set(data.trips.map((t) => t.id));
const stopIds = new Set(data.stops.map((s) => s.id));
const routeIds = new Set(data.routes.map((r) => r.id));
const routeShortNames = new Map(data.routes.map((r) => [r.id, r.shortName]));

const url = process.env.GTFS_RT_URL || "https://realtime.gtfs.de/realtime-free.pb";
const response = await fetch(url, { headers: { "user-agent": "BusKarte realtime compatibility check/0.2" }, signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Realtime HTTP ${response.status}`);
const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(await response.arrayBuffer()));

let updates = 0, tripMatches = 0, routeMatches = 0, stopMatches = 0, updatesWithRegionalStops = 0;
const samples = [];
for (const entity of feed.entity) {
  const tu = entity.tripUpdate;
  const id = tu?.trip?.tripId;
  if (!tu || !id) continue;
  updates++;
  if (tripIds.has(id)) tripMatches++;
  const routeId = tu.trip.routeId || "";
  if (routeIds.has(routeId)) routeMatches++;
  let localStops = 0;
  const stopSample = [];
  for (const s of tu.stopTimeUpdate || []) {
    const sid = s.stopId || "";
    if (sid && stopIds.has(sid)) { stopMatches++; localStops++; }
    if (stopSample.length < 5 && sid) stopSample.push(sid);
  }
  if (localStops) {
    updatesWithRegionalStops++;
    if (samples.length < 15) samples.push({
      tripId:id,
      routeId,
      routeShortName:routeShortNames.get(routeId),
      startDate:tu.trip.startDate,
      localStops,
      stopSample
    });
  }
}
console.log(JSON.stringify({
  updates, tripMatches, routeMatches, stopMatches, updatesWithRegionalStops, samples
}, null, 2));
