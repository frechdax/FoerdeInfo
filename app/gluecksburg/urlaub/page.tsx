import type { Metadata } from "next";
import { stay22AccommodationUrl, stay22AffiliateEnabled } from "@/lib/stay22";
import SeoLanding from "../../seo-landing";

export const metadata: Metadata = {
  title: "Urlaub in Glücksburg – Unterkünfte, Restaurants & Veranstaltungen",
  description:
    "Urlaub in Glücksburg (Ostsee): Ferienwohnungen und Hotels finden, Restaurants entdecken, aktuelle Veranstaltungen ansehen und den Aufenthalt an der Flensburger Förde planen.",
  alternates: { canonical: "/gluecksburg/urlaub" },
  openGraph: {
    title: "Urlaub in Glücksburg",
    description:
      "Unterkünfte, Veranstaltungen und praktische Tipps für deinen Aufenthalt in Glücksburg an der Ostsee.",
    url: "/gluecksburg/urlaub",
  },
};

export default function UrlaubPage() {
  return (
    <SeoLanding
      eyebrow="Urlaub in Glücksburg"
      title="Glücksburg an der Ostsee entdecken"
      intro="Plane deinen Aufenthalt an der Flensburger Förde: Finde Unterkünfte, entdecke Restaurants, aktuelle Veranstaltungen und familienfreundliche Angebote in Glücksburg."
      bullets={[
        "Ferienwohnungen und Hotels in Glücksburg",
        "Restaurants und Gastronomie in Glücksburg",
        "Aktuelle Veranstaltungen während deines Aufenthalts",
        "Familienangebote und lokale Informationen",
        "Wetter und praktische Tipps für die Tagesplanung",
      ]}
      ctaLabel="Urlaubsbereich öffnen"
      ctaHref="/gluecksburg#urlaub"
      canonicalPath="/gluecksburg/urlaub"
    >
      <section className="seo-card">
        <h2>Ferienwohnungen & Hotels in Glücksburg</h2>
        <p>
          Für einen Kurzurlaub, ein Wochenende an der Förde oder längere Ferien findest du
          in Glücksburg Hotels, Apartments und Ferienwohnungen in unterschiedlichen Lagen.
        </p>
        <a
          className="button primary seo-cta"
          href={stay22AccommodationUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Unterkünfte ansehen ↗
        </a>
        <p className="travel-note">
          {stay22AffiliateEnabled
            ? "Affiliate-Link über Stay22. Bei einer Buchung kann förde.info eine Provision erhalten. Für dich entstehen dadurch keine zusätzlichen Kosten."
            : "Externer Link zu Booking.com. Derzeit kein Affiliate-Link."}
        </p>
      </section>

      <section className="seo-card">
        <h2>Restaurants in Glücksburg</h2>
        <p>
          Glücksburg bietet Gastronomie vom Strand bis zum Schloss. Zur aktuellen
          Auswahl gehören unter anderem mediterrane Strandküche, regionale Küche,
          italienische Restaurants und Restaurants mit Blick auf die Flensburger Förde.
        </p>
        <div className="seo-live-list">
          {[
            ["Glückselig Strandrestaurant", "Schwennaustraße 41", "https://www.glueck-in-sicht.de/restaurants/glueckselig-strandrestaurant"],
            ["Gudlak Restaurant & Bar", "Fördestraße 2–4", "https://www.glueck-in-sicht.de/restaurants"],
            ["Quellental Café & Restaurant", "Im Quellental 1", "https://www.quellental-gluecksburg.de/"],
            ["Ristorante San Remo", "Drei 5", "https://sanremo-gluecksburg.de/"],
            ["Restaurant Scheune", "Schinderdam 7", "https://www.scheunegluecksburg.de/"],
            ["Restaurant Felix", "Kirstenstraße 6", "https://www.strandhotelgluecksburg.de/restaurant-felix"],
            ["Schlosskeller Glücksburg", "Am Schloss 2", "https://www.schloss-gluecksburg.de/urlaub-genuss/ferienwohnungen-und-gastronomie"],
            ["Restaurant Pico", "Postplatz 3", "https://www.pico-restaurant.de/"],
          ].map(([name, address, href]) => (
            <a
              className="seo-live-row"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              key={name}
            >
              <strong>{name}</strong>
              <span>{address} · 24960 Glücksburg ↗</span>
            </a>
          ))}
        </div>
        <p className="travel-note">
          Auswahl nach der Glücksburger Gastrokarte 2026. Öffnungszeiten bitte direkt
          beim jeweiligen Restaurant prüfen.
        </p>
        <div className="restaurant-owner-note">
          <div>
            <strong>Dein Restaurant fehlt?</strong>
            <p>
              Du betreibst ein Restaurant, Café oder einen gastronomischen Betrieb in
              Glücksburg und bist noch nicht aufgeführt? Schreib mir gern, damit ich den
              Eintrag prüfen und ergänzen kann.
            </p>
            <p className="restaurant-owner-email">
              E-Mail:{" "}
              <a href="mailto:sebastianschwarz1@icloud.de">
                sebastianschwarz1@icloud.de
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="seo-card">
        <h2>Glücksburg entdecken</h2>
        <p>
          Für die Urlaubsplanung gibt es zusätzlich eigene Übersichten zu den wichtigsten
          Sehenswürdigkeiten und den Strandbereichen in Glücksburg.
        </p>
        <div className="seo-live-list">
          <a className="seo-live-row" href="/sehenswuerdigkeiten-gluecksburg">
            <strong>🏰 Sehenswürdigkeiten in Glücksburg</strong>
            <span>Schloss, Natur, Planetarium und weitere Highlights →</span>
          </a>
          <a className="seo-live-row" href="/straende-gluecksburg">
            <strong>🏖️ Strände in Glücksburg</strong>
            <span>Sandwig, Holnis und Quellental vergleichen →</span>
          </a>
        </div>
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
