import type { Metadata } from "next";
import SeoLanding from "../seo-landing";

export const metadata: Metadata = {
  title: "Müllkalender Glücksburg – Abfuhrtermine der ASF",
  description:
    "Müllkalender für Glücksburg (Ostsee): Restmüll, Biomüll, Papier und Gelbe Tonne nach Straße anzeigen. Daten werden aus dem ASF-Abfallkalender aufbereitet.",
  alternates: { canonical: "/muellabfuhr" },
  openGraph: {
    title: "Müllkalender Glücksburg",
    description: "Abfuhrtermine für Glücksburg nach Straße schnell finden.",
    url: "/muellabfuhr",
  },
};

export default function MuellabfuhrPage() {
  return (
    <SeoLanding
      eyebrow="Müllkalender Glücksburg"
      title="Müllabfuhr in Glücksburg schnell nachschauen"
      intro="Wähle deine Straße und sieh die nächsten Abfuhrtermine für Restmüll, Biomüll, Papier und Gelbe Tonne übersichtlich an einem Ort."
      bullets={[
        "Abfuhrtermine nach Glücksburger Straße",
        "Restmüll, Biomüll, Papier und Gelbe Tonne",
        "Daten aus dem ASF-Abfallkalender",
        "Optimiert für Handy und Desktop",
      ]}
      ctaLabel="Müllkalender öffnen"
      ctaHref="/#street"
      canonicalPath="/muellabfuhr"
    >
      <section className="seo-card">
        <h2>Wann wird in Glücksburg der Müll abgeholt?</h2>
        <p>
          GlücksburgDirekt bereitet die Abfuhrtermine der Abfallwirtschaft Schleswig-Flensburg (ASF)
          für Glücksburg kompakt auf. Für verbindliche oder kurzfristig geänderte Termine bleibt
          der offizielle ASF-Abfallkalender maßgeblich.
        </p>
      </section>
    </SeoLanding>
  );
}
