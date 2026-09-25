import { NextResponse } from "next/server";

export const revalidate = 300;

const LAT = 54.7937;
const LON = 9.4469;
const FLENSBURG_PEGEL_UUID = "9e19c411-f728-4a43-a057-39d4155c71cc";
const FLENSBURG_WARNCELL = "101001000";
const SCHLESWIG_FLENSBURG_WARNCELL = "101059000";
const BATHING_BASE = "https://efi2.schleswig-holstein.de/bg/opendata";
const DANORD_URL = "https://danord.gdi-sh.de/viewer/resources/apps/BuFPlaene/index.html";

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
    is_day?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    weather_code?: number[];
    uv_index?: number[];
    is_day?: number[];
  };
};

type PegelMeasurement = {
  timestamp: string;
  value: number;
  stateMnwMhw?: string;
  stateNswHsw?: string;
};

type ActivityId = "outside" | "beach" | "walk" | "bike" | "playground";

type CsvRow = Record<string, string>;

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

function activityScore(
  activity: ActivityId,
  temp: number,
  wind: number,
  gusts: number,
  rainProbability: number,
  precipitation: number,
  uv: number,
  isDay: boolean,
  warningLevel: number,
  recentRainMm: number
) {
  const surfaceWetPenalty = Math.min(30, recentRainMm * 14);
  const wetPenalty =
    rainProbability * 0.48 + Math.min(30, precipitation * 12) + surfaceWetPenalty;
  const gustPenalty = Math.max(0, gusts - 35) * 0.7;
  const warningPenalty =
    warningLevel >= 3 ? 35 : warningLevel === 2 ? 18 : warningLevel === 1 ? 8 : 0;

  if (activity === "beach") {
    const base = clamp(
      100 - wetPenalty - Math.max(0, wind - 24) * 0.75 - gustPenalty -
      temperaturePenalty(temp, 23, 7) - Math.max(0, uv - 7) * 2 - warningPenalty
    );
    if (!isDay) return Math.min(base, 15);
    if (recentRainMm >= 0.3) return Math.min(base, 45);
    return base;
  }

  if (activity === "walk") {
    const base = clamp(
      100 - wetPenalty * 0.8 - Math.max(0, wind - 28) * 0.6 - gustPenalty * 0.7 -
      temperaturePenalty(temp, 16, 10) - Math.max(0, uv - 8) * 1.5 - warningPenalty
    );
    return isDay ? base : Math.min(base, 60);
  }

  if (activity === "bike") {
    const base = clamp(
      100 - wetPenalty - Math.max(0, wind - 18) * 1.25 - gustPenalty * 1.1 -
      temperaturePenalty(temp, 17, 9) - warningPenalty
    );
    return isDay ? base : Math.min(base, 35);
  }

  if (activity === "playground") {
    const base = clamp(
      100 - wetPenalty - Math.max(0, wind - 24) * 0.8 - gustPenalty * 0.8 -
      temperaturePenalty(temp, 18, 8) - Math.max(0, uv - 6) * 4 - warningPenalty
    );
    if (!isDay) return Math.min(base, 5);
    if (recentRainMm >= 0.3) return Math.min(base, 35);
    return base;
  }

  const base = clamp(
    100 - wetPenalty - Math.max(0, wind - 22) * 0.8 - gustPenalty -
    temperaturePenalty(temp, 18, 8) - warningPenalty
  );
  return isDay ? base : Math.min(base, 45);
}

function activityVerdict(
  activity: ActivityId,
  score: number,
  isDay: boolean,
  recentRainMm: number,
  localHour: number
) {
  const beforeNoon = localHour < 12;
  if (!isDay && activity === "beach") return beforeNoon ? "Noch zu früh / dunkel" : "Für heute zu spät";
  if (!isDay && activity === "playground") return beforeNoon ? "Noch zu früh / dunkel" : "Für heute zu spät";
  if (!isDay && activity === "bike") return beforeNoon ? "Noch dunkel · Licht nötig" : "Nur mit guter Beleuchtung";
  if (!isDay && activity === "walk") return beforeNoon ? "Noch dunkel" : "Okay, aber dunkel";
  if (!isDay && activity === "outside") return beforeNoon ? "Morgen / noch dunkel" : "Abend / dunkel";
  if (recentRainMm >= 0.3 && activity === "playground") return "Flächen wahrscheinlich nass";
  if (recentRainMm >= 0.3 && activity === "beach") return "Nass und eher ungemütlich";
  return scoreLabel(score);
}

function activityMeta(id: ActivityId) {
  if (id === "beach") return { label: "Strand", icon: "🏖️" };
  if (id === "walk") return { label: "Spaziergang", icon: "🚶" };
  if (id === "bike") return { label: "Fahrrad", icon: "🚲" };
  if (id === "playground") return { label: "Spielplatz", icon: "🛝" };
  return { label: "Draußen", icon: "🌤️" };
}

function parseDwdJson(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/^[^(]+\((.*)\);?$/s);
  if (!match) throw new Error("Unbekanntes DWD-Format");
  return JSON.parse(match[1]);
}

function parseDelimitedLine(line: string, delimiter = "|") {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
}

function parsePipeCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [] as CsvRow[];

  const headers = parseDelimitedLine(lines[0]).map((header) => header.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    const cells = parseDelimitedLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = (cells[index] || "").replace(/^"|"$/g, "").trim();
      return row;
    }, {});
  });
}

async function fetchLatin1Csv(url: string) {
  const response = await fetch(url, { next: { revalidate: 21600 } });
  if (!response.ok) throw new Error("Open-Data-Datei nicht erreichbar");
  const bytes = await response.arrayBuffer();
  const text = new TextDecoder("iso-8859-1").decode(bytes);
  return parsePipeCsv(text);
}

function parseGermanNumber(value?: string) {
  if (!value) return null;
  const parsed = Number(value.replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGermanDate(value?: string) {
  if (!value) return 0;
  const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return 0;
  return Date.UTC(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
    Number(match[4] || 12),
    Number(match[5] || 0),
    Number(match[6] || 0)
  );
}

function normalizeKey(value: string) {
  return value
    .toLocaleLowerCase("de")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

function fieldByKey(row: CsvRow | undefined, patterns: RegExp[]) {
  if (!row) return "";
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    if (value && patterns.some((pattern) => pattern.test(normalized))) return value;
  }
  return "";
}

function valueMatching(row: CsvRow | undefined, pattern: RegExp) {
  if (!row) return "";
  return Object.values(row).find((value) => pattern.test(value)) || "";
}

function rowDateValue(row: CsvRow) {
  return Object.values(row).reduce((latest, value) => Math.max(latest, parseGermanDate(value)), 0);
}

function identifierCandidates(row: CsvRow) {
  return Object.entries(row)
    .filter(([key, value]) => {
      if (!value) return false;
      const normalized = normalizeKey(key);
      return /(id|code|kennung|nummer|nr)/.test(normalized);
    })
    .map(([, value]) => value)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function normalizeValue(value: string) {
  return value
    .toLocaleLowerCase("de")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

function relatedRows(master: CsvRow, rows: CsvRow[]) {
  const ids = identifierCandidates(master);
  const direct = rows.filter((row) => ids.some((id) => Object.values(row).includes(id)));
  if (direct.length) return direct;

  const masterValues = new Set(
    Object.values(master)
      .map(normalizeValue)
      .filter((value) => value.length >= 4 && !/^(ostsee|gluecksburg|schleswigholstein)$/.test(value))
  );

  const scored = rows
    .map((row) => ({
      row,
      score: Object.values(row)
        .map(normalizeValue)
        .filter((value) => value.length >= 4)
        .reduce((sum, value) => sum + (masterValues.has(value) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0);

  if (!scored.length) return [] as CsvRow[];
  const bestScore = Math.max(...scored.map((entry) => entry.score));
  return scored.filter((entry) => entry.score === bestScore).map((entry) => entry.row);
}

function beachDisplayName(row: CsvRow) {
  const all = Object.values(row).join(" ");
  if (/solit(?:ü|ue)de/i.test(all)) return "Solitüde";
  if (/ost(?:see)?bad/i.test(all) || /ostseebad/i.test(all)) return "Ostseebad";
  if (/wassersleben/i.test(all)) return "Wassersleben";
  if (/holnis\s*drei/i.test(all)) return "Holnis Drei";
  if (/sandwig/i.test(all) || /gl(?:ü|ue)cksburg\s*strand/i.test(all)) {
    return "Sandwig";
  }

  return (
    fieldByKey(row, [
      /allgemeingebraeuchl.*name/,
      /kurzname/,
      /badegewaesser.*name/,
      /messstellen.*name/,
      /bezeichnung/,
      /name/,
    ]) ||
    valueMatching(row, /(strand|holnis|badestelle)/i) ||
    "Badestelle"
  );
}

function qualityRank(value: string) {
  const normalized = value.toLocaleLowerCase("de");
  if (normalized.includes("ausgezeichnet")) return 4;
  if (normalized.includes("gut")) return 3;
  if (normalized.includes("ausreichend")) return 2;
  if (normalized.includes("mangelhaft")) return 1;
  return 0;
}

function beachTrafficLight(
  quality: string,
  beachScore: number,
  uvIndex: number,
  warningLevel: number,
  gusts: number
) {
  const q = qualityRank(quality);

  if (q === 1 || warningLevel >= 3 || beachScore < 42 || gusts >= 60) {
    return {
      status: "red" as const,
      label: "Rot",
      summary: q === 1 ? "Amtliche Qualitätsbewertung beachten" : "Bedingungen aktuell ungünstig",
    };
  }

  if (q === 2 || q === 0 || warningLevel > 0 || beachScore < 72 || uvIndex >= 6 || gusts >= 42) {
    return {
      status: "yellow" as const,
      label: "Gelb",
      summary: uvIndex >= 6 ? "Gute Bedingungen, aber UV-Schutz beachten" : "Mit Einschränkungen",
    };
  }

  return {
    status: "green" as const,
    label: "Grün",
    summary: "Gute Gesamtbedingungen",
  };
}

function hourLabel(value: string) {
  return value.slice(11, 16);
}

function endHourLabel(value: string, offset: number) {
  const hour = Number(value.slice(11, 13));
  const end = hour + offset;
  return (end >= 24 ? "24" : String(end).padStart(2, "0")) + ":00";
}

function buildBestTimes(
  hourly: NonNullable<WeatherPayload["hourly"]>,
  currentTime: string | undefined,
  warningLevel: number
) {
  const times = hourly.time || [];
  const temps = hourly.temperature_2m || [];
  const rainProb = hourly.precipitation_probability || [];
  const precipitation = hourly.precipitation || [];
  const wind = hourly.wind_speed_10m || [];
  const gusts = hourly.wind_gusts_10m || [];
  const uv = hourly.uv_index || [];
  const isDay = hourly.is_day || [];
  const currentMoment = currentTime || times[0] || "";
  const currentDate = currentMoment.slice(0, 10);

  const activities: ActivityId[] = ["beach", "walk", "bike", "playground"];
  const minScore: Record<ActivityId, number> = {
    outside: 50,
    beach: 60,
    walk: 55,
    bike: 55,
    playground: 60,
  };

  return activities.map((activity) => {
    let best:
      | {
          start: string;
          end: string;
          score: number;
          rain: number;
          wind: number;
          uv: number;
        }
      | null = null;

    for (let i = 0; i < times.length - 1; i += 1) {
      if (times[i].slice(0, 10) !== currentDate) continue;
      if (times[i] <= currentMoment) continue;
      if (times[i + 1].slice(0, 10) !== currentDate) continue;

      const hour = Number(times[i].slice(11, 13));
      const dayA = Number(isDay[i] ?? 0) === 1;
      const dayB = Number(isDay[i + 1] ?? 0) === 1;

      // "Beste Zeit" soll ein wirklich sinnvoll nutzbares Zeitfenster sein.
      if (!dayA || !dayB) continue;
      if (activity === "playground" && (hour < 8 || hour >= 19)) continue;
      if (activity === "beach" && (hour < 9 || hour >= 20)) continue;
      if (activity === "bike" && (hour < 7 || hour >= 20)) continue;
      if (activity === "walk" && (hour < 6 || hour >= 21)) continue;

      const recentRainA = precipitation
        .slice(Math.max(0, i - 2), i + 1)
        .reduce((sum, value) => sum + Number(value || 0), 0);
      const recentRainB = precipitation
        .slice(Math.max(0, i - 1), i + 2)
        .reduce((sum, value) => sum + Number(value || 0), 0);

      const scoreA = activityScore(
        activity,
        Number(temps[i] || 0),
        Number(wind[i] || 0),
        Number(gusts[i] || wind[i] || 0),
        Number(rainProb[i] || 0),
        Number(precipitation[i] || 0),
        Number(uv[i] || 0),
        dayA,
        warningLevel,
        recentRainA
      );
      const scoreB = activityScore(
        activity,
        Number(temps[i + 1] || 0),
        Number(wind[i + 1] || 0),
        Number(gusts[i + 1] || wind[i + 1] || 0),
        Number(rainProb[i + 1] || 0),
        Number(precipitation[i + 1] || 0),
        Number(uv[i + 1] || 0),
        dayB,
        warningLevel,
        recentRainB
      );

      const candidate = {
        start: times[i].slice(11, 16),
        end: times[i + 1].slice(11, 16).replace(":00", "") + ":59",
        score: Math.round((scoreA + scoreB) / 2),
        rain: Math.round((Number(rainProb[i] || 0) + Number(rainProb[i + 1] || 0)) / 2),
        wind: Math.round((Number(wind[i] || 0) + Number(wind[i + 1] || 0)) / 2),
        uv: Math.round(((Number(uv[i] || 0) + Number(uv[i + 1] || 0)) / 2) * 10) / 10,
      };

      if (candidate.score < minScore[activity]) continue;
      if (!best || candidate.score > best.score) best = candidate;
    }

    const meta = activityMeta(activity);
    return {
      id: activity,
      label: meta.label,
      icon: meta.icon,
      start: best?.start || null,
      end: best?.end || null,
      score: best?.score ?? null,
      rainProbability: best?.rain ?? null,
      windSpeed: best?.wind ?? null,
      uvIndex: best?.uv ?? null,
      verdict: best ? scoreLabel(best.score) : "Heute kein sinnvolles Zeitfenster mehr",
    };
  });
}

async function loadChanges() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wggtdpyzkeneyfywcume.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_goBV5794K15cywyrAFSRpg_RdEpycrg";

  const headers = {
    apikey: supabaseKey,
    Authorization: "Bearer " + supabaseKey,
  };

  const queries = [
    fetch(
      supabaseUrl +
        "/rest/v1/official_notices?select=id,published_at,title,source_url&order=published_at.desc.nullslast&limit=80",
      { headers, next: { revalidate: 900 } }
    ).then((response) => (response.ok ? response.json() : [])),
    fetch(
      supabaseUrl +
        "/rest/v1/rathaus_news?select=id,published_at,title,source_url&order=published_at.desc.nullslast&limit=80",
      { headers, next: { revalidate: 900 } }
    ).then((response) => (response.ok ? response.json() : [])),
  ];

  const [notices, news] = await Promise.all(queries);
  const keywords =
    /(bebauungsplan|bauleit|flächennutzungsplan|flaechennutzungsplan|baugebiet|baustell|straßenbau|strassenbau|sperrung|vollsperr|teilsperr|verkehr|sanierung|ausbau|erschließ|erschliess|planung|bauvorhaben|satzung)/i;

  const sourceItems = [
    ...(notices as Array<Record<string, unknown>>).map((item) => ({
      ...item,
      sourceType: "Amtliche Bekanntmachung",
    })),
    ...(news as Array<Record<string, unknown>>).map((item) => ({
      ...item,
      sourceType: "Rathaus",
    })),
  ] as Array<Record<string, unknown> & { sourceType: string }>;

  const normalized = sourceItems
    .filter((item) => keywords.test(String(item.title || "")))
    .map((item) => {
      const title = String(item.title || "");
      const category = /bebauungsplan|bauleit|flächennutzungsplan|flaechennutzungsplan|satzung/i.test(title)
        ? "Bauleitplanung"
        : /sperrung|vollsperr|teilsperr|verkehr|straßenbau|strassenbau|baustell/i.test(title)
          ? "Straße & Verkehr"
          : "Bau & Entwicklung";

      return {
        id: String(item.sourceType || "") + "-" + String(item.id || title),
        title,
        publishedAt: item.published_at ? String(item.published_at) : null,
        sourceUrl: String(item.source_url || DANORD_URL),
        sourceType: String(item.sourceType || "Amtliche Quelle"),
        category,
      };
    })
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));

  const seen = new Set<string>();
  return normalized.filter((item) => {
    const key = item.title.toLocaleLowerCase("de").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

async function loadBeaches(
  beachWeatherScore: number,
  uvIndex: number,
  warningLevel: number,
  gusts: number,
  windSpeed: number,
  rainProbability: number
) {
  const [masterRows, classificationRows, measurementRows] = await Promise.all([
    fetchLatin1Csv(BATHING_BASE + "/v_badegewaesser_odata.csv"),
    fetchLatin1Csv(BATHING_BASE + "/v_einstufung_odata.csv"),
    fetchLatin1Csv(BATHING_BASE + "/v_proben_odata.csv"),
  ]);

  const wanted = ["Solitüde", "Ostseebad", "Wassersleben", "Sandwig", "Holnis Drei"];

  const targets = masterRows
    .filter((row) => {
      const all = Object.values(row).join(" ");
      return /solit(?:ü|ue)de/i.test(all) ||
        /ost(?:see)?bad/i.test(all) ||
        /wassersleben/i.test(all) ||
        /holnis\s*drei/i.test(all) ||
        /sandwig/i.test(all) ||
        /gl(?:ü|ue)cksburg\s*strand/i.test(all);
    })
    .filter((row, index, rows) => {
      const name = beachDisplayName(row);
      return rows.findIndex((entry) => beachDisplayName(entry) === name) === index;
    })
    .sort((a, b) => wanted.indexOf(beachDisplayName(a)) - wanted.indexOf(beachDisplayName(b)));

  return targets.map((row) => {
    const classifications = relatedRows(row, classificationRows)
      .sort((a, b) => rowDateValue(b) - rowDateValue(a));
    const measurements = relatedRows(row, measurementRows)
      .sort((a, b) => rowDateValue(b) - rowDateValue(a));

    const latestClassification = classifications[0];
    const latestMeasurement = measurements[0];

    const quality =
      valueMatching(latestClassification, /ausgezeichnet|gut|ausreichend|mangelhaft/i) ||
      "keine veröffentlichte Einstufung gefunden";

    const periodYears = latestClassification
      ? Object.values(latestClassification)
          .filter((value) => /^20\d{2}$/.test(value))
          .filter((value, index, values) => values.indexOf(value) === index)
          .sort()
      : [];

    const waterTemperature = parseGermanNumber(
      fieldByKey(latestMeasurement, [/wassertemp/, /temperatur.*wasser/, /wasser.*temperatur/])
    );

    const dateValue =
      fieldByKey(latestMeasurement, [/datummessung/, /mess.*datum/, /proben.*datum/, /datum/]) ||
      (latestMeasurement
        ? Object.values(latestMeasurement).find((value) => parseGermanDate(value) > 0) || ""
        : "");

    const remark = fieldByKey(latestMeasurement, [/bemerk/, /hinweis/, /kommentar/]) || null;
    const ids = identifierCandidates(row);
    const name = beachDisplayName(row);
    const light = beachTrafficLight(quality, beachWeatherScore, uvIndex, warningLevel, gusts);
    const region =
      name === "Solitüde" || name === "Ostseebad"
        ? "Flensburg"
        : name === "Wassersleben"
          ? "Wassersleben / Harrislee"
          : "Glücksburg";

    return {
      id: ids[0] || name,
      name,
      region,
      latitude: parseGermanNumber(fieldByKey(row, [/geogr.*breite/, /breitengrad/, /latitude/, /lat/])),
      longitude: parseGermanNumber(fieldByKey(row, [/geogr.*laenge/, /laengengrad/, /longitude/, /lon/])),
      quality,
      qualityPeriod: periodYears.length ? periodYears.join("–") : null,
      waterTemperature,
      lastSampleAt: dateValue || null,
      remark,
      status: light.status,
      statusLabel: light.label,
      summary: light.summary,
      weatherScore: beachWeatherScore,
      uvIndex,
      windSpeed,
      rainProbability,
      officialBathingData: true,
    };
  });
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
      "is_day",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "precipitation",
      "wind_speed_10m",
      "wind_gusts_10m",
      "weather_code",
      "uv_index",
      "is_day",
    ].join(","),
    timezone: "Europe/Berlin",
    forecast_days: "1",
  }).toString();

  const pegelBase =
    "https://pegelonline.wsv.de/webservices/rest-api/v2/stations/" +
    FLENSBURG_PEGEL_UUID +
    "/W";

  const [weatherResult, currentPegelResult, pegelHistoryResult, warningsResult, changesResult] =
    await Promise.allSettled([
      fetch(weatherUrl, { next: { revalidate: 300 } }).then(async (response) => {
        if (!response.ok) throw new Error("Weather API unavailable");
        return (await response.json()) as WeatherPayload;
      }),
      fetch(pegelBase + "/currentmeasurement.json", { next: { revalidate: 300 } }).then(
        async (response) => {
          if (!response.ok) throw new Error("PEGELONLINE unavailable");
          return (await response.json()) as PegelMeasurement;
        }
      ),
      fetch(pegelBase + "/measurements.json?start=PT6H", { next: { revalidate: 300 } }).then(
        async (response) => {
          if (!response.ok) throw new Error("PEGELONLINE history unavailable");
          return (await response.json()) as PegelMeasurement[];
        }
      ),
      fetch("https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json", {
        next: { revalidate: 120 },
      }).then(async (response) => {
        if (!response.ok) throw new Error("DWD warnings unavailable");
        return parseDwdJson(await response.text());
      }),
      loadChanges(),
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
  const recentRainMm = (hourly.precipitation ?? [])
    .slice(Math.max(0, currentIndex - 2), currentIndex + 1)
    .reduce((sum, value) => sum + Number(value || 0), 0);
  const currentUv = Number((hourly.uv_index ?? [])[currentIndex] ?? 0);
  // Für "jetzt" den minutengenauen aktuellen Tageslichtwert verwenden.
  // Der stündliche Wert (z. B. 07:00) kann nach Sonnenaufgang noch "Nacht" melden.
  const currentIsDay =
    current.is_day !== undefined
      ? Number(current.is_day) === 1
      : Number((hourly.is_day ?? [])[currentIndex] ?? 1) === 1;
  const currentLocalHour = Number(current.time?.slice(11, 13) ?? 12);

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
    const entries = [
      ...(warningMap[FLENSBURG_WARNCELL] ?? []),
      ...(warningMap[SCHLESWIG_FLENSBURG_WARNCELL] ?? []),
    ];
    const seenWarnings = new Set<string>();
    warnings = entries
      .filter((entry: Record<string, unknown>) => {
        const key = String(entry.headline ?? entry.event ?? "") + ":" + String(entry.start ?? "");
        if (seenWarnings.has(key)) return false;
        seenWarnings.add(key);
        return true;
      })
      .map((entry: Record<string, unknown>) => ({
      headline: String(entry.headline ?? entry.event ?? "Amtliche Wetterwarnung"),
      event: String(entry.event ?? "Wetterwarnung"),
      level: Number(entry.level ?? 1),
      start: Number(entry.start ?? 0),
      end: Number(entry.end ?? 0),
      description: entry.description ? String(entry.description) : undefined,
      instruction: entry.instruction ? String(entry.instruction) : undefined,
    }));
  }

  const warningLevel = warnings.reduce((max, item) => Math.max(max, item.level || 0), 0);
  const activityIds: ActivityId[] = ["outside", "beach", "walk", "bike", "playground"];
  const scores = activityIds.map((id) => {
    const score = activityScore(
      id,
      temp,
      wind,
      gusts,
      rainProbability,
      precipitation,
      currentUv,
      currentIsDay,
      warningLevel,
      recentRainMm
    );
    const meta = activityMeta(id);
    return {
      id,
      label: meta.label,
      icon: meta.icon,
      score,
      verdict: activityVerdict(id, score, currentIsDay, recentRainMm, currentLocalHour),
      tone: scoreTone(score),
    };
  });

  const bestTimes = buildBestTimes(hourly, current.time, warningLevel);
  const beachScore = scores.find((item) => item.id === "beach")?.score ?? 0;

  const beachesResult = await Promise.allSettled([
    loadBeaches(beachScore, currentUv, warningLevel, gusts, wind, rainProbability),
  ]);
  const beaches =
    beachesResult[0].status === "fulfilled" ? beachesResult[0].value : [];

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

    if (pegelHistoryResult.status === "fulfilled" && pegelHistoryResult.value.length) {
      const history = pegelHistoryResult.value
        .filter((item) => Number.isFinite(Number(item.value)) && !Number.isNaN(new Date(item.timestamp).getTime()))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const currentTimestamp = new Date(currentPegelResult.value.timestamp).getTime();
      const targetTimestamp = currentTimestamp - 2 * 60 * 60 * 1000;
      const baseline = history.reduce<PegelMeasurement | null>((best, item) => {
        if (!best) return item;
        const bestDistance = Math.abs(new Date(best.timestamp).getTime() - targetTimestamp);
        const itemDistance = Math.abs(new Date(item.timestamp).getTime() - targetTimestamp);
        return itemDistance < bestDistance ? item : best;
      }, null);

      if (baseline) {
        const ageMinutes =
          Math.abs(currentTimestamp - new Date(baseline.timestamp).getTime()) / 60000;
        if (ageMinutes >= 45) {
          trendCm2h =
            Math.round((value - Number(baseline.value)) * 10) / 10;
        }
      }
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

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    location: {
      name: "Flensburg",
      latitude: LAT,
      longitude: LON,
      areas: ["Flensburg", "Wassersleben", "Glücksburg"],
    },
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
      recentRainMm: Math.round(recentRainMm * 10) / 10,
      surfaceWet: recentRainMm >= 0.3,
      uvIndex: currentUv,
      isDay: currentIsDay,
      observedAt: current.time ?? null,
    },
    scores,
    bestTimes,
    beaches,
    changes: changesResult.status === "fulfilled" ? changesResult.value : [],
    planningSourceUrl: DANORD_URL,
    pegel,
    warnings,
    sources: [
      {
        name: "Open-Meteo",
        purpose: "Wetter, UV und Kurzfristprognose",
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
      {
        name: "Land Schleswig-Holstein",
        purpose: "Amtliche Badegewässerdaten für Flensburg, Wassersleben und Glücksburg",
        url: "https://www.schleswig-holstein.de/DE/landesregierung/themen/gesundheit-verbraucherschutz/badegewaesserqualitaet",
      },
      {
        name: "Stadt Flensburg",
        purpose: "Badewasserqualität Solitüde und Ostseebad",
        url: "https://www.flensburg.de/Leben-Soziales/Gesundheitsdienste/Infektionsschutz/Hygiene-Umweltmedizin/Badewasserqualit%C3%A4t/",
      },
      {
        name: "Digitaler Atlas Nord",
        purpose: "Bauleitplanung Schleswig-Holstein",
        url: DANORD_URL,
      },
    ],
  });
}
