import { NextResponse } from "next/server";

export const revalidate = 300;

const LAT = 54.8357;
const LON = 9.5487;
const FLENSBURG_PEGEL_UUID = "9e19c411-f728-4a43-a057-39d4155c71cc";
const SCHLESWIG_FLENSBURG_WARNCELL = "101059000";

type WeatherPayload = {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    rain?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    wind_direction_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    weather_code?: number[];
  };
};

type PegelMeasurement = {
  timestamp: string;
  value: number;
  stateMnwMhw?: string;
  stateNswHsw?: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function temperaturePenalty(temp: number, ideal: number, tolerance: number) {
  return Math.max(0, Math.abs(temp - ideal) - tolerance) * 2.6;
}

function scoreLabel(score: number) {
  if (score >= 85) return "Sehr gut";
  if (score >= 70) return "Gut";
  if (score >= 50) return "Eher wechselhaft";
  return "Ungünstig";
}

function scoreTone(score: number) {
  if (score >= 70) return "good";
  if (score >= 50) return "mixed";
  return "poor";
}

function weatherLabel(code: number) {
  if (code === 0) return "Klar";
  if ([1, 2].includes(code)) return "Leicht bewölkt";
  if (code === 3) return "Bewölkt";
  if ([45, 48].includes(code)) return "Nebel";
  if ([51, 53, 55, 56, 57].includes(code)) return "Nieselregen";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Regen";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Schnee";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "Wechselhaft";
}

function activityScores(temp: number, wind: number, gusts: number, rainProbability: number, precipitation: number) {
  const wetPenalty = rainProbability * 0.48 + Math.min(30, precipitation * 12);
  const gustPenalty = Math.max(0, gusts - 35) * 0.7;

  const outside = clamp(
    100 - wetPenalty - Math.max(0, wind - 22) * 0.8 - gustPenalty - temperaturePenalty(temp, 18, 8)
  );
  const beach = clamp(
    100 - wetPenalty - Math.max(0, wind - 24) * 0.75 - gustPenalty - temperaturePenalty(temp, 23, 7)
  );
  const walk = clamp(
    100 - wetPenalty * 0.8 - Math.max(0, wind - 28) * 0.6 - gustPenalty * 0.7 - temperaturePenalty(temp, 16, 10)
  );
  const bike = clamp(
    100 - wetPenalty - Math.max(0, wind - 18) * 1.25 - gustPenalty * 1.1 - temperaturePenalty(temp, 17, 9)
  );

  return [
    { id: "outside", label: "Draußen", icon: "🌤️", score: outside, verdict: scoreLabel(outside), tone: scoreTone(outside) },
    { id: "beach", label: "Strand", icon: "🏖️", score: beach, verdict: scoreLabel(beach), tone: scoreTone(beach) },
    { id: "walk", label: "Spaziergang", icon: "🚶", score: walk, verdict: scoreLabel(walk), tone: scoreTone(walk) },
    { id: "bike", label: "Fahrrad", icon: "🚲", score: bike, verdict: scoreLabel(bike), tone: scoreTone(bike) },
  ];
}

function parseDwdJson(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/^[^(]+\((.*)\);?$/s);
  if (!match) throw new Error("Unbekanntes DWD-Format");
  return JSON.parse(match[1]);
}

export async function GET() {
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.search = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "precipitation",
      "wind_speed_10m",
      "wind_gusts_10m",
      "weather_code",
    ].join(","),
    timezone: "Europe/Berlin",
    forecast_hours: "6",
  }).toString();

  const pegelBase = `https://pegelonline.wsv.de/webservices/rest-api/v2/stations/${FLENSBURG_PEGEL_UUID}/W`;

  const [weatherResult, currentPegelResult, pegelHistoryResult, warningsResult] =
    await Promise.allSettled([
      fetch(weatherUrl, { next: { revalidate: 300 } }).then(async (response) => {
        if (!response.ok) throw new Error("Weather API unavailable");
        return (await response.json()) as WeatherPayload;
      }),
      fetch(`${pegelBase}/currentmeasurement.json`, { next: { revalidate: 300 } }).then(async (response) => {
        if (!response.ok) throw new Error("PEGELONLINE unavailable");
        return (await response.json()) as PegelMeasurement;
      }),
      fetch(`${pegelBase}/measurements.json?start=P2H`, { next: { revalidate: 300 } }).then(async (response) => {
        if (!response.ok) throw new Error("PEGELONLINE history unavailable");
        return (await response.json()) as PegelMeasurement[];
      }),
      fetch("https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json", {
        next: { revalidate: 120 },
      }).then(async (response) => {
        if (!response.ok) throw new Error("DWD warnings unavailable");
        return parseDwdJson(await response.text());
      }),
    ]);

  if (weatherResult.status === "rejected") {
    return NextResponse.json(
      { error: "Aktuelle Wetterdaten konnten nicht geladen werden." },
      { status: 503 }
    );
  }

  const weather = weatherResult.value;
  const current = weather.current ?? {};
  const hourly = weather.hourly ?? {};
  const currentHour = current.time?.slice(0, 13);
  const currentIndex = Math.max(
    0,
    (hourly.time ?? []).findIndex((entry) => entry.slice(0, 13) === currentHour)
  );
  const nextThreeRain = (hourly.precipitation_probability ?? [])
    .slice(currentIndex, currentIndex + 3)
    .map(Number)
    .filter(Number.isFinite);
  const rainProbability = nextThreeRain.length ? Math.max(...nextThreeRain) : 0;

  const temp = Number(current.temperature_2m ?? 0);
  const wind = Number(current.wind_speed_10m ?? 0);
  const gusts = Number(current.wind_gusts_10m ?? wind);
  const precipitation = Number(current.precipitation ?? 0);

  const scores = activityScores(temp, wind, gusts, rainProbability, precipitation);

  let pegel = null as null | {
    station: string;
    value: number;
    unit: string;
    timestamp: string;
    trendCm2h: number | null;
    trend: "steigend" | "fallend" | "stabil";
    state: string | null;
  };

  if (currentPegelResult.status === "fulfilled") {
    const value = Number(currentPegelResult.value.value);
    let trendCm2h: number | null = null;

    if (pegelHistoryResult.status === "fulfilled" && pegelHistoryResult.value.length > 1) {
      const first = pegelHistoryResult.value[0];
      const last = pegelHistoryResult.value[pegelHistoryResult.value.length - 1];
      trendCm2h = Math.round((Number(last.value) - Number(first.value)) * 10) / 10;
    }

    pegel = {
      station: "Flensburg",
      value,
      unit: "cm",
      timestamp: currentPegelResult.value.timestamp,
      trendCm2h,
      trend:
        trendCm2h === null || Math.abs(trendCm2h) < 1
          ? "stabil"
          : trendCm2h > 0
            ? "steigend"
            : "fallend",
      state: currentPegelResult.value.stateMnwMhw ?? null,
    };
  }

  let warnings: Array<{
    headline: string;
    event: string;
    level: number;
    start: number;
    end: number;
    description?: string;
    instruction?: string;
  }> = [];

  if (warningsResult.status === "fulfilled") {
    const warningMap = warningsResult.value?.warnings ?? {};
    const entries = warningMap[SCHLESWIG_FLENSBURG_WARNCELL] ?? [];
    warnings = entries.map((entry: Record<string, unknown>) => ({
      headline: String(entry.headline ?? entry.event ?? "Amtliche Wetterwarnung"),
      event: String(entry.event ?? "Wetterwarnung"),
      level: Number(entry.level ?? 1),
      start: Number(entry.start ?? 0),
      end: Number(entry.end ?? 0),
      description: entry.description ? String(entry.description) : undefined,
      instruction: entry.instruction ? String(entry.instruction) : undefined,
    }));
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    location: { name: "Glücksburg", latitude: LAT, longitude: LON },
    weather: {
      temperature: temp,
      apparentTemperature: Number(current.apparent_temperature ?? temp),
      precipitation,
      rain: Number(current.rain ?? 0),
      weatherCode: Number(current.weather_code ?? -1),
      weatherLabel: weatherLabel(Number(current.weather_code ?? -1)),
      windSpeed: wind,
      windGusts: gusts,
      windDirection: Number(current.wind_direction_10m ?? 0),
      rainProbability3h: rainProbability,
      observedAt: current.time ?? null,
    },
    scores,
    pegel,
    warnings,
    sources: [
      {
        name: "Open-Meteo",
        purpose: "Wetter und Kurzfristprognose",
        url: "https://open-meteo.com/",
      },
      {
        name: "Deutscher Wetterdienst",
        purpose: "Amtliche Wetterwarnungen",
        url: "https://www.dwd.de/",
      },
      {
        name: "PEGELONLINE / WSV",
        purpose: "Fördepegel Flensburg",
        url: "https://pegelonline.wsv.de/",
      },
    ],
  });
}
