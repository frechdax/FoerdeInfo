import type { Metadata } from "next";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";
import { regions } from "@/lib/regions";

export const revalidate = 1800;
export const metadata: Metadata = {
  title: "Veranstaltungen an der Flensburger Förde",
  description: "Termine und Veranstaltungskalender für Flensburg, Wassersleben, Glücksburg und Langballig.",
  alternates: { canonical: "/veranstaltungen" },
};

export default async function EventsPage() {
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const supabase = createPublicServerSupabase();
  const { data } = await supabase.from("events").select("id,title,date,time,location,source_url").eq("status", "published").gte("date", current).order("date").limit(60);
  const upcoming = (data ?? []).filter((event) => /gl(?:ü|ue)cksburg|holnis|sandwig/i.test(event.location || "")).slice(0, 8);
  return (
    <main className="foerde-page"><div className="foerde-shell">
      <header className="foerde-header"><a href="/" className="foerde-brand">⚓ <strong>förde.info</strong></a><nav><a href="/">Start</a><a href="/live">Live</a><a href="/urlaub">Entdecken</a></nav></header>
      <section className="foerde-intro"><span className="foerde-kicker">Termine für die Region</span><h1>Veranstaltungen an der Förde</h1><p>Wähle deinen Ort. Für aktuelle Termine und Änderungen sind die verlinkten Kalender der Veranstalter maßgeblich.</p></section>
      <div className="foerde-actions">{regions.map((region) => <article key={region.id}><span>📍</span><h2>{region.name}</h2><p>{region.detail}</p><a href={region.eventsUrl} target="_blank" rel="noopener noreferrer">Veranstaltungskalender öffnen ↗</a></article>)}</div>
      {upcoming.length > 0 && <section className="seo-card"><h2>Gemeldete Termine in Glücksburg</h2><p>Diese Termine stammen aus dem bisher eingebundenen Glücksburger Kalender. Für die übrigen Orte nutze bitte die regionalen Originalkalender oben.</p><div className="seo-live-list">{upcoming.map((event) => <a className="seo-live-row" href={`/veranstaltungen/${event.id}`} key={event.id}><strong>{event.title}</strong><span>{new Intl.DateTimeFormat("de-DE").format(new Date(event.date + "T12:00:00"))}{event.time ? ` · ${String(event.time).slice(0, 5)} Uhr` : ""}{event.location ? ` · ${event.location}` : ""}</span></a>)}</div></section>}
      <footer className="foerde-footer"><span>Keine automatische Übernahme fremder Veranstaltungskalender.</span><a href="/gluecksburg#impressum">Impressum & Datenschutz</a></footer>
    </div></main>
  );
}
