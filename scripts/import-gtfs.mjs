import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pipeline } from "node:stream/promises";
import { parse } from "csv-parse";
import unzipper from "unzipper";

const ROOT = process.cwd();
const PRIMARY_URL = process.env.GTFS_STATIC_URL || "https://www.connect-info.net/opendata/gtfs/nah.sh/rjqfrkqhgu";
const FALLBACK_URL = process.env.GTFS_STATIC_FALLBACK_URL || "https://download.gtfs.de/germany/nv_free/latest.zip";
let URL = PRIMARY_URL;
const TARGET_STOP_PREFIXES = ["de:01001:", "de:01059:"]; // Flensburg + Kreis Schleswig-Flensburg

function isTargetStopId(stopId) {
  return TARGET_STOP_PREFIXES.some((prefix) => String(stopId || "").startsWith(prefix));
}
const wanted = new Set(["agency.txt","routes.txt","trips.txt","stops.txt","stop_times.txt","shapes.txt","calendar.txt","calendar_dates.txt"]);
const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "buskarte-gtfs-"));
const zipPath = path.join(tmp, "feed.zip");

function isBusRouteType(raw) {
  const n = Number(raw);
  return n === 3 || (n >= 700 && n < 800);
}

async function downloadGtfs() {
  let lastError;
  for (const candidate of [PRIMARY_URL, FALLBACK_URL].filter(Boolean)) {
    try {
      console.log(`Downloading ${candidate}`);
      const res = await fetch(candidate, { headers: { "user-agent": "BusKarte GTFS importer/0.1" }, redirect: "follow" });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !res.body || contentType.includes("text/html")) throw new Error(`HTTP ${res.status}, content-type ${contentType}`);
      await pipeline(res.body, fs.createWriteStream(zipPath));
      const head = Buffer.alloc(4);
      const fd = await fsp.open(zipPath, "r");
      await fd.read(head, 0, 4, 0);
      await fd.close();
      if (head[0] !== 0x50 || head[1] !== 0x4b) throw new Error("Response is not a ZIP archive");
      URL = candidate;
      return;
    } catch (error) {
      lastError = error;
      await fsp.rm(zipPath, { force: true });
      console.warn(`GTFS source failed: ${candidate}: ${error instanceof Error ? error.message : error}`);
    }
  }
  throw lastError || new Error("No GTFS source available");
}

await downloadGtfs();
console.log("Extracting required GTFS files …");
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

async function rows(file, fn) {
  const full = path.join(tmp, file);
  if (!fs.existsSync(full)) return;
  const parser = fs.createReadStream(full).pipe(parse({ columns: true, bom: true, relax_column_count: true, skip_empty_lines: true }));
  for await (const row of parser) await fn(row);
}

const stops = new Map();
await rows("stops.txt", (r) => {
  const lat = Number(r.stop_lat), lon = Number(r.stop_lon);
  if (Number.isFinite(lat) && Number.isFinite(lon) && isTargetStopId(r.stop_id)) {
    stops.set(r.stop_id, { id: r.stop_id, name: r.stop_name, lat, lon });
  }
});
console.log(`${stops.size} regional stops`);

const busRouteDefinitions = new Map();
await rows("routes.txt", (r) => {
  if (!isBusRouteType(r.route_type)) return;
  busRouteDefinitions.set(r.route_id, {
    id: r.route_id,
    agencyId: r.agency_id || undefined,
    shortName: r.route_short_name || "",
    longName: r.route_long_name || undefined,
    color: r.route_color || undefined,
    textColor: r.route_text_color || undefined,
    type: r.route_type ? Number(r.route_type) : undefined,
  });
});
console.log(`${busRouteDefinitions.size} bus routes in source`);

const regionTripIds = new Set();
await rows("stop_times.txt", (r) => {
  if (stops.has(r.stop_id)) regionTripIds.add(r.trip_id);
});
console.log(`${regionTripIds.size} trips touch the region before bus filtering`);

const tripStops = new Map();
await rows("stop_times.txt", (r) => {
  if (!regionTripIds.has(r.trip_id)) return;
  if (!tripStops.has(r.trip_id)) tripStops.set(r.trip_id, []);
  tripStops.get(r.trip_id).push({
    stopId: r.stop_id,
    arrival: r.arrival_time,
    departure: r.departure_time,
    sequence: Number(r.stop_sequence),
    shapeDist: r.shape_dist_traveled ? Number(r.shape_dist_traveled) : undefined,
  });
});

const trips = [];
const routeIds = new Set();
const serviceIds = new Set();
const shapeIds = new Set();
await rows("trips.txt", (r) => {
  if (!regionTripIds.has(r.trip_id) || !busRouteDefinitions.has(r.route_id)) return;
  const stopList = (tripStops.get(r.trip_id) || []).filter((s) => stops.has(s.stopId)).sort((a,b) => a.sequence - b.sequence);
  if (stopList.length < 2) return;
  routeIds.add(r.route_id);
  serviceIds.add(r.service_id);
  if (r.shape_id) shapeIds.add(r.shape_id);
  trips.push({
    id: r.trip_id,
    routeId: r.route_id,
    serviceId: r.service_id,
    headsign: r.trip_headsign || undefined,
    shapeId: r.shape_id || undefined,
    directionId: r.direction_id || undefined,
    stops: stopList,
  });
});
tripStops.clear();

const routes = [...routeIds].map((id) => busRouteDefinitions.get(id)).filter(Boolean);
const agencyIds = new Set(routes.map((r) => r.agencyId).filter(Boolean));
const agencies = [];
await rows("agency.txt", (r) => {
  if (!agencyIds.size || agencyIds.has(r.agency_id)) agencies.push({ id: r.agency_id || r.agency_name, name: r.agency_name, url: r.agency_url || undefined });
});

const shapes = {};
await rows("shapes.txt", (r) => {
  if (!shapeIds.has(r.shape_id)) return;
  (shapes[r.shape_id] ??= []).push({ seq: Number(r.shape_pt_sequence), coord: [Number(r.shape_pt_lon), Number(r.shape_pt_lat)] });
});
for (const id of Object.keys(shapes)) shapes[id] = shapes[id].sort((a,b) => a.seq - b.seq).map((x) => x.coord);

const calendar = [];
await rows("calendar.txt", (r) => {
  if (serviceIds.has(r.service_id)) calendar.push({
    serviceId: r.service_id,
    monday: r.monday === "1", tuesday: r.tuesday === "1", wednesday: r.wednesday === "1", thursday: r.thursday === "1",
    friday: r.friday === "1", saturday: r.saturday === "1", sunday: r.sunday === "1",
    startDate: r.start_date, endDate: r.end_date,
  });
});
const calendarDates = [];
await rows("calendar_dates.txt", (r) => {
  if (serviceIds.has(r.service_id)) calendarDates.push({ serviceId: r.service_id, date: r.date, exceptionType: Number(r.exception_type) });
});

const out = {
  generatedAt: new Date().toISOString(),
  sourceUrl: URL,
  agencies,
  routes,
  stops: [...stops.values()],
  trips,
  shapes,
  calendar,
  calendarDates,
};
await fsp.writeFile(path.join(ROOT, "data/region.json"), JSON.stringify(out));
console.log(`Wrote data/region.json: ${routes.length} bus routes, ${trips.length} bus trips, ${stops.size} stops, ${Object.keys(shapes).length} shapes`);
if (!Object.keys(shapes).length) console.warn("WARNING: No usable shapes.txt. BusKarte will not fabricate straight-line vehicle positions for trips without route geometry.");
await fsp.rm(tmp, { recursive: true, force: true });
