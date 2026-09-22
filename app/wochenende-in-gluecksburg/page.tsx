import type { Metadata } from "next";
import SeoLanding from "../seo-landing";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";

export const metadata: Metadata = {
  title: "Dieses Wochenende in Glücksburg – Veranstaltungen",
  description:
    "Was ist dieses Wochenende in Glücksburg los? Veranstaltungen und Termine von Freitag bis Sonntag aktuell zusammengestellt.",
  alternates: { canonical: "/wochenende-in-gluecksburg" },
  openGraph: {
    title: "Dieses Wochenende in Glücksburg",
    description: "Veranstaltungen und Termine fürs Wochenende in Glücksburg.",
    url: "/wochenende-in-gluecksburg",
  },
};

export const revalidate = 900;

function berlinTodayParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = parts.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function weekendRange() {
  const today = berlinTodayParts();
  const weekday = today.getUTCDay();
  let friday: Date;

  if (weekday === 5) friday = today;
  else if (weekday === 6) friday = addDays(today, -1);
  else if (weekday === 0) friday = addDays(today, -2);
  else friday = addDays(today, 5 - weekday);

  return { start: ymd(friday), end: ymd(addDays(friday, 2)) };
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value + "T12:00:00Z"));
}

export default async function WochenendeInGluecksburgPage() {
  const { start, end } = weekendRange();
  const supabase = createPublicServerSupabase();
  const { data } = await supabase
    .from("events")
    .select("id,title,date,time,location,source_url")
    .eq("status", "published")
    .gte("date", start)
    .lte("date", end)
    .order("date")
    .order("time")
    .limit(80);

  const events = data ?? [];

  return (
    <SeoLanding
      eyebrow={`${shortDate(start)} – ${shortDate(end)}`}
      title="Dieses Wochenende in Glücksburg"
      intro="Freitag bis Sonntag auf einen Blick: aktuelle Veranstaltungen und lokale Termine in Glücksburg."
      bullets={[
        "Veranstaltungen von Freitag bis Sonntag",
        "Vielfältige Veranstaltungen und Termine",
        "Datum, Uhrzeit und Ort kompakt",
        "Direkte Links zu den Veranstaltern",
      ]}
      ctaLabel="Vollständigen Kalender öffnen"
      ctaHref="/#events"
      canonicalPath="/wochenende-in-gluecksburg"
      compactOverview
    >
      <section className="seo-card">
        <h2>{events.length ? `${events.length} Termine am Wochenende` : "Noch keine Termine gefunden"}</h2>
        {events.length ? (
          <div className="seo-live-list">
            {events.map((event) => (
              <article key={event.id} className="seo-live-row">
                <div>
                  <strong>{event.title}</strong>
                  <span>
                    {shortDate(event.date)}
                    {event.time ? ` · ${String(event.time).slice(0, 5)} Uhr` : ""}
                    {event.location ? ` · ${event.location}` : ""}
                  </span>
                </div>
                <div className="seo-event-actions">
                  <a
                    className="seo-event-button seo-event-calendar-button"
                    href={`/api/calendar/${event.id}`}
                    download
                  >
                    📅 Kalender
                  </a>
                  {event.source_url ? (
                    <a
                      className="seo-event-button seo-event-source-button"
                      href={event.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mehr erfahren ↗
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>
            Für dieses Wochenende sind derzeit keine veröffentlichten Termine hinterlegt.
            Der Veranstaltungskalender wird laufend aktualisiert.
          </p>
        )}
      </section>

      <section className="seo-card">
        <h2>Was ist heute los?</h2>
        <p>Für spontane Unternehmungen gibt es zusätzlich eine eigene Tagesübersicht.</p>
        <a className="button" href="/heute-in-gluecksburg">Heute in Glücksburg →</a>
      </section>
    </SeoLanding>
  );
}
