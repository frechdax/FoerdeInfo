import type { Metadata } from "next";
import SeoLanding from "../seo-landing";

export const metadata: Metadata = {
  title: "Urlaub in Glücksburg – Ferienwohnungen, Hotels & Veranstaltungen",
  description:
    "Urlaub in Glücksburg (Ostsee): Ferienwohnungen und Hotels finden, aktuelle Veranstaltungen entdecken und den Aufenthalt an der Flensburger Förde planen.",
  alternates: { canonical: "/urlaub" },
  openGraph: {
    title: "Urlaub in Glücksburg",
    description:
      "Unterkünfte, Veranstaltungen und praktische Tipps für deinen Aufenthalt in Glücksburg an der Ostsee.",
    url: "/urlaub",
  },
};

export default function UrlaubPage() {
  return (
    <SeoLanding
      eyebrow="Urlaub in Glücksburg"
      title="Glücksburg an der Ostsee entdecken"
      intro="Plane deinen Aufenthalt an der Flensburger Förde: Finde Unterkünfte und entdecke aktuelle Veranstaltungen und familienfreundliche Angebote in Glücksburg."
      bullets={[
        "Ferienwohnungen und Hotels in Glücksburg",
        "Aktuelle Veranstaltungen während deines Aufenthalts",
        "Familienangebote und lokale Informationen",
        "Wetter und praktische Tipps für die Tagesplanung",
      ]}
      ctaLabel="Urlaubsbereich öffnen"
      ctaHref="/#urlaub"
      canonicalPath="/urlaub"
    >
      <section className="seo-card">
        <h2>Ferienwohnungen & Hotels in Glücksburg</h2>
        <p>
          Für einen Kurzurlaub, ein Wochenende an der Förde oder längere Ferien findest du
          in Glücksburg Hotels, Apartments und Ferienwohnungen in unterschiedlichen Lagen.
        </p>
        <a
          className="button primary seo-cta"
          href="https://www.booking.com/city/de/glucksburg.de.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Unterkünfte bei Booking.com ansehen ↗
        </a>
        <p className="travel-note">
          Externer Link zu Booking.com. Derzeit kein Affiliate-Link.
        </p>
      </section>

      <section className="seo-card">
        <h2>Was ist während des Urlaubs in Glücksburg los?</h2>
        <p>
          Im Veranstaltungskalender findest du aktuelle Termine in Glücksburg – von Kultur
          und Konzerten bis zu Angeboten für Familien. So kannst du deinen Aufenthalt passend
          zum jeweiligen Reisetag planen.
        </p>
        <a className="text-button" href="/veranstaltungen">
          Veranstaltungen in Glücksburg ansehen →
        </a>
      </section>
    </SeoLanding>
  );
}
