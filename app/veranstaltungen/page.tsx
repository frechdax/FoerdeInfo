import type { Metadata } from "next";
import SeoLanding from "../seo-landing";

export const metadata: Metadata = {
  title: "Veranstaltungen Glücksburg – Was ist los in Glücksburg?",
  description:
    "Aktuelle Veranstaltungen in Glücksburg (Ostsee): Termine, Familienangebote und lokale Events mit Datum, Ort und Kalender-Download.",
  alternates: { canonical: "/veranstaltungen" },
  openGraph: {
    title: "Veranstaltungen in Glücksburg",
    description: "Was ist los in Glücksburg? Aktuelle Termine und Veranstaltungen entdecken.",
    url: "/veranstaltungen",
  },
};

export default function VeranstaltungenPage() {
  return (
    <SeoLanding
      eyebrow="Was ist los in Glücksburg?"
      title="Veranstaltungen in Glücksburg"
      intro="Entdecke aktuelle Termine in Glücksburg – von Familienangeboten über Kultur bis zu lokalen Veranstaltungen und Aktionen."
      bullets={[
        "Aktuelle Veranstaltungen und Termine",
        "Familienfreundliche Angebote",
        "Ort und Uhrzeit auf einen Blick",
        "Termine direkt als iCalendar-Datei speichern",
      ]}
      ctaLabel="Veranstaltungen anzeigen"
      ctaHref="/#events"
      canonicalPath="/veranstaltungen"
    >
      <section className="seo-card">
        <h2>Aktuelle Termine für Glücksburg</h2>
        <p>
          Die Veranstaltungsübersicht bündelt öffentlich verfügbare Termine und verlinkt nach
          Möglichkeit direkt zur jeweiligen Originalquelle. Da Veranstaltungen kurzfristig
          geändert oder abgesagt werden können, empfiehlt sich vor dem Besuch ein Blick auf die
          Veranstalterseite.
        </p>
      </section>
    </SeoLanding>
  );
}
