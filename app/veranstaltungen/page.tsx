import type { Metadata } from "next";
import SeoLanding from "../seo-landing";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";

export const metadata: Metadata = {
  title: "Veranstaltungen Glücksburg – Was ist los in Glücksburg?",
  description:
    "Aktuelle Veranstaltungen in Glücksburg (Ostsee): Termine, Familienangebote und lokale Events mit Datum, Ort und Kalender-Download.",
  alternates: { canonical: "/veranstaltungen" },
  openGraph: {
    title: "Veranstaltungen in Glücksburg",
    description: "Was ist los in Glücksburg? Aktuelle Termine und Veranstaltungen entdecken.",
    url: "/veranstaltungen",
  },
};

export const revalidate = 1800;

function todayBerlin() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function eventDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value + "T12:00:00"));
}

export default async function VeranstaltungenPage() {
  const supabase = createPublicServerSupabase();
  const { data } = await supabase
    .from("events")
    .select("id,title,description,date,end_date,time,location,organizer,source_url")
    .eq("status", "published")
    .gte("date", todayBerlin())
    .order("date")
    .limit(8);

  const upcoming = data ?? [];

  return (
    <SeoLanding
      eyebrow="Was ist los in Glücksburg?"
      title="Veranstaltungen in Glücksburg"
      intro="Entdecke aktuelle Termine in Glücksburg – von Familienangeboten über Kultur bis zu lokalen Veranstaltungen und Aktionen."
      bullets={[
        "Aktuelle Veranstaltungen und Termine",
        "Familienfreundliche Angebote",
        "Ort und Uhrzeit auf einen Blick",
        "Termine direkt als iCalendar-Datei speichern",
      ]}
      ctaLabel="Veranstaltungen anzeigen"
      ctaHref="/#events"
      canonicalPath="/veranstaltungen"
    >
      <section className="seo-card">
        <h2>Was ist demnächst in Glücksburg los?</h2>
        {upcoming.length ? (
          <div className="seo-live-list">
            {upcoming.map((event) => (
              <article key={event.id} className="seo-live-row">
                <div>
                  <a href={`/veranstaltungen/${event.id}`}><strong>{event.title}</strong></a>
                  <span>
                    {eventDate(event.date)}
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
          <p>Aktuell konnten keine kommenden Termine geladen werden.</p>
        )}
      </section>

      <section className="seo-card">
        <h2>Schnell finden</h2>
        <p>
          Für spontane Pläne gibt es eigene Übersichten für den heutigen Tag und das kommende
          beziehungsweise laufende Wochenende.
        </p>
        <div className="seo-live-list">
          <a className="seo-live-row" href="/heute-in-gluecksburg">
            <strong>📍 Heute in Glücksburg</strong>
            <span>Alle Termine des heutigen Tages →</span>
          </a>
          <a className="seo-live-row" href="/wochenende-in-gluecksburg">
            <strong>📅 Dieses Wochenende</strong>
            <span>Freitag bis Sonntag auf einen Blick →</span>
          </a>
        </div>
      </section>

      <section className="seo-card">
        <h2>Aktuelle Termine für Glücksburg</h2>
        <p>
          Die Veranstaltungsübersicht bündelt öffentlich verfügbare Termine und verlinkt nach
          Möglichkeit direkt zur jeweiligen Originalquelle. So findest du schneller heraus, was
          heute, morgen oder am Wochenende in Glücksburg stattfindet. Da Veranstaltungen
          kurzfristig geändert oder abgesagt werden können, empfiehlt sich vor dem Besuch ein
          Blick auf die Veranstalterseite.
        </p>
      </section>
    </SeoLanding>
  );
}
