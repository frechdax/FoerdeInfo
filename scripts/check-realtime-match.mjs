import fs from "node:fs/promises";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const data = JSON.parse(await fs.readFile("data/region.json", "utf8"));
const ids = new Set(data.trips.map((t) => t.id));
const url = process.env.GTFS_RT_URL || "https://realtime.gtfs.de/realtime-free.pb";
const response = await fetch(url, { headers: { "user-agent": "BusKarte realtime compatibility check/0.1" } });
if (!response.ok) throw new Error(`Realtime HTTP ${response.status}`);
const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(await response.arrayBuffer()));
let updates = 0;
let matches = 0;
const examples = [];
for (const entity of feed.entity) {
  const id = entity.tripUpdate?.trip?.tripId;
  if (!id) continue;
  updates++;
  if (ids.has(id)) {
    matches++;
    if (examples.length < 5) examples.push(id);
  }
}
console.log(`Realtime compatibility: ${matches} of ${updates} current TripUpdates match regional static trip IDs.`);
if (examples.length) console.log(`Matching examples: ${examples.join(", ")}`);
if (!matches) console.warn("WARNING: No direct trip-id matches. Runtime estimated vehicle positions from this GTFS-RT source will remain empty until an ID-compatible realtime source/mapper is configured.");
