import type { Metadata } from "next";
import SeoLanding from "../seo-landing";

export const metadata: Metadata = {
  title: "Strände in Glücksburg – Sandwig, Holnis & Quellental",
  description:
    "Die Strände in Glücksburg im Überblick: Kurstrand Sandwig, Strand Drei/Holnis und Naturstrand Quellental mit Tipps für Familien und Ausflüge.",
  alternates: { canonical: "/straende-gluecksburg" },
  openGraph: {
    title: "Strände in Glücksburg",
    description: "Sandwig, Drei/Holnis und Quellental im direkten Vergleich.",
    url: "/straende-gluecksburg",
  },
};

const beaches = [
  {
    icon: "🏖️",
    name: "Kurstrand Sandwig",
    fit: "Promenade, Familien & zentraler Strandtag",
    text: "Feinsandiger Strand an der Innenförde mit Promenade, Seebrücke, Strandspielplatz sowie Möglichkeiten für Kajak und Stand-up-Paddling.",
    href: "https://www.gluecksburg-urlaub.de/entdecken/straende",
  },
  {
    icon: "🌊",
    name: "Strand Drei / Holnis",
    fit: "Familien, Natur & Wassersport",
    text: "Der Strand an der Außenförde fällt besonders flach ab und ist deshalb bei Familien beliebt. Direkt daneben liegen Natur- und Wassersportangebote.",
    href: "https://www.gluecksburg-urlaub.de/entdecken/halbinsel-holnis",
  },
  {
    icon: "⛵",
    name: "Naturstrand Quellental",
    fit: "Ruhe, Segeln & naturnahe Atmosphäre",
    text: "Ein ruhigerer, naturbelassener Strandbereich zwischen Westerwerker See und Ostsee in der Nähe des Glücksburger Yachthafens.",
    href: "https://www.gluecksburg-urlaub.de/entdecken/straende",
  },
] as const;

export default function StraendeGluecksburgPage() {
  return (
    <SeoLanding
      eyebrow="Ostsee & Flensburger Förde"
      title="Strände in Glücksburg"
      intro="Glücksburg bietet mehrere unterschiedliche Strandbereiche – vom zentralen Kurstrand bis zum naturnahen Strand auf Holnis."
      bullets={[
        "Sandwig für Promenade und zentralen Strandtag",
        "Drei/Holnis für Familien und Wassersport",
        "Quellental für eine ruhigere, naturnahe Atmosphäre",
        "Offizielle Informationen direkt verlinkt",
      ]}
      ctaLabel="Freizeitbereich öffnen"
      ctaHref="/#urlaub"
      canonicalPath="/straende-gluecksburg"
    >
      <section className="seo-card">
        <h2>Welcher Strand passt zu dir?</h2>
        <div className="seo-live-list">
          {beaches.map((beach) => (
            <article className="seo-live-row" key={beach.name}>
              <div>
                <strong>{beach.icon} {beach.name}</strong>
                <span><b>{beach.fit}</b> · {beach.text}</span>
              </div>
              <a href={beach.href} target="_blank" rel="noreferrer">Infos ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-card">
        <h2>Gut zu wissen</h2>
        <p>
          An den Glücksburger Ostseestränden gibt es saisonale Unterschiede bei Bewachung,
          Strandservice und Gebühren. Prüfe deshalb vor deinem Besuch die aktuellen Angaben der
          Tourist-Information.
        </p>
        <a className="button" href="/sehenswuerdigkeiten-gluecksburg">Weitere Highlights →</a>
      </section>
    </SeoLanding>
  );
}
