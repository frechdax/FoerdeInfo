import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const DASHBOARD_URL = "https://portal.smarte-grenzregion.de/dashboard";
const CACHE_MS = 75_000;

export type SgrParking = {
  name: string;
  occupied: number | null;
  capacity: number | null;
  percent: number | null;
};

export type SgrVisitor = {
  name: string;
  current: number | null;
  today: number | null;
};

export type SgrSnapshot = {
  fetchedAt: string;
  parking: SgrParking[];
  visitors: SgrVisitor[];
};

let cache: { expiresAt: number; value: SgrSnapshot } | null = null;

const parkingNames = [
  "Parkplatz Deutsches Haus",
  "Parkplatz Exe",
  "Parkplatz Solitüde",
];

const visitorNames = [
  "Strandbad Solitüde",
  "Toosbüystraße/Norderstraße",
  "Tourist-Information",
  "Öffentliche Toiletten",
  "Ehemalige Synagoge",
  "Feuerwehr",
  "Museum 'Alte Münze'",
  "Fünf-Giebel-Haus",
  "Holm/Südermarkt",
  "Holm/Rathausstraße",
  "Große Straße/Nordermarkt",
];

const allCardNames = [
  ...parkingNames,
  "Parkplatz 'Am Deich'",
  ...visitorNames,
  "Brebel Kreuzung",
  "Süderbrarup Tannenbergweg",
  "Mohrkirch Babbestraße",
  "Mohrkirch Hauptstraße",
  "Gunneby Nr. 4",
];

function normalize(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

function segmentsFor(text: string, name: string) {
  const segments: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf(name, cursor);
    if (start < 0) break;
    let end = Math.min(text.length, start + 1400);
    for (const other of allCardNames) {
      if (other === name) continue;
      const candidate = text.indexOf(other, start + name.length);
      if (candidate >= 0 && candidate < end) end = candidate;
    }
    segments.push(text.slice(start, end));
    cursor = start + name.length;
  }
  return segments;
}

function unavailable(segment: string) {
  return /keine live-daten verfügbar|keine live daten verfügbar/i.test(segment);
}

function firstInt(pattern: RegExp, text: string) {
  const match = text.match(pattern);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseParking(text: string): SgrParking[] {
  const rows: SgrParking[] = [];
  for (const name of parkingNames) {
    for (const segment of segmentsFor(text, name)) {
      if (unavailable(segment)) continue;
      const pair = segment.match(/(\d+)\s*\/\s*(\d+)(?:\s*belegt)?/i);
      const occupied = pair ? Number(pair[1]) : null;
      const capacity = pair ? Number(pair[2]) : null;
      const percent =
        firstInt(/Aktuelle Parkzonenbelegung\s*(\d+)\s*%/i, segment) ??
        firstInt(/(\d+)\s*%\s*belegt/i, segment) ??
        (occupied !== null && capacity && capacity > 0
          ? Math.round((occupied / capacity) * 100)
          : null);

      if (occupied !== null || percent !== null) {
        rows.push({ name, occupied, capacity, percent });
        break;
      }
    }
  }
  return rows;
}

function parseVisitors(text: string): SgrVisitor[] {
  const rows: SgrVisitor[] = [];
  for (const name of visitorNames) {
    for (const segment of segmentsFor(text, name)) {
      if (unavailable(segment)) continue;
      const current =
        firstInt(/Aktuelle Besucheranzahl\s*(\d+)/i, segment) ??
        firstInt(/Besuchermanagement\s*(\d+)\s*(?:Besucher\s*)?Aktuell/i, segment) ??
        firstInt(/\n\s*(\d+)\s*\n\s*Aktuell/i, segment);
      const today = firstInt(
        /Heute wurden bis jetzt\s*(\d+)\s*Besucher/i,
        segment
      );

      if (current !== null || today !== null) {
        rows.push({ name, current, today });
        break;
      }
    }
  }
  return rows;
}

function parseDashboardText(raw: string): SgrSnapshot | null {
  const text = normalize(raw);
  const parking = parseParking(text);
  const visitors = parseVisitors(text);
  if (!parking.length && !visitors.length) return null;
  return { fetchedAt: new Date().toISOString(), parking, visitors };
}

async function renderDashboard() {
  chromium.setGraphicsMode = false;
  const browser = await puppeteer.launch({
    args: puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
    executablePath: await chromium.executablePath(),
    headless: "shell",
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const type = request.resourceType();
      if (type === "image" || type === "font" || type === "media") {
        void request.abort();
      } else {
        void request.continue();
      }
    });

    await page.goto(DASHBOARD_URL, {
      waitUntil: "networkidle2",
      timeout: 20_000,
    });

    await page
      .waitForFunction(
        () => {
          const text = document.body?.innerText ?? "";
          if (!text.includes("Parkplatz Deutsches Haus")) return false;
          return (
            /\d+\s*\/\s*\d+/.test(text) ||
            /Aktuelle Besucheranzahl\s*\d+/i.test(text) ||
            /Heute wurden bis jetzt\s*\d+\s*Besucher/i.test(text) ||
            /Keine Live-Daten verfügbar/i.test(text)
          );
        },
        { timeout: 12_000 }
      )
      .catch(() => undefined);

    await new Promise((resolve) => setTimeout(resolve, 1200));
    return await page.evaluate(() => document.body?.innerText ?? "");
  } finally {
    await browser.close();
  }
}

export async function getSmarteGrenzregionSnapshot(): Promise<SgrSnapshot | null> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  try {
    const text = await renderDashboard();
    const parsed = parseDashboardText(text);
    if (!parsed) return null;
    cache = { expiresAt: Date.now() + CACHE_MS, value: parsed };
    return parsed;
  } catch {
    return null;
  }
}
