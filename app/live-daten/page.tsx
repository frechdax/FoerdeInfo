import type { Metadata } from "next";
import styles from "./live-data.module.css";

export const metadata: Metadata = {
  title: "Live-Daten-Labor – förde.info",
  description:
    "Pilotseite für mögliche Echtzeitdaten an der Flensburger Förde: Parkplätze, Besucheraufkommen, E-Ladesäulen, Verkehr, ÖPNV und Sharing.",
  robots: {
    index: false,
    follow: false,
  },
};

type LiveModule = {
  id: string;
  icon: string;
  title: string;
  region: string;
  usefulness: string;
  usefulnessTone: "high" | "good" | "possible";
  example: string;
  detail: string;
  status: "research" | "partial";
  statusText: string;
  link?: { href: string; label: string };
};

const modules: LiveModule[] = [
  {
    id: "parking",
    icon: "🚗",
    title: "Parkplatzbelegung",
    region: "Flensburg",
    usefulness: "sehr interessant",
    usefulnessTone: "high",
    example: "312 / 900 belegt · 65 % frei",
    detail:
      "Später könnten freie und belegte Stellplätze, Kapazität und Auslastung je Parkhaus oder Parkplatz angezeigt werden.",
    status: "research",
    statusText: "Noch keine verifizierte Echtzeitquelle eingebunden.",
  },
  {
    id: "visitors",
    icon: "👥",
    title: "Besucherzählung",
    region: "Flensburg / Solitüde",
    usefulness: "sehr interessant",
    usefulnessTone: "high",
    example: "Aktuelle Personenzahl · Besucheraufkommen",
    detail:
      "Denkbar wären aktuelle Besucherzahlen, eine Auslastungsstufe oder ein Trend wie ruhig, normal oder stark besucht.",
    status: "research",
    statusText: "Noch kein belastbarer öffentlicher Live-Feed eingebunden.",
  },
  {
    id: "charging",
    icon: "⚡",
    title: "E-Ladesäulen",
    region: "Glücksburg / Flensburg",
    usefulness: "sehr gut nutzbar",
    usefulnessTone: "high",
    example: "3 frei · 1 belegt · 0 gestört",
    detail:
      "Ziel ist eine kompakte Statusanzeige für Ladepunkte mit frei, belegt, gestört und Standort.",
    status: "research",
    statusText: "Live-Belegung wird erst nach Anbindung einer geeigneten Quelle angezeigt.",
  },
  {
    id: "traffic",
    icon: "🚦",
    title: "Verkehr",
    region: "Förderegion",
    usefulness: "gut nutzbar",
    usefulnessTone: "good",
    example: "Verkehrsfluss · Stau · Sperrungen",
    detail:
      "Verkehrslage und Sperrungen könnten mit dem bestehenden Wegecheck kombiniert und später regional verdichtet werden.",
    status: "partial",
    statusText: "Teilweise vorhanden: Wegecheck und vorhandene Sperrhinweise.",
    link: { href: "/wege", label: "Wegecheck öffnen →" },
  },
  {
    id: "transit",
    icon: "🚌",
    title: "ÖPNV",
    region: "Glücksburg / Flensburg",
    usefulness: "gut nutzbar",
    usefulnessTone: "good",
    example: "Abfahrt 15:42 · +4 Min. · Linie 21",
    detail:
      "Geplant sind nächste Abfahrten, Verspätungen und auf Wunsch die nächstgelegene Haltestelle.",
    status: "research",
    statusText: "Noch keine verifizierte Echtzeit-Schnittstelle eingebunden.",
  },
  {
    id: "sharing",
    icon: "🚲",
    title: "Sharing",
    region: "anbieterabhängig",
    usefulness: "möglich",
    usefulnessTone: "possible",
    example: "5 Fahrzeuge verfügbar · 2 Stationen",
    detail:
      "Fahrräder, E-Bikes oder andere Sharing-Angebote können ergänzt werden, wenn ein Anbieter einen geeigneten Feed bereitstellt.",
    status: "research",
    statusText: "Aktuell kein Anbieter-Feed eingebunden.",
  },
];

function toneClass(tone: LiveModule["usefulnessTone"]) {
  if (tone === "high") return styles.high;
  if (tone === "good") return styles.good;
  return styles.possible;
}

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
          <span className="foerde-kicker">Experiment · noch nicht auf der Startseite</span>
          <h1>Live-Daten-Labor</h1>
          <p>
            Hier sammeln wir Echtzeitdaten, die für die Förderegion wirklich nützlich
            werden können. Erst wenn eine Quelle belastbar ist, wird aus einem
            Darstellungsbeispiel ein echter Live-Wert.
          </p>
        </section>

        <section className={styles.statusPanel} aria-label="Status der Pilotseite">
          <div>
            <span className={styles.statusDot} aria-hidden="true" />
            <span>
              <strong>Technisch vorbereitet</strong>
              <small>Module können später einzeln dynamisch in die Startseite übernommen werden.</small>
            </span>
          </div>
          <span className={styles.experimental}>nicht indexiert · Pilotseite</span>
        </section>

        <section className={styles.grid} aria-label="Mögliche Live-Daten">
          {modules.map((item) => (
            <article className={styles.card} key={item.id}>
              <div className={styles.cardTop}>
                <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                <span
                  className={
                    styles.usefulness + " " + toneClass(item.usefulnessTone)
                  }
                >
                  {item.usefulness}
                </span>
              </div>

              <div className={styles.titleRow}>
                <div>
                  <h2>{item.title}</h2>
                  <span className={styles.region}>📍 {item.region}</span>
                </div>
              </div>

              <div className={styles.example}>
                <small>Darstellungsbeispiel · kein Live-Wert</small>
                <strong>{item.example}</strong>
              </div>

              <p>{item.detail}</p>

              <div
                className={
                  styles.dataStatus +
                  " " +
                  (item.status === "partial" ? styles.partial : styles.research)
                }
              >
                <span aria-hidden="true">{item.status === "partial" ? "◐" : "○"}</span>
                <span>
                  <strong>
                    {item.status === "partial"
                      ? "Teilweise nutzbar"
                      : "Quelle noch offen"}
                  </strong>
                  <small>{item.statusText}</small>
                </span>
              </div>

              {item.link ? (
                <a className={styles.cardLink} href={item.link.href}>
                  {item.link.label}
                </a>
              ) : null}
            </article>
          ))}
        </section>

        <section className={styles.nextStep}>
          <span className="foerde-kicker">Später für die Startseite</span>
          <h2>Ein gemeinsamer „Was ist gerade los?“-Block</h2>
          <p>
            Sobald mehrere Quellen zuverlässig laufen, können wir daraus eine einzige
            kompakte Live-Zeile bauen – zum Beispiel: Parkplatz frei, Verkehr ruhig,
            Bus verspätet, drei Ladepunkte frei. Die Startseite selbst bleibt bis dahin
            unverändert.
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
