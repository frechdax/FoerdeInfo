import type { Metadata } from "next";
import { regions } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Flensburg und die Förde entdecken – Urlaub und Freizeit",
  description: "Ausflüge und Freizeit in Flensburg, Wassersleben, Glücksburg und Langballig planen.",
  alternates: { canonical: "/urlaub" },
};

export default function UrlaubPage() {
  return <main className="foerde-page"><div className="foerde-shell">
    <header className="foerde-header"><a href="/" className="foerde-brand">⚓ <strong>förde.info</strong></a><nav><a href="/">Start</a><a href="/live">Live</a><a href="/veranstaltungen">Veranstaltungen</a></nav></header>
    <section className="foerde-intro"><span className="foerde-kicker">Freizeit & Urlaub</span><h1>Die Flensburger Förde entdecken</h1><p>Von der Flensburger Innenstadt über Wassersleben und Glücksburg bis nach Langballigau. Wähle einen Ort für Strand, Termine und praktische Informationen.</p></section>
    <div className="foerde-actions">{regions.map((region) => <article key={region.id}><span>🧭</span><h2>{region.name}</h2><p>{region.detail}</p><a href={`/orte/${region.id}`}>{region.name} entdecken →</a></article>)}</div>
    <section className="seo-card"><h2>Weitere Ausflugsideen</h2><p>Die Tourismus Agentur Flensburger Förde bündelt Ausflüge, Unterkünfte und Freizeitangebote der Region. Öffnungszeiten und Buchungen direkt dort prüfen.</p><a className="button primary" href="https://www.flensburger-foerde.de/" target="_blank" rel="noopener noreferrer">Offizielle Tourismusseite öffnen ↗</a></section>
    <footer className="foerde-footer"><span>Privates Informationsangebot.</span><a href="/gluecksburg#impressum">Impressum & Datenschutz</a></footer>
  </div></main>;
}
