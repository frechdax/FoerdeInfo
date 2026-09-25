import type { Metadata } from "next";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";
import { regions } from "@/lib/regions";
import styles from "./events.module.css";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Veranstaltungen an der Flensburger Förde",
  description:
    "Aktuelle Termine für Flensburg, Wassersleben, Glücksburg und Langballig mit Originalquelle und Kalender-Aktion.",
  alternates: { canonical: "/veranstaltungen" },
};

type ImportedEvent = {
  id: string;
  title: string;
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

function dateLabel(start: string, end?: string | null) {
  const format = (value: string) =>
    new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));

  if (end && end !== start) return `${format(start)} – ${format(end)}`;
  return format(start);
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

    return events.slice(0, 18);
  } catch {
    return [];
  }
}

function classifyRegion(event: Pick<ImportedEvent, "title" | "location">) {
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
      .select(
        "id,title,date,end_date,time,location,organizer,source_url"
      )
      .eq("status", "published")
      .gte("date", current)
      .order("date")
      .limit(80),
    fetchTaffHighlights(),
  ]);

  const imported = (data ?? []) as ImportedEvent[];
  const visibleTaff = taffEvents.filter(
    (event) => (event.endDate ?? event.date) >= current
  );

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
            <a href="/urlaub">Entdecken</a>
          </nav>
        </header>

        <section className="foerde-intro">
          <span className="foerde-kicker">Termine für die Region</span>
          <h1>Veranstaltungen an der Förde</h1>
          <p>
            Aktuelle Termine mit Details, Originalquelle und iCalendar-Aktion.
            Änderungen oder Absagen bitte immer noch einmal beim Veranstalter prüfen.
          </p>
        </section>

        <section className={styles.sourceStrip} aria-label="Originalkalender">
          {regions.map((region) => (
            <a
              key={region.id}
              href={region.eventsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>📍</span>
              <span>
                <strong>{region.name}</strong>
                <small>Originalkalender ↗</small>
              </span>
            </a>
          ))}
        </section>

        {imported.length > 0 ? (
          <section className={styles.eventSection}>
            <div className={styles.sectionHead}>
              <div>
                <span className="foerde-kicker">Auf förde.info erfasst</span>
                <h2>Nächste Termine</h2>
              </div>
              <span>{imported.length} Einträge</span>
            </div>

            <div className={styles.eventGrid}>
              {imported.map((event) => (
                <article className={styles.eventCard} key={event.id}>
                  <div className={styles.eventDate}>
                    <span>{dateLabel(event.date, event.end_date)}</span>
                    <small>{classifyRegion(event)}</small>
                  </div>
                  <div className={styles.eventCopy}>
                    <h3>{event.title}</h3>
                    <p>
                      {event.time ? `${String(event.time).slice(0, 5)} Uhr` : "Uhrzeit siehe Quelle"}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    {event.organizer ? <small>{event.organizer}</small> : null}
                  </div>
                  <div className={styles.eventActions}>
                    <a href={`/veranstaltungen/${event.id}`}>Details</a>
                    <a href={`/api/calendar/${event.id}`}>📅 iCal</a>
                    {event.source_url ? (
                      <a
                        href={event.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Original ↗
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {visibleTaff.length > 0 ? (
          <section className={styles.eventSection}>
            <div className={styles.sectionHead}>
              <div>
                <span className="foerde-kicker">Öffentliche Event-Highlights</span>
                <h2>Flensburger Förde</h2>
              </div>
              <span>automatisch aktualisiert</span>
            </div>

            <div className={styles.eventGrid}>
              {visibleTaff.map((event) => (
                <article className={styles.eventCard} key={event.key}>
                  <div className={styles.eventDate}>
                    <span>{dateLabel(event.date, event.endDate)}</span>
                    <small>Förde-Region</small>
                  </div>
                  <div className={styles.eventCopy}>
                    <h3>{event.title}</h3>
                    <p>Details und kurzfristige Änderungen in der Originalquelle.</p>
                    <small>Tourismus Agentur Flensburger Förde / verlinkte Quelle</small>
                  </div>
                  <div className={styles.eventActions}>
                    <a href={externalCalendarHref(event)}>📅 iCal</a>
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Details / Original ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="foerde-footer">
          <span>
            Termine werden aus vorhandenen förde.info-Daten und öffentlich sichtbaren
            Event-Highlights ergänzt.
          </span>
          <a href="/gluecksburg#impressum">Impressum & Datenschutz</a>
        </footer>
      </div>
    </main>
  );
}
