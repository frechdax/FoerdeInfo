import type { Metadata } from "next";
import SeoLanding from "../seo-landing";

export const metadata: Metadata = {
  title: "Freizeit in Glücksburg – Ausflüge, Familie & Schietwetter",
  description:
    "Freizeit in Glücksburg: Strände, Fördeland-Therme, Klimapark, Waldspielplatz und Ausflugsideen für Familien, Sonne und Schietwetter.",
  alternates: { canonical: "/freizeit-gluecksburg" },
  openGraph: {
    title: "Freizeit in Glücksburg",
    description:
      "Ausflugsziele und Freizeitideen in Glücksburg für Familien, sonnige Tage und Schietwetter.",
    url: "/freizeit-gluecksburg",
  },
};

const ideas = [
  {
    icon: "🏖️",
    name: "Strände und Strandspielplätze",
    fit: "Sonne · Familien · kostenlos",
    text: "Sandwig, Holnis und Schwennau verbinden Strandtage mit Spielmöglichkeiten und Blick auf die Flensburger Förde.",
    href: "https://www.gluecksburg-urlaub.de/entdecken/straende",
  },
  {
    icon: "🌳",
    name: "Waldspielplatz Friedeholz",
    fit: "Draußen · Kinder · kostenlos",
    text: "Ein schattiger Waldspielplatz mit Holzspielgeräten und viel Platz für einen Familienausflug ins Grüne.",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
  },
  {
    icon: "🌍",
    name: "Klimapark artefact",
    fit: "Entdecken · Lernen · Familie",
    text: "Mitmach-Stationen und Themenrouten machen Klima, Energie und Zukunft spielerisch erlebbar.",
    href: "https://www.gluecksburg-urlaub.de/aktivitaeten/naturerlebnisse",
  },
  {
    icon: "🏊",
    name: "Fördeland-Therme",
    fit: "Schietwetter · Schwimmen · Familie",
    text: "Kinderbecken, Rutschen und Außenbereich machen die Therme zu einer wetterunabhängigen Freizeitidee.",
    href: "https://www.gluecksburg-urlaub.de/aktiv-erleben/schwimmbaeder-wellness",
  },
  {
    icon: "⛳",
    name: "Adventure Fjordgolf Holnis",
    fit: "Spiel · Strandnähe · Familie",
    text: "Minigolf an der Strandpromenade mit Bahnen rund um Glücksburg und die Flensburger Förde.",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
  },
  {
    icon: "🏄",
    name: "Wassersport an der Förde",
    fit: "Aktiv · Wasser · draußen",
    text: "Segeln, Surfen, Kiten und Stand-up-Paddling gehören zu den beliebtesten Aktivitäten an Innen- und Außenförde.",
    href: "https://www.gluecksburg-urlaub.de/aktiv-erleben/wassersport",
  },
] as const;

export default function FreizeitGluecksburgPage() {
  return (
    <SeoLanding
      eyebrow="Freizeit in Glücksburg"
      title="Freizeitideen für Glücksburg"
      intro="Was kann man in Glücksburg unternehmen? Hier findest du Ideen für Familien, sonnige Tage, Schietwetter und aktive Stunden an der Flensburger Förde."
      bullets={[
        "Ausflugsziele direkt in Glücksburg",
        "Ideen für Familien mit Kindern",
        "Aktivitäten bei Sonne und Schietwetter",
        "Strand, Natur, Schwimmen und Wassersport",
      ]}
      ctaLabel="Aktuelle Veranstaltungen ansehen"
      ctaHref="/veranstaltungen"
      canonicalPath="/freizeit-gluecksburg"
    >
      <section className="seo-card">
        <h2>Was kann man in Glücksburg unternehmen?</h2>
        <div className="seo-live-list">
          {ideas.map((idea) => (
            <article className="seo-live-row" key={idea.name}>
              <div>
                <strong>{idea.icon} {idea.name}</strong>
                <span><b>{idea.fit}</b> · {idea.text}</span>
              </div>
              <a href={idea.href} target="_blank" rel="noreferrer">Infos ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-card">
        <h2>Freizeit mit Kindern in Glücksburg</h2>
        <p>
          Für Familien eignen sich besonders die flacheren Strandbereiche auf Holnis, der
          Waldspielplatz im Friedeholz, der Klimapark und die Fördeland-Therme. Welche Termine
          heute stattfinden, findest du im laufend aktualisierten Veranstaltungskalender.
        </p>
        <div className="seo-live-list">
          <a className="seo-live-row" href="/familie">
            <strong>👪 Angebote für Familien</strong>
            <span>Anlaufstellen und Familieninformationen →</span>
          </a>
          <a className="seo-live-row" href="/heute-in-gluecksburg">
            <strong>📍 Heute in Glücksburg</strong>
            <span>Aktuelle Termine für den heutigen Tag →</span>
          </a>
          <a className="seo-live-row" href="/wochenende-in-gluecksburg">
            <strong>📅 Dieses Wochenende</strong>
            <span>Veranstaltungen von Freitag bis Sonntag →</span>
          </a>
        </div>
      </section>

      <section className="seo-card">
        <h2>Noch mehr entdecken</h2>
        <p>
          Kombiniere deine Freizeitplanung mit einem Besuch der wichtigsten Sehenswürdigkeiten
          oder vergleiche die unterschiedlichen Strandbereiche in Glücksburg.
        </p>
        <div className="seo-live-list">
          <a className="seo-live-row" href="/sehenswuerdigkeiten-gluecksburg">
            <strong>🏰 Sehenswürdigkeiten</strong>
            <span>Schloss, Holnis, Planetarium und weitere Highlights →</span>
          </a>
          <a className="seo-live-row" href="/straende-gluecksburg">
            <strong>🌊 Strände in Glücksburg</strong>
            <span>Sandwig, Holnis und Quellental im Überblick →</span>
          </a>
        </div>
      </section>
    </SeoLanding>
  );
}
