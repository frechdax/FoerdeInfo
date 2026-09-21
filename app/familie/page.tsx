import type { Metadata } from "next";
import SeoLanding from "../seo-landing";

export const metadata: Metadata = {
  title: "Familie in Glücksburg – Angebote, Jugendtreff & Sozialpass",
  description:
    "Familienangebote in Glücksburg: Jugendtreff, Gesundheit, Menschen mit Behinderung, Disco-Taxi und Sozialpass kompakt zusammengefasst.",
  alternates: { canonical: "/familie" },
  openGraph: {
    title: "Familie in Glücksburg",
    description: "Wichtige Angebote und Anlaufstellen für Familien in Glücksburg.",
    url: "/familie",
  },
};

export default function FamiliePage() {
  return (
    <SeoLanding
      eyebrow="Familie Glücksburg"
      title="Angebote für Familien in Glücksburg"
      intro="Wichtige Anlaufstellen und Angebote für Kinder, Jugendliche und Familien kompakt an einem Ort."
      bullets={[
        "Jugendtreff Glücksburg",
        "Angebote für Menschen mit Behinderung",
        "Gesundheit und wichtige Anlaufstellen",
        "Disco-Taxi und Sozialpass",
      ]}
      ctaLabel="Familienangebote öffnen"
      ctaHref="/#family"
    >
      <section className="seo-card">
        <h2>Familieninformationen kompakt gebündelt</h2>
        <p>
          GlücksburgDirekt fasst öffentlich zugängliche Informationen zu sozialen und familiären
          Angeboten in Glücksburg zusammen. Für Anträge, Anspruchsvoraussetzungen und verbindliche
          Auskünfte gelten die Angaben der jeweils zuständigen Stelle.
        </p>
      </section>
    </SeoLanding>
  );
}
