import type { Metadata } from "next";
import SeoLanding from "../seo-landing";

export const metadata: Metadata = {
  title: "Sehenswürdigkeiten in Glücksburg – Highlights & Ausflugsziele",
  description:
    "Sehenswürdigkeiten in Glücksburg entdecken: Schloss, Holnis, Klimapark, Waldmuseum, Planetarium und weitere Highlights an der Flensburger Förde.",
  alternates: { canonical: "/sehenswuerdigkeiten-gluecksburg" },
  openGraph: {
    title: "Sehenswürdigkeiten in Glücksburg",
    description: "Die wichtigsten Highlights und Ausflugsziele in Glücksburg kompakt erklärt.",
    url: "/sehenswuerdigkeiten-gluecksburg",
  },
};

const sights = [
  {
    icon: "🏰",
    name: "Schloss Glücksburg",
    text: "Das historische Wasserschloss ist das bekannteste Wahrzeichen der Stadt. Schloss, Schlossteich und Schlosspark lassen sich gut miteinander verbinden.",
    href: "https://www.schloss-gluecksburg.de/",
  },
  {
    icon: "🌊",
    name: "Halbinsel Holnis",
    text: "Natur, Strand und weite Fördeblicke: Holnis verbindet Naturschutzgebiet, Wanderwege und Küstenerlebnis auf einer Halbinsel.",
    href: "https://www.gluecksburg-urlaub.de/entdecken/halbinsel-holnis",
  },
  {
    icon: "🌹",
    name: "Rosarium & Schlosspark",
    text: "Direkt am Schloss liegen der Schlosspark, die Orangerie und das Rosarium – besonders in der Rosenblüte ein schöner Spaziergang.",
    href: "https://www.schloss-gluecksburg.de/",
  },
  {
    icon: "🌍",
    name: "Klimapark artefact",
    text: "Ein Mitmach- und Erlebnisort rund um Energie, Klima und Zukunft. Besonders interessant für Familien und neugierige Entdecker.",
    href: "https://www.gluecksburg-urlaub.de/aktivitaeten/naturerlebnisse",
  },
  {
    icon: "🌳",
    name: "Waldmuseum & Friedeholz",
    text: "Das Friedeholz verbindet Waldmuseum, Natur, Spazierwege, Wildschweingehege und familienfreundliche Ziele im Grünen.",
    href: "https://www.gluecksburg-urlaub.de/aktivitaeten/naturerlebnisse",
  },
  {
    icon: "🪐",
    name: "Menke-Planetarium",
    text: "Das Planetarium der Hochschule Flensburg zeigt regelmäßig Programme über Astronomie und den Sternenhimmel – darunter auch Angebote für Kinder.",
    href: "https://www.planetarium-gluecksburg.de/",
  },
] as const;

export default function SehenswuerdigkeitenGluecksburgPage() {
  return (
    <SeoLanding
      eyebrow="Glücksburg entdecken"
      title="Sehenswürdigkeiten in Glücksburg"
      intro="Vom Wasserschloss bis zur Halbinsel Holnis: Diese Orte gehören zu den bekanntesten und abwechslungsreichsten Zielen in Glücksburg."
      bullets={[
        "Kultur und Geschichte",
        "Natur und Fördeblicke",
        "Familienfreundliche Ausflugsziele",
        "Direkte Links zu offiziellen Informationen",
      ]}
      ctaLabel="Freizeitbereich öffnen"
      ctaHref="/#urlaub"
      canonicalPath="/sehenswuerdigkeiten-gluecksburg"
    >
      <section className="seo-card">
        <h2>Highlights auf einen Blick</h2>
        <div className="seo-live-list">
          {sights.map((item) => (
            <article className="seo-live-row" key={item.name}>
              <div>
                <strong>{item.icon} {item.name}</strong>
                <span>{item.text}</span>
              </div>
              <a href={item.href} target="_blank" rel="noreferrer">Mehr erfahren ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-card">
        <h2>Glücksburg an einem Tag</h2>
        <p>
          Für einen ersten Besuch lassen sich Kultur, Natur und Küste gut kombinieren. Plane
          zusätzlich Zeit für einen Strandspaziergang oder einen aktuellen Termin aus dem
          Veranstaltungskalender ein.
        </p>
        <a className="button" href="/straende-gluecksburg">Strände entdecken →</a>
      </section>
    </SeoLanding>
  );
}
