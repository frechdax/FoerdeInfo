import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import https from "node:https";
import { pipeline } from "node:stream/promises";
import { parse } from "csv-parse";
import unzipper from "unzipper";

const ROOT = process.cwd();
const URL = process.env.GTFS_RT_STATIC_URL || "https://download.gtfs.de/germany/nv_free/latest.zip";
const TARGET_STOP_PREFIXES = ["de:01001:", "de:01059:"];
const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "buskarte-rt-map-"));
const zipPath = path.join(tmp, "gtfsde.zip");
const wanted = new Set(["routes.txt", "trips.txt", "stop_times.txt"]);

function isTargetStopId(stopId) {
  return TARGET_STOP_PREFIXES.some((prefix) => String(stopId || "").startsWith(prefix));
}

function isBusRouteType(raw) {
  const n = Number(raw);
  return n === 3 || (n >= 700 && n < 800);
}

function normalizeLine(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function seconds(value) {
  const [h = 0, m = 0, s = 0] = String(value || "0:0:0").split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function download(url, destination, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error("Too many redirects"));
  return new Promise((resolve, reject) => {
    const transport = url.startsWith("https:") ? https : http;
    const request = transport.get(url, { headers: { "user-agent": "BusKarte realtime crosswalk/0.1" } }, async (response) => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        const next = new URL(response.headers.location, url).href;
        try {
          await download(next, destination, redirects + 1);
          resolve();
        } catch (error) {
          reject(error);
        }
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error(`HTTP ${status}`));
        return;
      }
      try {
        await pipeline(response, fs.createWriteStream(destination));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
    request.setTimeout(120_000, () => request.destroy(new Error("Download timeout")));
  });
}

async function rows(file, fn) {
  const full = path.join(tmp, file);
  const parser = fs.createReadStream(full).pipe(parse({
    columns: true,
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }));
  for await (const row of parser) await fn(row);
}

console.log(`Downloading GTFS.de static feed: ${URL}`);
await download(URL, zipPath);

console.log("Extracting GTFS.de route/trip/stop-time files …");
await new Promise((resolve, reject) => {
  fs.createReadStream(zipPath).pipe(unzipper.Parse())
    .on("entry", (entry) => {
      const base = path.basename(entry.path);
      if (wanted.has(base)) entry.pipe(fs.createWriteStream(path.join(tmp, base)));
      else entry.autodrain();
    })
    .on("close", resolve)
    .on("error", reject);
});

const realtimeRoutes = new Map();
await rows("routes.txt", (r) => {
  if (!isBusRouteType(r.route_type)) return;
  realtimeRoutes.set(r.route_id, normalizeLine(r.route_short_name || r.route_long_name));
});

const regionalStopsByTrip = new Map();
await rows("stop_times.txt", (r) => {
  if (!isTargetStopId(r.stop_id)) return;
  if (!regionalStopsByTrip.has(r.trip_id)) regionalStopsByTrip.set(r.trip_id, []);
  regionalStopsByTrip.get(r.trip_id).push({
    stopId: r.stop_id,
    arrival: r.arrival_time,
    departure: r.departure_time,
    sequence: Number(r.stop_sequence),
  });
});

for (const stops of regionalStopsByTrip.values()) stops.sort((a, b) => a.sequence - b.sequence);

const realtimeTrips = [];
await rows("trips.txt", (r) => {
  const line = realtimeRoutes.get(r.route_id);
  const stops = regionalStopsByTrip.get(r.trip_id);
  if (!line || !stops || stops.length < 2) return;
  realtimeTrips.push({ id: r.trip_id, line, stops });
});

const region = JSON.parse(await fsp.readFile(path.join(ROOT, "data", "region.json"), "utf8"));
const routeById = new Map(region.routes.map((r) => [r.id, r]));

function pathKey(line, stops) {
  return `${line}|${stops.map((s) => s.stopId).join(">")}`;
}

function endpointKey(line, stops) {
  const first = stops[0];
  const last = stops[stops.length - 1];
  return `${line}|${first.stopId}|${last.stopId}|${stops.length}`;
}

const exactIndex = new Map();
const endpointIndex = new Map();

for (const trip of region.trips) {
  const route = routeById.get(trip.routeId);
  const line = normalizeLine(route?.shortName || route?.longName);
  if (!line || trip.stops.length < 2) continue;

  const entry = { id: trip.id, departure: seconds(trip.stops[0].departure) };

  const exact = pathKey(line, trip.stops);
  if (!exactIndex.has(exact)) exactIndex.set(exact, []);
  exactIndex.get(exact).push(entry);

  const endpoint = endpointKey(line, trip.stops);
  if (!endpointIndex.has(endpoint)) endpointIndex.set(endpoint, []);
  endpointIndex.get(endpoint).push(entry);
}

const matches = {};
let exactPathMatches = 0;
let endpointMatches = 0;

for (const trip of realtimeTrips) {
  const targetDeparture = seconds(trip.stops[0].departure);
  let candidates = exactIndex.get(pathKey(trip.line, trip.stops));
  let kind = "exact";

  if (!candidates?.length) {
    candidates = endpointIndex.get(endpointKey(trip.line, trip.stops));
    kind = "endpoint";
  }
  if (!candidates?.length) continue;

  const ranked = candidates
    .map((candidate) => ({ ...candidate, delta: Math.abs(candidate.departure - targetDeparture) }))
    .sort((a, b) => a.delta - b.delta);

  const bestDelta = ranked[0].delta;
  if (bestDelta > 300) continue;

  const ids = ranked.filter((x) => x.delta === bestDelta).map((x) => x.id);
  if (!ids.length) continue;

  matches[trip.id] = ids;
  if (kind === "exact") exactPathMatches++;
  else endpointMatches++;
}

const output = {
  generatedAt: new Date().toISOString(),
  sourceUrl: URL,
  regionalRealtimeTrips: realtimeTrips.length,
  matchedRealtimeTrips: Object.keys(matches).length,
  exactPathMatches,
  endpointMatches,
  matches,
};

await fsp.writeFile(path.join(ROOT, "data", "realtime-trip-map.json"), JSON.stringify(output));

console.log(
  `Realtime crosswalk: ${output.matchedRealtimeTrips}/${output.regionalRealtimeTrips} regional GTFS.de trips matched ` +
  `(${exactPathMatches} exact path, ${endpointMatches} endpoint fallback)`,
);

await fsp.rm(tmp, { recursive: true, force: true });
