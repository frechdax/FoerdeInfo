import type { Metadata } from "next";
import styles from "./partner.module.css";

export const metadata: Metadata = {
  title: {
    absolute: "Partner werden – lokale Sichtbarkeit in Flensburg & an der Förde | FlensburgDirekt",
  },
  description:
    "Lokaler Betrieb in Flensburg, Wassersleben oder Glücksburg? Erfahre, wie du mit FlensburgDirekt Gäste und Einwohner passend zu Wetter, Freizeit und Veranstaltungen erreichen kannst.",
  alternates: { canonical: "/partner" },
};

const contactHref =
  "mailto:sebastianschwarz1@icloud.de?subject=Partnerschaft%20mit%20FlensburgDirekt";

export default function PartnerPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <a className={styles.brand} href="/">
            <span className={styles.brandMark} aria-hidden="true">⚓</span>
            <span>Flensburg<strong>DIREKT</strong></span>
          </a>
          <a className={styles.back} href="/">← Zur Startseite</a>
        </header>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>Für lokale Anbieter</span>
          <h1>Mit FlensburgDirekt die richtigen Gäste erreichen</h1>
          <p>
            FlensburgDirekt verbindet aktuelle Informationen zu Wetter, Strand, Veranstaltungen
            und Freizeit mit passenden lokalen Angeboten. Kooperationen sollen Nutzern helfen,
            genau dann ein passendes Angebot zu finden, wenn es für ihren Aufenthalt relevant ist.
          </p>
          <a className={styles.primaryButton} href={contactHref}>
            Kooperation anfragen →
          </a>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <span aria-hidden="true">🌤️</span>
            <h2>Situativ sichtbar</h2>
            <p>
              Ein Outdoor-Angebot kann bei guten Bedingungen erscheinen, ein Indoor-Angebot bei
              Regen und Gastronomie passend zu Tageszeit oder Veranstaltung.
            </p>
          </article>
          <article className={styles.card}>
            <span aria-hidden="true">📍</span>
            <h2>Lokal statt Streuverlust</h2>
            <p>
              Die Zielgruppe sucht bereits nach Flensburg, Wassersleben, Glücksburg, Förde,
              Freizeit, Veranstaltungen oder aktuellen Bedingungen vor Ort.
            </p>
          </article>
          <article className={styles.card}>
            <span aria-hidden="true">↗️</span>
            <h2>Direkte Weiterleitung</h2>
            <p>
              Interessenten können direkt zur Buchung, Reservierung, Angebotsseite oder
              Kontaktmöglichkeit des Betriebs weitergeleitet werden.
            </p>
          </article>
        </section>

        <section className={styles.section}>
          <span className={styles.kicker}>Mögliche Kooperationen</span>
          <h2>Welche Betriebe passen?</h2>
          <div className={styles.pills}>
            <span>🏨 Unterkünfte</span>
            <span>🍽️ Restaurants & Cafés</span>
            <span>🏄 SUP & Wassersport</span>
            <span>🚤 Boots- & Schifffahrten</span>
            <span>🧖 Wellness & Therme</span>
            <span>🎟️ Freizeit & Erlebnisse</span>
            <span>🚲 Fahrradverleih</span>
            <span>👨‍👩‍👧 Familienangebote</span>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.kicker}>Transparenz</span>
          <h2>Redaktion und Partnerschaft bleiben getrennt</h2>
          <p className={styles.copy}>
            Bestehende redaktionelle Einträge und öffentliche Informationen werden nicht von einer
            Partnerschaft abhängig gemacht. Vergütete Platzierungen oder Affiliate-Links werden für
            Nutzer entsprechend gekennzeichnet. Konkrete Kooperationsmodelle werden individuell
            vereinbart.
          </p>
          <a className={styles.secondaryButton} href={contactHref}>
            Partneranfrage per E-Mail senden
          </a>
        </section>
      </div>
    </main>
  );
}
