"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./live.module.css";

type Score = {
  id: string;
  label: string;
  icon: string;
  score: number;
  verdict: string;
  tone: "good" | "mixed" | "poor";
};

type LiveData = {
  generatedAt: string;
  location: { name: string };
  weather: {
    temperature: number;
    apparentTemperature: number;
    precipitation: number;
    weatherLabel: string;
    windSpeed: number;
    windGusts: number;
    windDirection: number;
    rainProbability3h: number;
    observedAt: string | null;
  };
  scores: Score[];
  pegel: null | {
    station: string;
    value: number;
    unit: string;
    timestamp: string;
    trendCm2h: number | null;
    trend: "steigend" | "fallend" | "stabil";
    state: string | null;
  };
  warnings: Array<{
    headline: string;
    event: string;
    level: number;
    start: number;
    end: number;
    description?: string;
    instruction?: string;
  }>;
  sources: Array<{ name: string; purpose: string; url: string }>;
};

function formatTime(value: string | number | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function windDirection(degrees: number) {
  const labels = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  return labels[Math.round(degrees / 45) % 8];
}

function trendSymbol(trend: "steigend" | "fallend" | "stabil") {
  if (trend === "steigend") return "↗";
  if (trend === "fallend") return "↘";
  return "→";
}

function pegelStateLabel(state: string | null) {
  if (state === "low") return "niedrig";
  if (state === "high") return "hoch";
  if (state === "normal") return "normal";
  return "ohne Einstufung";
}

export default function LiveDashboard() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bestScore = data?.scores.reduce(
    (best, current) => current.score > best.score ? current : best,
    data.scores[0]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/live", { cache: "no-store" });
      if (!response.ok) throw new Error("Live-Daten konnten nicht geladen werden.");
      setData((await response.json()) as LiveData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Live-Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <a className={styles.brand} href="/" aria-label="Zurück zu GlücksburgDirekt">
            <span className={styles.brandMark}>⚓</span>
            <span>Glücksburg<strong>DIREKT</strong></span>
          </a>
          <a className={styles.back} href="/">← Zur Startseite</a>
        </header>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Live · automatisch aktualisiert</span>
            <h1>Glücksburg Jetzt</h1>
            <p>
              Öffentliche Daten verständlich zusammengefasst: Was lohnt sich gerade draußen,
              wie entwickelt sich der Fördepegel und gibt es amtliche Warnungen?
            </p>
          </div>
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            {loading ? "Wird geladen" : "Live-Daten"}
          </div>
        </section>

        {data && bestScore ? (
          <section className={styles.nowSummary} aria-label="Glücksburg jetzt Zusammenfassung">
            <div className={styles.summaryLead}>
              <span className={styles.summaryIcon} aria-hidden="true">{bestScore.icon}</span>
              <span>
                <small>Beste Option gerade</small>
                <strong>{bestScore.label} · {bestScore.score}/100</strong>
              </span>
            </div>
            <div className={styles.summaryFacts}>
              <span>🌧️ 3 h: <strong>{Math.round(data.weather.rainProbability3h)} %</strong></span>
              <span>💨 Wind: <strong>{Math.round(data.weather.windSpeed)} km/h</strong></span>
              <span>
                {data.warnings.length ? "⚠️" : "✓"} Warnungen:{" "}
                <strong>{data.warnings.length ? data.warnings.length : "keine"}</strong>
              </span>
              <span>
                🌊 Pegel: <strong>{data.pegel ? data.pegel.trend : "—"}</strong>
              </span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className={styles.errorBox}>
            <strong>Daten momentan nicht erreichbar</strong>
            <span>{error}</span>
            <button onClick={load}>Erneut versuchen</button>
          </section>
        ) : null}

        {data ? (
          <>
            <section className={styles.nowGrid}>
              <article className={styles.weatherCard}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.kicker}>Wetter</span>
                    <h2>{data.weather.weatherLabel}</h2>
                  </div>
                  <span className={styles.weatherIcon} aria-hidden="true">
                    {data.weather.precipitation > 0 ? "🌧️" : "🌤️"}
                  </span>
                </div>
                <div className={styles.temperature}>
                  {Math.round(data.weather.temperature)}°
                </div>
                <div className={styles.facts}>
                  <span>Gefühlt {Math.round(data.weather.apparentTemperature)} °C</span>
                  <span>
                    Wind {Math.round(data.weather.windSpeed)} km/h {windDirection(data.weather.windDirection)}
                  </span>
                  <span>Böen {Math.round(data.weather.windGusts)} km/h</span>
                  <span>Regenrisiko 3 h: {Math.round(data.weather.rainProbability3h)} %</span>
                </div>
              </article>

              <article className={styles.pegelCard}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.kicker}>Flensburger Förde</span>
                    <h2>Fördepegel</h2>
                  </div>
                  <span className={styles.waveIcon} aria-hidden="true">🌊</span>
                </div>
                {data.pegel ? (
                  <>
                    <div className={styles.pegelValue}>
                      {Math.round(data.pegel.value)} <small>{data.pegel.unit}</small>
                    </div>
                    <div className={styles.trend}>
                      <strong>{trendSymbol(data.pegel.trend)} {data.pegel.trend}</strong>
                      <span>
                        {data.pegel.trendCm2h === null
                          ? "Trend wird ermittelt"
                          : `${data.pegel.trendCm2h > 0 ? "+" : ""}${data.pegel.trendCm2h} cm in ca. 2 h`}
                      </span>
                    </div>
                    <small className={styles.muted}>
                      Einstufung: {pegelStateLabel(data.pegel.state)} · Messung {formatTime(data.pegel.timestamp)} Uhr
                    </small>
                  </>
                ) : (
                  <p className={styles.muted}>Der Pegelwert ist momentan nicht verfügbar.</p>
                )}
              </article>

              <article className={styles.warningCard}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.kicker}>Deutscher Wetterdienst</span>
                    <h2>Amtliche Warnungen</h2>
                  </div>
                  <span className={styles.warningIcon} aria-hidden="true">
                    {data.warnings.length ? "⚠️" : "✓"}
                  </span>
                </div>

                {data.warnings.length ? (
                  <div className={styles.warningList}>
                    {data.warnings.slice(0, 3).map((warning, index) => (
                      <div className={styles.warningItem} key={warning.headline + index}>
                        <strong>{warning.headline}</strong>
                        <span>
                          {formatTime(warning.start)} – {formatTime(warning.end)} Uhr
                        </span>
                        {warning.description ? <p>{warning.description}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.allClear}>
                    <strong>Keine aktive DWD-Wetterwarnung</strong>
                    <span>für den Kreis Schleswig-Flensburg</span>
                  </div>
                )}
              </article>
            </section>

            <section className={styles.scoreSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>Entscheidung statt Rohdaten</span>
                  <h2>Was lohnt sich gerade?</h2>
                </div>
                <span className={styles.updated}>
                  Aktualisiert {formatTime(data.generatedAt)} Uhr
                </span>
              </div>

              <div className={styles.scoreGrid}>
                {data.scores.map((item) => (
                  <article className={styles.scoreCard} key={item.id}>
                    <div className={styles.scoreTop}>
                      <span className={styles.scoreIcon}>{item.icon}</span>
                      <span className={styles.scoreNumber}>{item.score}<small>/100</small></span>
                    </div>
                    <h3>{item.label}</h3>
                    <span className={`${styles.verdict} ${styles[item.tone]}`}>
                      {item.verdict}
                    </span>
                    <div className={styles.bar} aria-hidden="true">
                      <span style={{ width: `${item.score}%` }} />
                    </div>
                  </article>
                ))}
              </div>

              <p className={styles.explainer}>
                Der Index kombiniert Temperatur, Regenrisiko, Wind und Böen. Er ist eine
                Orientierung von GlücksburgDirekt und keine amtliche Bewertung.
              </p>
            </section>

            <section className={styles.sourceSection}>
              <div>
                <span className={styles.kicker}>Transparente Datenquellen</span>
                <h2>Woher kommen die Werte?</h2>
              </div>
              <div className={styles.sourceGrid}>
                {data.sources.map((source) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.name}>
                    <strong>{source.name}</strong>
                    <span>{source.purpose}</span>
                    <em>Quelle öffnen ↗</em>
                  </a>
                ))}
              </div>
              <p className={styles.sourceNote}>
                PEGELONLINE stellt ungeprüfte Rohdaten der Wasserstraßen- und
                Schifffahrtsverwaltung bereit. Wetterwarnungen stammen aus dem
                Open-Data-Angebot des Deutschen Wetterdienstes.
              </p>
            </section>
          </>
        ) : loading ? (
          <section className={styles.loadingGrid}>
            <div /><div /><div />
          </section>
        ) : null}

        <footer className={styles.footer}>
          <span>GlücksburgDirekt · lokal, unabhängig und datenbasiert</span>
          <button onClick={load} disabled={loading}>
            {loading ? "Aktualisiere …" : "Daten aktualisieren"}
          </button>
        </footer>
      </div>
    </main>
  );
}
