import type { Metadata } from "next";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";
import EventsBrowser, { type CalendarEvent } from "./events-browser";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Veranstaltungen an der Flensburger Förde",
  description:
    "Aktuelle Termine für Flensburg, Wassersleben, Glücksburg und Langballig mit Suche, Filtern, Originalquelle und Kalender-Aktion.",
  alternates: { canonical: "/veranstaltungen" },
};

type ImportedEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  time: string | null;
  location: string | null;
  organizer: string | null;
  source_url: string | null;
};

type TaffEvent = {
  key: string;
  title: string;
  date: string;
  endDate: string | null;
  sourceUrl: string;
};

function deDateToIso(value: string) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTaffHighlights(): Promise<TaffEvent[]> {
  try {
    const response = await fetch("https://www.flensburger-foerde.de/", {
      next: { revalidate: 1800 },
      headers: { "user-agent": "foerde.info event reader" },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const sectionMatch = html.match(
      /Event-Hightlights([\s\S]{0,80000}?)(?:alle events|Alle Events)/i
    );
    const section = sectionMatch?.[1] ?? "";
    if (!section) return [];

    const anchorRegex =
      /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
    const seen = new Set<string>();
    const events: TaffEvent[] = [];
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(section))) {
      const text = stripHtml(match[3]);
      const parsed = text.match(
        /^(\d{2}\.\d{2}\.\d{4})(?:\s*-\s*(\d{2}\.\d{2}\.\d{4}))?\s+(.+)$/
      );
      if (!parsed) continue;

      const date = deDateToIso(parsed[1]);
      const endDate = parsed[2] ? deDateToIso(parsed[2]) : null;
      if (!date) continue;

      const title = parsed[3].trim();
      const sourceUrl = new URL(
        decodeEntities(match[2]),
        "https://www.flensburger-foerde.de/"
      ).toString();

      const key = `${date}|${endDate ?? ""}|${title.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      events.push({ key, title, date, endDate, sourceUrl });
    }

    return events.slice(0, 30);
  } catch {
    return [];
  }
}

function classifyRegion(event: { title: string; location?: string | null }) {
  const haystack = `${event.title} ${event.location ?? ""}`.toLowerCase();
  if (/wassersleben|harrislee/.test(haystack)) return "Wassersleben";
  if (/langballig|langballigau|unewatt/.test(haystack)) return "Langballig";
  if (/glücksburg|gluecksburg|holnis|sandwig|schausende/.test(haystack))
    return "Glücksburg";
  if (/flensburg|südermarkt|norderstraße|hafen/.test(haystack)) return "Flensburg";
  return "Förde-Region";
}

function externalCalendarHref(event: TaffEvent) {
  const params = new URLSearchParams({
    title: event.title,
    start: event.date,
    url: event.sourceUrl,
    location: "Flensburger Förde",
  });
  if (event.endDate) params.set("end", event.endDate);
  return `/api/calendar/external?${params.toString()}`;
}

export default async function EventsPage() {
  const current = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const supabase = createPublicServerSupabase();
  const [{ data }, taffEvents] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,description,date,end_date,time,location,organizer,source_url")
      .eq("status", "published")
      .or(`date.gte.${current},end_date.gte.${current}`)
      .order("date")
      .limit(100),
    fetchTaffHighlights(),
  ]);

  const imported = (data ?? []) as ImportedEvent[];
  const visibleTaff = taffEvents.filter(
    (event) => (event.endDate ?? event.date) >= current
  );

  const events: CalendarEvent[] = [
    ...imported.map((event) => ({
      key: `stored-${event.id}`,
      title: event.title,
      description: event.description,
      date: event.date,
      endDate: event.end_date,
      time: event.time,
      location: event.location,
      organizer: event.organizer,
      region: classifyRegion(event),
      sourceUrl: event.source_url,
      calendarUrl: `/api/calendar/${event.id}`,
      detailUrl: `/veranstaltungen/${event.id}`,
      detailExternal: false,
      sourceLabel: "förde.info / Originalquelle",
    })),
    ...visibleTaff.map((event) => ({
      key: `taff-${event.key}`,
      title: event.title,
      description: null,
      date: event.date,
      endDate: event.endDate,
      time: null,
      location: null,
      organizer: null,
      region: classifyRegion({ title: event.title }),
      sourceUrl: event.sourceUrl,
      calendarUrl: externalCalendarHref(event),
      detailUrl: event.sourceUrl,
      detailExternal: true,
      sourceLabel: "Tourismus Agentur Flensburger Förde / verlinkte Quelle",
    })),
  ].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title, "de");
  });

  return (
    <main className="foerde-page">
      <div className="foerde-shell">
        <header className="foerde-header">
          <a href="/" className="foerde-brand">
            ⚓ <strong>förde.info</strong>
          </a>
          <nav>
            <a href="/">Start</a>
            <a href="/live">Live</a>
          </nav>
        </header>

        <section className="foerde-intro">
          <span className="foerde-kicker">Termine für die Region</span>
          <h1>Veranstaltungen an der Förde</h1>
          <p>
            Suche nach Veranstaltungen und filtere nach Zeitraum oder Ort. Der
            Öffne alle verfügbaren Details, prüfe die Originalquelle und übernimm
            passende Termine direkt per iCalendar.
          </p>
        </section>

        <EventsBrowser events={events} today={current} />

        <footer className="foerde-footer">
          <span>
            Termine werden aus vorhandenen förde.info-Daten und öffentlich sichtbaren
            Event-Highlights ergänzt. Änderungen oder Absagen bitte in der Originalquelle prüfen.
          </span>
          <a href="/gluecksburg#impressum">Impressum & Datenschutz</a>
        </footer>
      </div>
    </main>
  );
}
