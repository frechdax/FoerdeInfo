import type { Metadata } from "next";
import SeoLanding from "../seo-landing";

export const metadata: Metadata = {
  title: "Rathaus Glücksburg – News & amtliche Bekanntmachungen",
  description:
    "Rathausinformationen für Glücksburg (Ostsee): aktuelle Meldungen, Bürgerbüro und amtliche Bekanntmachungen mit Links zu den Originalquellen.",
  alternates: { canonical: "/rathaus" },
  openGraph: {
    title: "Rathaus Glücksburg – aktuelle Informationen",
    description: "Rathaus-News und amtliche Bekanntmachungen aus Glücksburg kompakt gebündelt.",
    url: "/rathaus",
  },
};

export default function RathausPage() {
  return (
    <SeoLanding
      eyebrow="Rathaus Glücksburg"
      title="Rathausinformationen für Glücksburg"
      intro="Aktuelle Rathausmeldungen, Informationen zum Bürgerbüro und amtliche Bekanntmachungen übersichtlich zusammengefasst."
      bullets={[
        "Aktuelles aus dem Rathaus",
        "Amtliche Bekanntmachungen",
        "Bürgerbüro und Öffnungszeiten",
        "Direkte Links zu den offiziellen Originalquellen",
      ]}
      ctaLabel="Rathausbereich öffnen"
      ctaHref="/#rathaus"
      canonicalPath="/rathaus"
    >
      <section className="seo-card">
        <h2>Privater Überblick mit offiziellen Quellen</h2>
        <p>
          GlücksburgDirekt ist nicht die offizielle Website der Stadt. Die Inhalte dienen der
          Orientierung und führen für verbindliche Informationen direkt zu den Veröffentlichungen
          der Stadt Glücksburg (Ostsee).
        </p>
      </section>
    </SeoLanding>
  );
}
