import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { regions, getRegion } from "@/lib/regions";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return regions.map((region) => ({ slug: region.id })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const region = getRegion((await params).slug);
  if (!region) return {};
  return { title: `${region.name} an der Flensburger Förde – Wetter, Strand und Termine`, description: `${region.name}: lokale Wetterdaten, Badestellen und Veranstaltungen an der Flensburger Förde.`, alternates: { canonical: `/orte/${region.id}` } };
}

export default async function OrtPage({ params }: Props) {
  const region = getRegion((await params).slug);
  if (!region) notFound();
  const municipality = region.id === "wassersleben" ? "Gemeinde Harrislee" : region.id === "langballig" ? "Gemeinde Langballig" : region.name;
  return (
    <main className="foerde-page foerde-place-page"><div className="foerde-shell">
      <header className="foerde-header"><a href="/" className="foerde-brand">⚓ <strong>förde.info</strong></a><nav aria-label="Navigation"><a href="/">Alle Orte</a><a href="/veranstaltungen">Veranstaltungen</a><a href="/urlaub">Entdecken</a></nav></header>
      <section className="foerde-intro"><span className="foerde-kicker">Flensburger Förde · {municipality}</span><h1>{region.name}</h1><p>{region.detail}. Wetter und Badestellen für diesen Ort findest du in der regionalen Live-Übersicht.</p><a className="button primary" href={`/#${region.id}`}>Wetter und Badestellen ansehen →</a></section>
      <div className="foerde-actions">
        <article><span>🏖️</span><h2>Strand & Freizeit</h2><p>{region.id === "flensburg" ? "Ostseebad und Solitüde gehören zu Flensburg." : region.id === "wassersleben" ? "Wassersleben liegt in der Gemeinde Harrislee." : region.id === "langballig" ? "Langballigau bietet Strand und Hafen." : "Sandwig und Holnis sind Glücksburger Badestellen."}</p><a href={`/#${region.id}`}>Amtliche Einstufungen ansehen →</a></article>
        <article><span>📅</span><h2>Veranstaltungen</h2><p>Aktuelle Termine und Änderungen direkt beim Veranstalter prüfen.</p><a href={region.eventsUrl} target="_blank" rel="noopener noreferrer">Regionalen Kalender öffnen ↗</a></article>
        <article><span>🧭</span><h2>Freizeit & Urlaub</h2><p>Weitere Orte und Ausflüge rund um die Flensburger Förde entdecken.</p><a href="/urlaub">Region entdecken →</a></article>
      </div>
      {region.id === "gluecksburg" && <section className="seo-card"><h2>Mehr über Glücksburg</h2><p>Live-Informationen, Gastronomie und Freizeitideen für Glücksburg findest du in der ausführlichen Ortsansicht.</p><a className="button primary" href="/gluecksburg">Glücksburg öffnen →</a></section>}
      <nav className="foerde-place-links" aria-label="Weitere Orte">{regions.filter((item) => item.id !== region.id).map((item) => <a key={item.id} href={`/orte/${item.id}`}>{item.name} →</a>)}</nav>
      <footer className="foerde-footer"><span>Privates Informationsangebot · Angaben der Originalquellen sind maßgeblich.</span><a href="/gluecksburg#impressum">Impressum & Datenschutz</a></footer>
    </div></main>
  );
}
