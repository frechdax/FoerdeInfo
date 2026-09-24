import fs from "node:fs/promises";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const map = JSON.parse(await fs.readFile("data/realtime-trip-map.json", "utf8"));
const mappedIds = new Set(Object.keys(map.matches || {}));
const url = process.env.GTFS_RT_URL || "https://realtime.gtfs.de/realtime-free.pb";
const response = await fetch(url, {
  headers: { "user-agent": "BusKarte realtime coverage check/0.3" },
  signal: AbortSignal.timeout(45000),
});
if (!response.ok) throw new Error(`Realtime HTTP ${response.status}`);
const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(await response.arrayBuffer()));

let updates = 0;
let mappedNow = 0;
const examples = [];
for (const entity of feed.entity) {
  const id = entity.tripUpdate?.trip?.tripId;
  if (!id) continue;
  updates++;
  if (mappedIds.has(id)) {
    mappedNow++;
    if (examples.length < 10) examples.push(id);
  }
}

console.log(JSON.stringify({
  updates,
  mappedNow,
  crosswalkGeneratedAt: map.generatedAt,
  crosswalkMatchedTrips: map.matchedRealtimeTrips,
  crosswalkRegionalTrips: map.regionalRealtimeTrips,
  examples,
}, null, 2));

if (!mappedNow) {
  console.warn("WARNING: No currently active realtime trips map into the BusKarte region at this instant.");
}
