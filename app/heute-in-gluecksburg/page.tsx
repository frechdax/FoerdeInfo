import type { Metadata } from "next";
import SeoLanding from "../seo-landing";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";

export const metadata: Metadata = {
  title: "Heute in Glücksburg – Veranstaltungen & Tipps",
  description:
    "Was ist heute in Glücksburg los? Aktuelle Veranstaltungen und Termine für heute auf einen Blick.",
  alternates: { canonical: "/heute-in-gluecksburg" },
  openGraph: {
    title: "Heute in Glücksburg",
    description: "Aktuelle Veranstaltungen und Termine für heute in Glücksburg entdecken.",
    url: "/heute-in-gluecksburg",
  },
};

export const revalidate = 900;

function todayBerlin() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value + "T12:00:00+02:00"));
}

export default async function HeuteInGluecksburgPage() {
  const date = todayBerlin();
  const supabase = createPublicServerSupabase();
  const { data } = await supabase
    .from("events")
    .select("id,title,date,time,location,source_url,summary")
    .eq("status", "published")
    .eq("date", date)
    .order("time")
    .limit(40);

  const events = data ?? [];

  return (
    <SeoLanding
      eyebrow={longDate(date)}
      title="Heute in Glücksburg"
      intro="Was ist heute in Glücksburg los? Hier findest du die aktuellen Veranstaltungen und Termine des Tages kompakt an einem Ort."
      bullets={[
        "Aktuelle Termine für heute",
        "Lokale Veranstaltungen und Freizeitangebote",
        "Ort und Uhrzeit auf einen Blick",
        "Direkter Link zur jeweiligen Originalquelle",
      ]}
      ctaLabel="Alle Veranstaltungen öffnen"
      ctaHref="/#events"
      canonicalPath="/heute-in-gluecksburg"
      compactOverview
    >
      <section className="seo-card">
        <h2>{events.length ? `${events.length} Termine heute` : "Heute keine Termine gefunden"}</h2>
        {events.length ? (
          <div className="seo-live-list">
            {events.map((event) => (
              <article key={event.id} className="seo-live-row">
                <div>
                  <strong>{event.title}</strong>
                  <span>
                    {event.time ? `${String(event.time).slice(0, 5)} Uhr` : "Uhrzeit siehe Veranstalter"}
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
            Für heute sind derzeit keine veröffentlichten Termine in der Datenbank vorhanden.
            Schau auch in die Wochenendübersicht oder in den vollständigen Veranstaltungskalender.
          </p>
        )}
      </section>

      <section className="seo-card">
        <h2>Weitere Planung</h2>
        <p>
          Du planst schon die nächsten Tage? In der Wochenendübersicht findest du die Termine von
          Freitag bis Sonntag gebündelt.
        </p>
        <a className="button" href="/wochenende-in-gluecksburg">Dieses Wochenende ansehen →</a>
      </section>
    </SeoLanding>
  );
}
