import { NextRequest, NextResponse } from "next/server";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";
import { getRegion, regions } from "@/lib/regions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Region = (typeof regions)[number];

type ModuleStatus = "live" | "partial" | "unavailable";

type LiveModule = {
  status: ModuleStatus;
  value: string;
  detail: string;
  updatedAt: string | null;
  source: string;
  sourceUrl: string;
  items?: Array<{ label: string; value: string; meta?: string }>;
};

type SensorThing = {
  "@iot.id"?: number | string;
  name?: string;
  description?: string;
  Locations?: Array<{
    name?: string;
    location?: { type?: string; coordinates?: [number, number] };
  }>;
};

type SensorDatastream = {
  "@iot.id"?: number | string;
  name?: string;
  description?: string;
  Thing?: SensorThing;
  ObservedProperty?: { name?: string; description?: string };
};

type SensorObservation = {
  result?: unknown;
  phenomenonTime?: string;
  resultTime?: string;
};

const ODI_BASES = [
  "https://sensor.odi.schleswig-holstein.de/FROST-Server/v1.1",
  "https://sensor.odi.schleswig-holstein.de/FROST/v1.1",
  "https://sensor.odi.schleswig-holstein.de/api/v1.1",
  "https://sensor.odi.schleswig-holstein.de/v1.1",
];

const DONKEY_GBFS =
  "https://stables.donkey.bike/api/public/gbfs/3.0/donkey_schleswig/gbfs.json";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const key of ["value", "count", "occupancy", "occupied", "free", "result"]) {
      const parsed = asNumber(object[key]);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const lat1 = a.latitude * rad;
  const lat2 = b.latitude * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function thingPoint(stream: SensorDatastream) {
  const coordinates = stream.Thing?.Locations?.[0]?.location?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function streamText(stream: SensorDatastream) {
  return [
    stream.name,
    stream.description,
    stream.Thing?.name,
    stream.Thing?.description,
    stream.ObservedProperty?.name,
    stream.ObservedProperty?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de");
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": "foerde.info live data lab",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function latestObservation(base: string, id: string | number) {
  const url =
    base +
    "/Datastreams(" +
    encodeURIComponent(String(id)) +
    ")/Observations?$top=1&$orderby=phenomenonTime%20desc";
  const payload = (await fetchJson(url)) as { value?: SensorObservation[] };
  return payload.value?.[0] ?? null;
}

async function sensorModule(
  region: Region,
  kind: "parking" | "visitors"
): Promise<LiveModule> {
  const keywords =
    kind === "parking"
      ? ["park", "stellplatz", "belegung", "parking"]
      : ["besuch", "frequenz", "passant", "person", "visitor", "pedestrian"];

  for (const base of ODI_BASES) {
    try {
      const params = new URLSearchParams({
        "$top": "500",
        "$expand": "Thing($expand=Locations),ObservedProperty",
      });
      const payload = (await fetchJson(base + "/Datastreams?" + params)) as {
        value?: SensorDatastream[];
      };

      const matches = (payload.value ?? [])
        .map((stream) => {
          const point = thingPoint(stream);
          const distance = point ? distanceKm(region, point) : Number.POSITIVE_INFINITY;
          return { stream, distance };
        })
        .filter(
          ({ stream, distance }) =>
            distance <= (kind === "parking" ? 20 : 15) &&
            keywords.some((keyword) => streamText(stream).includes(keyword))
        )
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 8);

      if (!matches.length) continue;

      const rows = (
        await Promise.all(
          matches.map(async ({ stream, distance }) => {
            if (stream["@iot.id"] == null) return null;
            const observation = await latestObservation(base, stream["@iot.id"]).catch(
              () => null
            );
            const value = asNumber(observation?.result);
            if (value === null) return null;
            return {
              stream,
              distance,
              value,
              updatedAt:
                observation?.resultTime ?? observation?.phenomenonTime ?? null,
            };
          })
        )
      ).filter(
        (
          row
        ): row is {
          stream: SensorDatastream;
          distance: number;
          value: number;
          updatedAt: string | null;
        } => Boolean(row)
      );

      if (!rows.length) continue;

      const newest = rows
        .map((row) => row.updatedAt)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

      if (kind === "parking") {
        const free = rows.filter((row) =>
          /frei|free|available/.test(streamText(row.stream))
        );
        const occupied = rows.filter((row) =>
          /belegt|occupied|occupancy/.test(streamText(row.stream))
        );

        const headline = free.length
          ? Math.round(free.reduce((sum, row) => sum + row.value, 0)) +
            " freie Stellplätze gemeldet"
          : occupied.length
            ? Math.round(occupied.reduce((sum, row) => sum + row.value, 0)) +
              " belegte Stellplätze gemeldet"
            : rows.length + " aktuelle Parkplatz-Messwerte";

        return {
          status: "live",
          value: headline,
          detail:
            "Öffentliche SensorThings-Messwerte im Umkreis von " +
            region.name +
            ". Die verfügbaren Messreihen unterscheiden sich je Standort.",
          updatedAt: newest,
          source: "Open Data Infrastruktur Schleswig-Holstein",
          sourceUrl: "https://sensor.odi.schleswig-holstein.de/",
          items: rows.slice(0, 4).map((row) => ({
            label:
              row.stream.Thing?.name ??
              row.stream.name ??
              "Parkplatzsensor",
            value: String(Math.round(row.value)),
            meta: row.distance.toFixed(1).replace(".", ",") + " km entfernt",
          })),
        };
      }

      return {
        status: "live",
        value: rows.length + " aktuelle Besucher-Messwerte",
        detail:
          "Anonymisierte Sensorwerte im Umkreis von " +
          region.name +
          ". Je nach Messpunkt können Frequenzen oder Zählwerte dargestellt werden.",
        updatedAt: newest,
        source: "Open Data Infrastruktur Schleswig-Holstein",
        sourceUrl: "https://sensor.odi.schleswig-holstein.de/",
        items: rows.slice(0, 4).map((row) => ({
          label:
            row.stream.Thing?.name ??
            row.stream.name ??
            "Besucherzähler",
          value: String(Math.round(row.value)),
          meta: row.distance.toFixed(1).replace(".", ",") + " km entfernt",
        })),
      };
    } catch {
      // Nächsten öffentlichen SensorThings-Endpunkt versuchen.
    }
  }

  return {
    status: "unavailable",
    value: "Keine Live-Messung gefunden",
    detail:
      kind === "parking"
        ? "Für diesen Ort liefert die öffentliche SensorThings-Abfrage derzeit keinen passenden Parkplatz-Messwert."
        : "Für diesen Ort liefert die öffentliche SensorThings-Abfrage derzeit keinen passenden Besucher-Messwert.",
    updatedAt: null,
    source: "Open Data Infrastruktur Schleswig-Holstein",
    sourceUrl: "https://sensor.odi.schleswig-holstein.de/",
  };
}

async function chargingModule(region: Region): Promise<LiveModule> {
  const radius = region.id === "flensburg" ? 6500 : 5000;
  const query =
    '[out:json][timeout:10];(' +
    'node["amenity"="charging_station"](around:' +
    radius +
    "," +
    region.latitude +
    "," +
    region.longitude +
    ");" +
    'way["amenity"="charging_station"](around:' +
    radius +
    "," +
    region.latitude +
    "," +
    region.longitude +
    "););out center tags;";

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: query }),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "foerde.info live data lab",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error();

    const payload = (await response.json()) as {
      elements?: Array<{
        tags?: Record<string, string>;
      }>;
    };
    const elements = payload.elements ?? [];
    const points = elements.reduce((sum, element) => {
      const capacity = Number(element.tags?.capacity);
      return sum + (Number.isFinite(capacity) && capacity > 0 ? capacity : 1);
    }, 0);

    return {
      status: "partial",
      value:
        elements.length +
        " Ladestandorte · mindestens " +
        points +
        " Ladepunkte",
      detail:
        "Die Standorte werden aktuell aus OpenStreetMap abgefragt. Eine verlässliche Live-Belegung frei/belegt wird über diese offene Quelle nicht veröffentlicht.",
      updatedAt: new Date().toISOString(),
      source: "OpenStreetMap / Overpass",
      sourceUrl: "https://www.openstreetmap.org/",
      items: elements.slice(0, 4).map((element, index) => ({
        label:
          element.tags?.name ??
          element.tags?.operator ??
          "Ladestandort " + (index + 1),
        value: element.tags?.capacity
          ? element.tags.capacity + " Ladepunkte"
          : "Ladepunkt erfasst",
      })),
    };
  } catch {
    return {
      status: "unavailable",
      value: "Ladestandorte gerade nicht abrufbar",
      detail:
        "Die Standortabfrage ist derzeit nicht erreichbar. Eine Live-Belegung wird nicht geschätzt.",
      updatedAt: null,
      source: "OpenStreetMap / Overpass",
      sourceUrl: "https://www.openstreetmap.org/",
    };
  }
}

async function trafficModule(region: Region): Promise<LiveModule> {
  try {
    const db = createPublicServerSupabase();
    const { data, error } = await db
      .from("way_reports")
      .select("id,latitude,longitude,kind,description,created_at")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const nearby = (data ?? [])
      .map((report) => ({
        ...report,
        distance: distanceKm(region, {
          latitude: Number(report.latitude),
          longitude: Number(report.longitude),
        }),
      }))
      .filter((report) => report.distance <= 8)
      .sort((a, b) => a.distance - b.distance);

    return {
      status: "live",
      value: nearby.length
        ? nearby.length +
          " aktive " +
          (nearby.length === 1 ? "Meldung" : "Meldungen") +
          " im Umkreis"
        : "Keine aktiven Wege-Meldungen im Umkreis",
      detail:
        "Live aus dem förde.info-Wegecheck. Die Anzeige bildet Nutzer-Meldungen ab und ist keine vollständige amtliche Verkehrslage.",
      updatedAt: nearby[0]?.created_at ?? new Date().toISOString(),
      source: "förde.info Wegecheck",
      sourceUrl: "/wege",
      items: nearby.slice(0, 4).map((report) => ({
        label:
          report.kind === "construction"
            ? "Baustelle"
            : report.kind === "blocked"
              ? "Weg gesperrt"
              : report.kind === "flooding"
                ? "Wasser auf dem Weg"
                : "Hindernis",
        value: String(report.description),
        meta: report.distance.toFixed(1).replace(".", ",") + " km entfernt",
      })),
    };
  } catch {
    return {
      status: "unavailable",
      value: "Verkehrsmeldungen gerade nicht abrufbar",
      detail: "Der Wegecheck konnte für diesen Ort nicht abgefragt werden.",
      updatedAt: null,
      source: "förde.info Wegecheck",
      sourceUrl: "/wege",
    };
  }
}

async function transitModule(region: Region): Promise<LiveModule> {
  try {
    const nearbyUrl = new URL("https://v6.db.transport.rest/locations/nearby");
    nearbyUrl.searchParams.set("latitude", String(region.latitude));
    nearbyUrl.searchParams.set("longitude", String(region.longitude));
    nearbyUrl.searchParams.set("results", "5");
    nearbyUrl.searchParams.set("distance", region.id === "langballig" ? "5000" : "3500");
    nearbyUrl.searchParams.set("stops", "true");
    nearbyUrl.searchParams.set("poi", "false");
    nearbyUrl.searchParams.set("language", "de");
    nearbyUrl.searchParams.set("pretty", "false");

    const stops = (await fetchJson(nearbyUrl.toString())) as Array<{
      id?: string;
      name?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
    const stop = stops.find((entry) => entry.id);
    if (!stop?.id) throw new Error();

    const departuresUrl = new URL(
      "https://v6.db.transport.rest/stops/" +
        encodeURIComponent(stop.id) +
        "/departures"
    );
    departuresUrl.searchParams.set("duration", "60");
    departuresUrl.searchParams.set("results", "8");
    departuresUrl.searchParams.set("language", "de");
    departuresUrl.searchParams.set("remarks", "true");
    departuresUrl.searchParams.set("pretty", "false");

    const payload = (await fetchJson(departuresUrl.toString())) as {
      departures?: Array<{
        when?: string;
        plannedWhen?: string;
        delay?: number | null;
        cancelled?: boolean;
        direction?: string;
        line?: { name?: string };
      }>;
      realtimeDataUpdatedAt?: number;
    };

    const departures = (payload.departures ?? []).filter(
      (departure) => !departure.cancelled && departure.when
    );
    const first = departures[0];
    if (!first?.when) throw new Error();

    const delayMinutes =
      typeof first.delay === "number" ? Math.round(first.delay / 60) : null;
    const time = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(first.when));

    return {
      status: "live",
      value:
        (first.line?.name ? "Linie " + first.line.name + " · " : "") +
        time +
        " Uhr" +
        (delayMinutes && delayMinutes > 0 ? " · +" + delayMinutes + " Min." : " · pünktlich"),
      detail:
        "Nächste verfügbare Echtzeit-Abfahrt an " +
        (stop.name ?? "der nächstgelegenen Haltestelle") +
        ".",
      updatedAt: payload.realtimeDataUpdatedAt
        ? new Date(payload.realtimeDataUpdatedAt * 1000).toISOString()
        : new Date().toISOString(),
      source: "transport.rest / DB-Echtzeitdaten",
      sourceUrl: "https://v6.db.transport.rest/",
      items: departures.slice(0, 4).map((departure) => {
        const departureTime = departure.when
          ? new Intl.DateTimeFormat("de-DE", {
              timeZone: "Europe/Berlin",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(departure.when))
          : "—";
        const delay =
          typeof departure.delay === "number"
            ? Math.round(departure.delay / 60)
            : null;
        return {
          label:
            (departure.line?.name ?? "ÖPNV") +
            " → " +
            (departure.direction ?? "Richtung unbekannt"),
          value: departureTime + " Uhr",
          meta:
            delay && delay > 0
              ? "+" + delay + " Min."
              : departure.cancelled
                ? "fällt aus"
                : "pünktlich",
        };
      }),
    };
  } catch {
    return {
      status: "unavailable",
      value: "Echtzeit-Abfahrten gerade nicht abrufbar",
      detail:
        "Für diesen Ort konnte aktuell keine nahe Haltestelle mit Echtzeitdaten geladen werden.",
      updatedAt: null,
      source: "transport.rest / DB-Echtzeitdaten",
      sourceUrl: "https://v6.db.transport.rest/",
    };
  }
}

async function sharingModule(region: Region): Promise<LiveModule> {
  try {
    const discovery = (await fetchJson(DONKEY_GBFS)) as {
      last_updated?: string;
      data?: { feeds?: Array<{ name?: string; url?: string }> };
    };
    const feeds = discovery.data?.feeds ?? [];
    const infoUrl = feeds.find((feed) => feed.name === "station_information")?.url;
    const statusUrl = feeds.find((feed) => feed.name === "station_status")?.url;
    if (!infoUrl || !statusUrl) throw new Error();

    const [info, status] = (await Promise.all([
      fetchJson(infoUrl),
      fetchJson(statusUrl),
    ])) as [
      {
        data?: {
          stations?: Array<{
            station_id?: string;
            name?: string;
            lat?: number;
            lon?: number;
          }>;
        };
      },
      {
        last_updated?: string;
        data?: {
          stations?: Array<{
            station_id?: string;
            num_vehicles_available?: number;
            num_docks_available?: number;
          }>;
        };
      }
    ];

    const statuses = new Map(
      (status.data?.stations ?? []).map((item) => [item.station_id, item])
    );
    const nearby = (info.data?.stations ?? [])
      .map((station) => ({
        station,
        distance:
          typeof station.lat === "number" && typeof station.lon === "number"
            ? distanceKm(region, {
                latitude: station.lat,
                longitude: station.lon,
              })
            : Number.POSITIVE_INFINITY,
      }))
      .filter(({ distance }) => distance <= 18)
      .sort((a, b) => a.distance - b.distance);

    const available = nearby.reduce(
      (sum, { station }) =>
        sum +
        (statuses.get(station.station_id)?.num_vehicles_available ?? 0),
      0
    );

    return {
      status: "live",
      value: nearby.length
        ? available +
          " Fahrräder · " +
          nearby.length +
          " " +
          (nearby.length === 1 ? "Station" : "Stationen")
        : "Keine Sharing-Station im 18-km-Umkreis",
      detail:
        "Live aus dem öffentlichen GBFS-Feed von Donkey Republic Schleswig. Angezeigt werden nur Stationen nahe " +
        region.name +
        ".",
      updatedAt: status.last_updated ?? discovery.last_updated ?? null,
      source: "Donkey Republic Schleswig · GBFS",
      sourceUrl: DONKEY_GBFS,
      items: nearby.slice(0, 4).map(({ station, distance }) => ({
        label: station.name ?? "Sharing-Station",
        value:
          (statuses.get(station.station_id)?.num_vehicles_available ?? 0) +
          " verfügbar",
        meta: distance.toFixed(1).replace(".", ",") + " km entfernt",
      })),
    };
  } catch {
    return {
      status: "unavailable",
      value: "Sharing-Daten gerade nicht abrufbar",
      detail:
        "Der öffentliche GBFS-Feed konnte für diesen Ort aktuell nicht ausgewertet werden.",
      updatedAt: null,
      source: "Donkey Republic Schleswig · GBFS",
      sourceUrl: DONKEY_GBFS,
    };
  }
}

async function sensorThingsDiagnostics() {
  return Promise.all(
    ODI_BASES.map(async (base) => {
      try {
        const response = await fetch(base + "/Datastreams?$top=1", {
          headers: {
            accept: "application/json",
            "user-agent": "foerde.info sensor diagnostics",
          },
          signal: AbortSignal.timeout(7000),
          cache: "no-store",
        });
        const text = await response.text();
        return {
          base,
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get("content-type"),
          sample: text.slice(0, 5000),
        };
      } catch (error) {
        return {
          base,
          ok: false,
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("debug") === "sensor") {
    const [diagnostics, envResponse] = await Promise.all([
      sensorThingsDiagnostics(),
      fetch("https://sensor.odi.schleswig-holstein.de/assets/env.js", {
        headers: { "user-agent": "foerde.info sensor diagnostics" },
        signal: AbortSignal.timeout(7000),
        cache: "no-store",
      }).then(async (response) => ({
        status: response.status,
        contentType: response.headers.get("content-type"),
        text: (await response.text()).slice(0, 10000),
      })).catch((error) => ({
        status: 0,
        contentType: null,
        text: error instanceof Error ? error.message : String(error),
      })),
    ]);
    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      diagnostics,
      env: envResponse,
    });
  }

  const id = request.nextUrl.searchParams.get("ort") ?? "flensburg";
  const region = getRegion(id) ?? regions[0];

  const [parking, visitors, charging, traffic, transit, sharing] =
    await Promise.all([
      sensorModule(region, "parking"),
      sensorModule(region, "visitors"),
      chargingModule(region),
      trafficModule(region),
      transitModule(region),
      sharingModule(region),
    ]);

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      place: {
        id: region.id,
        name: region.name,
        latitude: region.latitude,
        longitude: region.longitude,
      },
      modules: {
        parking,
        visitors,
        charging,
        traffic,
        transit,
        sharing,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}

// Keep production diagnostics deployable while SensorThings endpoint is verified.

// Diagnostic merge trigger for production SensorThings endpoint verification.
