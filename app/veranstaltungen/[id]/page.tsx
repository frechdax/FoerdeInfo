import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import SeoLanding from "../../seo-landing";
import EventStructuredData from "../../event-structured-data";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";

type PageProps = { params: Promise<{ id: string }> };

const getEvent = cache(async (id: string) => {
  const supabase = createPublicServerSupabase();
  const { data } = await supabase
    .from("events")
    .select("id,title,description,date,end_date,time,location,organizer,source_url,status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  return data;
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function descriptionFor(event: { title: string; description?: string | null; date: string }) {
  const fallback = `${event.title} am ${formatDate(event.date)} in Glücksburg: alle verfügbaren Informationen zu Termin, Ort und Veranstalter.`;
  const value = event.description?.trim() || fallback;
  return value.length > 155 ? `${value.slice(0, 152).trimEnd()}…` : value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return {};

  return {
    title: `${event.title} – ${formatDate(event.date)}`,
    description: descriptionFor(event),
    alternates: { canonical: `/veranstaltungen/${event.id}` },
    openGraph: {
      title: event.title,
      description: descriptionFor(event),
      url: `/veranstaltungen/${event.id}`,
      type: "article",
    },
  };
}

export const revalidate = 1800;

export default async function VeranstaltungDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const dateLabel = event.end_date && event.end_date !== event.date
    ? `${formatDate(event.date)} bis ${formatDate(event.end_date)}`
    : formatDate(event.date);

  return (
    <>
      <EventStructuredData event={event} />
      <SeoLanding
        eyebrow="Veranstaltung in Glücksburg"
        title={event.title}
        intro={event.description || `Alle verfügbaren Informationen zu ${event.title} in Glücksburg.`}
        bullets={[
          `Datum: ${dateLabel}`,
          event.time ? `Uhrzeit: ${String(event.time)}` : "Uhrzeit: siehe Veranstalter",
          event.location ? `Ort: ${event.location}` : "Ort: siehe Veranstalter",
          event.organizer ? `Veranstalter: ${event.organizer}` : "Aktuelle Angaben aus der Originalquelle",
        ]}
        ctaLabel="Alle Veranstaltungen ansehen"
        ctaHref="/veranstaltungen"
        canonicalPath={`/veranstaltungen/${event.id}`}
        compactOverview
      >
        <section className="seo-card">
          <h2>Termin auf einen Blick</h2>
          <p><strong>Datum:</strong> {dateLabel}</p>
          {event.time ? <p><strong>Uhrzeit:</strong> {String(event.time)}</p> : null}
          {event.location ? <p><strong>Ort:</strong> {event.location}</p> : null}
          {event.organizer ? <p><strong>Veranstalter:</strong> {event.organizer}</p> : null}
          <div className="seo-event-actions">
            <a
              className="seo-event-button seo-event-calendar-button"
              href={`/api/calendar/${event.id}`}
              download
            >
              📅 In den Kalender
            </a>
            {event.source_url ? (
              <a
                className="seo-event-button seo-event-source-button"
                href={event.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Originalquelle prüfen ↗
              </a>
            ) : null}
          </div>
        </section>

        <section className="seo-card">
          <h2>Hinweis zum Termin</h2>
          <p>
            Veranstaltungen können kurzfristig geändert oder abgesagt werden. Prüfe deshalb
            vor dem Besuch noch einmal die verlinkte Originalquelle des Veranstalters.
          </p>
        </section>
      </SeoLanding>
    </>
  );
}
