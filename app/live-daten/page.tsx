import type { Metadata } from "next";
import LiveDataDashboard from "./LiveDataDashboard";
import styles from "./live-data.module.css";

export const metadata: Metadata = {
  title: "Live-Daten-Labor – förde.info",
  description:
    "Ortsbezogene Live-Daten für Flensburg, Wassersleben, Glücksburg und Langballig: Parken, Besucher, Ladeinfrastruktur, Verkehr, ÖPNV und Sharing.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LiveDataPage() {
  return (
    <main className="foerde-page">
      <div className="foerde-shell">
        <header className="foerde-header">
          <a href="/" className="foerde-brand" aria-label="förde.info Startseite">
            ⚓ <strong>förde.info</strong>
          </a>
          <nav aria-label="Navigation">
            <a href="/">Start</a>
            <a href="/live">Live</a>
            <a href="/wege">Wegecheck</a>
            <a href="/veranstaltungen">Veranstaltungen</a>
          </nav>
        </header>

        <section className="foerde-intro">
          <span className="foerde-kicker">Live-Daten-Labor · ortsbezogen</span>
          <h1>Was passiert gerade vor Ort?</h1>
          <p>
            Wähle einen Ort an der Förde. förde.info fragt die verfügbaren öffentlichen
            Datenquellen live ab und zeigt nur Werte, die sich für diesen Ort tatsächlich
            ermitteln lassen.
          </p>
        </section>

        <LiveDataDashboard />\n\n        {/* Production: ODI SensorThings + regional live-data aggregation */}

        <section className={styles.nextStep}>
          <span className="foerde-kicker">Später für die Startseite</span>
          <h2>Die brauchbaren Module werden dynamisch übernommen</h2>
          <p>
            Sobald sich eine Quelle im Alltag als stabil erweist, können wir ihren Live-Wert
            kompakt in die Startseite übernehmen. Fehlende oder nicht öffentliche Daten werden
            nicht geschätzt.
          </p>
        </section>

        <footer className="foerde-footer">
          <span>förde.info · Live-Daten-Labor</span>
          <nav aria-label="Weitere Seiten">
            <a href="/">Startseite</a>
            <a href="/gluecksburg#impressum">Impressum & Datenschutz</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
