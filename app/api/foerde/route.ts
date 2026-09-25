import { NextResponse } from "next/server";
import { regions } from "@/lib/regions";

export const revalidate = 300;

type Forecast = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    is_day?: number;
    time?: string;
  };
  hourly?: {
    precipitation_probability?: number[];
    uv_index?: number[];
    time?: string[];
  };
};

const bathingBase = "https://efi2.schleswig-holstein.de/bg/opendata/";
const DWD_WARNINGS_URL = "https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json";
const FLENSBURG_WARNCELL = "101001000";
const SCHLESWIG_FLENSBURG_WARNCELL = "101059000";

type DwdWarning = {
  headline: string;
  event: string;
  level: number;
  start: number;
  end: number;
};

function parseDwdJson(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/^[^(]+\((.*)\);?$/s);
  if (!match) throw new Error("Unbekanntes DWD-Format");
  return JSON.parse(match[1]);
}

function normalizeWarnings(payload: unknown, warncell: string): DwdWarning[] {
  const warningMap =
    payload && typeof payload === "object" && "warnings" in payload
      ? (payload as { warnings?: Record<string, Array<Record<string, unknown>>> }).warnings
      : undefined;

  return (warningMap?.[warncell] ?? []).map((entry) => ({
    headline: String(entry.headline ?? entry.event ?? "Amtliche Wetterwarnung"),
    event: String(entry.event ?? "Wetterwarnung"),
    level: Number(entry.level ?? 1),
    start: Number(entry.start ?? 0),
    end: Number(entry.end ?? 0),
  }));
}

function maxFinite(values: Array<number | undefined>) {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length ? Math.max(...finite) : 0;
}

async function weatherFor(region: (typeof regions)[number]) {
  const params = new URLSearchParams({
    latitude: String(region.latitude),
    longitude: String(region.longitude),
    current:
      "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day",
    hourly: "precipitation_probability,uv_index",
    timezone: "Europe/Berlin",
    forecast_days: "1",
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error("Wetterquelle nicht erreichbar");

  const data = (await response.json()) as Forecast;
  if (!data.current || !Number.isFinite(data.current.temperature_2m)) {
    throw new Error("Wetterdaten fehlen");
  }

  const hour = data.current.time?.slice(0, 13);
  const index = Math.max(
    0,
    data.hourly?.time?.findIndex((value) => value.slice(0, 13) === hour) ?? 0
  );

  return {
    temperature: data.current.temperature_2m ?? 0,
    apparentTemperature:
      data.current.apparent_temperature ?? data.current.temperature_2m ?? 0,
    precipitation: data.current.precipitation ?? 0,
    weatherCode: data.current.weather_code ?? -1,
    windSpeed: data.current.wind_speed_10m ?? 0,
    windGusts: data.current.wind_gusts_10m ?? 0,
    rainChance: maxFinite(
      (data.hourly?.precipitation_probability ?? []).slice(index, index + 3)
    ),
    uvIndex: maxFinite((data.hourly?.uv_index ?? []).slice(index, index + 3)),
    isDay: data.current.is_day === 1,
    observedAt: data.current.time ?? null,
  };
}

async function officialBeaches() {
  const [master, classifications] = await Promise.all([
    fetch(bathingBase + "v_badegewaesser_odata.csv", {
      next: { revalidate: 21600 },
    }),
    fetch(bathingBase + "v_einstufung_odata.csv", {
      next: { revalidate: 21600 },
    }),
  ]);

  if (!master.ok || !classifications.ok) {
    throw new Error("Badegewässerdaten nicht erreichbar");
  }

  const [masterText, classText] = await Promise.all([
    master
      .arrayBuffer()
      .then((bytes) => new TextDecoder("iso-8859-1").decode(bytes)),
    classifications
      .arrayBuffer()
      .then((bytes) => new TextDecoder("iso-8859-1").decode(bytes)),
  ]);

  const masterRows = masterText
    .split(/\r?\n/)
    .filter((row) => row.startsWith("DESH_PR_"))
    .map((row) => row.split("|"));
  const classRows = classText
    .split(/\r?\n/)
    .filter((row) => row.startsWith("DESH_PR_"))
    .map((row) => row.split("|"));

  return Object.fromEntries(
    regions.flatMap((region) =>
      region.beaches.map((id) => {
        const row = masterRows.find((entry) => entry[0] === id);
        const matching = classRows.filter((entry) => entry[0] === id);
        const latest = matching.sort(
          (a, b) => Number(b[2] || 0) - Number(a[2] || 0)
        )[0];
        const quality =
          latest?.[3]?.match(
            /^(ausgezeichnet|gut|ausreichend|mangelhaft)/i
          )?.[1] ?? null;

        return [
          id,
          row
            ? {
                name: row[3] || row[2],
                quality,
                period: latest ? `${latest[1]}–${latest[2]}` : null,
                source: "Land Schleswig-Holstein",
              }
            : null,
        ] as const;
      })
    )
  );
}

export async function GET() {
  const [forecastResults, beachesResult, warningsResult] = await Promise.all([
    Promise.allSettled(regions.map(weatherFor)),
    officialBeaches().catch(() => null),
    fetch(DWD_WARNINGS_URL, { next: { revalidate: 120 } })
      .then(async (response) => {
        if (!response.ok) throw new Error("DWD-Warnungen nicht erreichbar");
        return parseDwdJson(await response.text());
      })
      .catch(() => null),
  ]);

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    places: regions.map((region, index) => ({
      id: region.id,
      weather:
        forecastResults[index].status === "fulfilled"
          ? forecastResults[index].value
          : null,
      beaches: region.beaches
        .map((id) => beachesResult?.[id])
        .filter(Boolean),
      warnings: warningsResult
        ? normalizeWarnings(
            warningsResult,
            region.id === "flensburg"
              ? FLENSBURG_WARNCELL
              : SCHLESWIG_FLENSBURG_WARNCELL
          )
        : [],
    })),
    sources: {
      weather: "https://open-meteo.com/",
      bathing:
        "https://opendata.schleswig-holstein.de/collection/badegewasser-stammdaten/aktuell",
      warnings: "https://www.dwd.de/",
    },
  });
}
