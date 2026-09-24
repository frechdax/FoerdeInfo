import fs from "node:fs/promises";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const map = JSON.parse(await fs.readFile("data/realtime-trip-map.json", "utf8"));
const matches = map.matches || {};
const url = process.env.GTFS_RT_URL || "https://realtime.gtfs.de/realtime-free.pb";

const response = await fetch(url, {
  headers: { "user-agent": "BusKarte realtime compatibility check/0.2" },
});
if (!response.ok) throw new Error(`Realtime HTTP ${response.status}`);

const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
  new Uint8Array(await response.arrayBuffer()),
);

let updates = 0;
let mapped = 0;
const examples = [];

for (const entity of feed.entity) {
  const id = entity.tripUpdate?.trip?.tripId;
  if (!id) continue;
  updates++;
  if (matches[id]?.length) {
    mapped++;
    if (examples.length < 5) examples.push(`${id} -> ${matches[id][0]}`);
  }
}

console.log(
  `Realtime coverage now: ${mapped} of ${updates} current TripUpdates map to BusKarte regional trips. ` +
  `Static crosswalk: ${map.matchedRealtimeTrips || 0}/${map.regionalRealtimeTrips || 0} regional GTFS.de trips.`,
);
if (examples.length) console.log(`Matching examples: ${examples.join(", ")}`);
if (!mapped) console.warn("WARNING: No currently active realtime trip matches were found. Timetable estimates will remain as fallback.");
