"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { affiliateLinks } from "@/lib/affiliate";
import styles from "./live.module.css";

type Score = {
  id: string;
  label: string;
  icon: string;
  score: number;
  verdict: string;
  tone: "good" | "mixed" | "poor";
};

type BestTime = {
  id: string;
  label: string;
  icon: string;
  start: string | null;
  end: string | null;
  score: number | null;
  rainProbability: number | null;
  windSpeed: number | null;
  uvIndex: number | null;
  verdict: string;
};

type Beach = {
  id: string;
  name: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  quality: string;
  qualityPeriod: string | null;
  waterTemperature: number | null;
  lastSampleAt: string | null;
  remark: string | null;
  status: "green" | "yellow" | "red";
  statusLabel: string;
  summary: string;
  weatherScore: number;
  uvIndex: number;
  windSpeed: number;
  rainProbability: number;
  officialBathingData: boolean;
};

type ChangeItem = {
  id: string;
  title: string;
  publishedAt: string | null;
  sourceUrl: string;
  sourceType: string;
  category: string;
};

type LiveData = {
  generatedAt: string;
  location: { name: string; areas?: string[] };
  weather: {
    temperature: number;
    apparentTemperature: number;
    precipitation: number;
    weatherLabel: string;
    windSpeed: number;
    windGusts: number;
    windDirection: number;
    rainProbability3h: number;
    uvIndex: number;
    observedAt: string | null;
  };
  scores: Score[];
  bestTimes: BestTime[];
  beaches: Beach[];
  changes: ChangeItem[];
  planningSourceUrl: string;
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(value)) return value.split(" ")[0];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

function beachTone(status: Beach["status"]) {
  if (status === "green") return styles.beachGreen;
  if (status === "yellow") return styles.beachYellow;
  return styles.beachRed;
}

function trackReferralClick(
  label: string,
  destination: string,
  affiliate: boolean
) {
  if (typeof window === "undefined") return;

  try {
    const consent = JSON.parse(
      localStorage.getItem("gluecksburg-direkt-consent-v1") || "null"
    ) as { statistics?: boolean } | null;

    if (consent?.statistics !== true) return;

    track("Referral Click", {
      label,
      destination,
      affiliate,
      area: "live",
    });
  } catch {}
}

export default function LiveDashboard({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bestScore =
    data?.scores?.length
      ? data.scores.reduce((best, current) => (current.score > best.score ? current : best))
      : null;

  const beachScore = data?.scores.find((item) => item.id === "beach")?.score ?? 0;
  const walkScore = data?.scores.find((item) => item.id === "walk")?.score ?? 0;
  const bikeScore = data?.scores.find((item) => item.id === "bike")?.score ?? 0;
  const outdoorGood = beachScore >= 65 || walkScore >= 72 || bikeScore >= 72;

  const dynamicOffers = data
    ? [
        ...(affiliateLinks.activities.enabled && beachScore >= 72 && data.weather.windSpeed <= 28
          ? [{
              id: "sailing",
              icon: "⛵",
              badge: "Werbung · Affiliate-Link",
              title: "Segeltörn auf der Flensburger Förde",
              description: `Passt heute besonders gut: Strand-Index ${beachScore}/100 · Wind ${Math.round(data.weather.windSpeed)} km/h.`,
              href: affiliateLinks.activities.offers.sailing,
              provider: affiliateLinks.activities.provider,
              affiliate: true,
            }]
          : []),
        ...(affiliateLinks.activities.enabled && beachScore >= 75 && data.weather.windSpeed <= 22
          ? [{
              id: "e-boat",
              icon: "🚤",
              badge: "Werbung · Affiliate-Link",
              title: "E-Boot auf der Flensburger Förde mieten",
              description: `Sehr passend für ruhiges Fördewetter: Strand-Index ${beachScore}/100 · Wind ${Math.round(data.weather.windSpeed)} km/h.`,
              href: affiliateLinks.activities.offers.eBoat,
              provider: affiliateLinks.activities.provider,
              affiliate: true,
            }]
          : []),
        ...(affiliateLinks.activities.enabled && walkScore >= 72 && data.weather.rainProbability3h <= 35
          ? [{
              id: "running-tour",
              icon: "🏃",
              badge: "Werbung · Affiliate-Link",
              title: "Running- & Sightseeing-Tour durch Flensburg",
              description: `Gute Bedingungen für eine aktive Stadttour: Spaziergang ${walkScore}/100 · Regenrisiko ${Math.round(data.weather.rainProbability3h)} %.`,
              href: affiliateLinks.activities.offers.runningTour,
              provider: affiliateLinks.activities.provider,
              affiliate: true,
            }]
          : []),
      ].slice(0, 2)
    : [];

  const fallbackOffer = {
    id: "fallback",
    icon: outdoorGood ? "🚤" : "☔",
    badge: "Redaktionell",
    title: outdoorGood ? "Freizeit & Förde entdecken" : "Schietwetter? Indoor & Freizeit",
    description: outdoorGood
      ? "Passende Ausflüge und Aktivitäten für die aktuellen Bedingungen entdecken."
      : "Alternative Ideen für einen Tag, an dem Strand und Spielplatz weniger passend sind.",
    href: "/freizeit-gluecksburg",
    provider: "FlensburgDirekt",
    affiliate: false,
  };

  const recommendedOffers = dynamicOffers.length ? dynamicOffers : [fallbackOffer];

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
    <section className={styles.page + (embedded ? " " + styles.homeEmbed : "")}>
      <div className={styles.shell}>
        {!embedded ? <header className={styles.topbar}>
          <a className={styles.brand} href="/" aria-label="Zurück zu FlensburgDirekt">
            <span className={styles.brandMark}>⚓</span>
            <span>Flensburg<strong>DIREKT</strong></span>
          </a>
          <a className={styles.back} href="/">← Zur Startseite</a>
        </header> : null}

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Live · automatisch aktualisiert</span>
            <h1>Flensburg Jetzt</h1>
            <p>
              {embedded
                ? "Flensburg im Fokus – mit Wassersleben und Glücksburg als Ergänzung. Wetter, Förde, Strand und passende Empfehlungen auf einen Blick."
                : "Aktuelle Bedingungen für Flensburg und die Förderegion: Wetter, Strandbedingungen, Fördepegel, amtliche Warnungen und passende Empfehlungen."}
            </p>
          </div>
          <button
            className={styles.liveBadge}
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Live-Daten jetzt aktualisieren"
            title="Live-Daten jetzt aktualisieren"
          >
            <span className={styles.liveDot} />
            <span>
              {loading
                ? "Aktualisiere …"
                : data
                  ? "Stand " + formatTime(data.generatedAt) + " Uhr · ↻"
                  : "Live-Daten laden · ↻"}
            </span>
          </button>
        </section>

        {data && bestScore ? (
          <section className={styles.nowSummary} aria-label="Flensburg jetzt Zusammenfassung">
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
              <span>☀️ UV: <strong>{data.weather.uvIndex.toFixed(1)}</strong></span>
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
                  <span>UV-Index: {data.weather.uvIndex.toFixed(1)}</span>
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
                          ? "Trend aktuell nicht verfügbar"
                          : (data.pegel.trendCm2h > 0 ? "+" : "") +
                            data.pegel.trendCm2h +
                            " cm in ca. 2 h"}
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
                    <span>für Flensburg und das direkte Förde-Umland</span>
                  </div>
                )}
              </article>
            </section>

            <section className={styles.scoreSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>Für jetzt bewertet</span>
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
                    <span className={styles.verdict + " " + styles[item.tone]}>
                      {item.verdict}
                    </span>
                    <div className={styles.bar} aria-hidden="true">
                      <span style={{ width: item.score + "%" }} />
                    </div>
                  </article>
                ))}
              </div>

              <p className={styles.explainer}>
                Der Index kombiniert Temperatur, Regenrisiko, Wind, Böen, UV, Tageslicht und
                amtliche Wetterwarnungen. Er ist eine Orientierung von FlensburgDirekt und keine
                amtliche Bewertung.
              </p>
            </section>

            <section className={styles.referralSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>Passend für heute</span>
                  <h2>Was heute besonders gut passt</h2>
                </div>
                <span className={styles.updated}>situativ empfohlen</span>
              </div>

              <div className={styles.referralGrid}>
                <a
                  className={styles.referralCard}
                  href={affiliateLinks.accommodation.url}
                  target="_blank"
                  rel="sponsored noreferrer"
                  onClick={() =>
                    trackReferralClick(
                      "Unterkunft in Flensburg",
                      affiliateLinks.accommodation.provider,
                      true
                    )
                  }
                >
                  <span className={styles.referralIcon} aria-hidden="true">🏨</span>
                  <span className={styles.referralBadge}>Werbung · Affiliate-Link</span>
                  <strong>Unterkunft in Flensburg finden</strong>
                  <p>Hotels, Ferienwohnungen und weitere Übernachtungsmöglichkeiten in Flensburg vergleichen.</p>
                  <em>Unterkünfte ansehen ↗</em>
                </a>

                {recommendedOffers.map((offer) => (
                  <a
                    className={styles.referralCard}
                    href={offer.href}
                    {...(offer.affiliate ? { target: "_blank", rel: "sponsored noreferrer" } : {})}
                    onClick={() =>
                      trackReferralClick(
                        offer.title,
                        offer.provider,
                        offer.affiliate
                      )
                    }
                    key={offer.id}
                  >
                    <span className={styles.referralIcon} aria-hidden="true">{offer.icon}</span>
                    <span className={styles.referralBadge + " " + (!offer.affiliate ? styles.editorialBadge : "")}>
                      {offer.badge}
                    </span>
                    <strong>{offer.title}</strong>
                    <p>{offer.description}</p>
                    <em>{offer.affiliate ? "Verfügbarkeit & Preis prüfen ↗" : "Freizeitideen öffnen →"}</em>
                  </a>
                ))}

                <a
                  className={styles.referralCard}
                  href="https://kulturbytes.de/de/veranstaltungen/deutschland/schleswig-holstein/flensburg"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackReferralClick("Veranstaltungen in Flensburg", "kulturbytes", false)
                  }
                >
                  <span className={styles.referralIcon} aria-hidden="true">📅</span>
                  <span className={styles.referralBadge + " " + styles.editorialBadge}>Aktuell</span>
                  <strong>Was ist heute in Flensburg los?</strong>
                  <p>Aktuelle Veranstaltungen in Flensburg direkt bei kulturbytes entdecken.</p>
                  <em>Veranstaltungen öffnen ↗</em>
                </a>

                <a
                  className={styles.referralCard}
                  href="/partner"
                  onClick={() =>
                    trackReferralClick("Lokaler Partner werden", "FlensburgDirekt", false)
                  }
                >
                  <span className={styles.referralIcon} aria-hidden="true">🤝</span>
                  <span className={styles.referralBadge + " " + styles.partnerBadge}>Für Betriebe</span>
                  <strong>Lokaler Anbieter in Glücksburg?</strong>
                  <p>Mit einem passenden Angebot auf FlensburgDirekt sichtbar werden.</p>
                  <em>Partner werden →</em>
                </a>
              </div>

              <p className={styles.affiliateNote}>
                Affiliate-Hinweis: Bei einer Buchung über entsprechend gekennzeichnete Links kann
                FlensburgDirekt eine Provision erhalten. Für dich entstehen dadurch keine
                zusätzlichen Kosten. Redaktionelle Empfehlungen sind davon unabhängig.
              </p>
            </section>

            <section className={styles.featureSection} data-home-section="best-times">
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>Beste Zeit heute</span>
                  <h2>Wann lohnt es sich am meisten?</h2>
                </div>
                <span className={styles.updated}>2-Stunden-Fenster · heute</span>
              </div>

              <div className={styles.bestTimeGrid}>
                {data.bestTimes.map((item) => (
                  <article className={styles.bestTimeCard} key={item.id}>
                    <div className={styles.bestTimeTop}>
                      <span className={styles.scoreIcon}>{item.icon}</span>
                      {item.score !== null ? (
                        <span className={styles.bestTimeScore}>{item.score}/100</span>
                      ) : null}
                    </div>
                    <h3>{item.label}</h3>
                    {item.start && item.end ? (
                      <>
                        <strong className={styles.timeWindow}>{item.start}–{item.end} Uhr</strong>
                        <span className={styles.bestTimeVerdict}>{item.verdict}</span>
                        <div className={styles.bestTimeMeta}>
                          <span>🌧️ {item.rainProbability ?? 0}%</span>
                          <span>💨 {item.windSpeed ?? 0} km/h</span>
                          <span>☀️ UV {item.uvIndex ?? 0}</span>
                        </div>
                      </>
                    ) : (
                      <p className={styles.muted}>Für heute ist kein sinnvoller Zeitraum mehr verfügbar.</p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.featureSection} data-home-section="beaches">
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>Strand-Ampel</span>
                  <h2>Solitüde, Ostseebad, Wassersleben & Glücksburg</h2>
                </div>
                <span className={styles.updated}>Wetter + UV + amtliche Daten, wo verfügbar</span>
              </div>

              {data.beaches.length ? (
                <div className={styles.beachGrid}>
                  {data.beaches.map((beach) => (
                    <article className={styles.beachCard} key={beach.id}>
                      <div className={styles.beachHead}>
                        <div>
                          <span className={styles.beachPlace}>🏖️ {beach.region}</span>
                          <h3>{beach.name}</h3>
                        </div>
                        <span className={styles.trafficLight + " " + beachTone(beach.status)}>
                          <i aria-hidden="true" />
                          {beach.statusLabel}
                        </span>
                      </div>

                      <strong className={styles.beachSummary}>{beach.summary}</strong>

                      <div className={styles.beachFacts}>
                        <span>
                          {beach.officialBathingData ? "Amtliche Qualität" : "Amtliche Einstufung"}
                          <strong>{beach.quality}</strong>
                        </span>
                        <span>
                          Wetter-Index
                          <strong>{beach.weatherScore}/100</strong>
                        </span>
                        <span>
                          UV
                          <strong>{beach.uvIndex.toFixed(1)}</strong>
                        </span>
                        {beach.officialBathingData ? (
                          <span>
                            Wassertemperatur
                            <strong>
                              {beach.waterTemperature === null ? "—" : beach.waterTemperature.toFixed(1) + " °C"}
                            </strong>
                          </span>
                        ) : (
                          <span>
                            Wind / Regen
                            <strong>{Math.round(beach.windSpeed)} km/h · {Math.round(beach.rainProbability)}%</strong>
                          </span>
                        )}
                      </div>

                      <small className={styles.beachFoot}>
                        {beach.officialBathingData
                          ? beach.lastSampleAt
                            ? "Letzte veröffentlichte Probe: " + formatDate(beach.lastSampleAt)
                            : "Kein aktuelles Probedatum geladen"
                          : "Keine separate amtliche Proben- oder Qualitätseinstufung eingebunden"}
                        {beach.qualityPeriod ? " · Einstufung " + beach.qualityPeriod : ""}
                      </small>
                      {beach.remark ? <p className={styles.beachRemark}>{beach.remark}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.dataEmpty}>
                  <strong>Amtliche Stranddaten konnten gerade nicht geladen werden.</strong>
                  <span>Wetter und die übrigen Live-Bereiche funktionieren unabhängig davon weiter.</span>
                </div>
              )}

              <p className={styles.explainer}>
                Flensburg steht im Mittelpunkt: Solitüde und Ostseebad werden zuerst gezeigt,
                Wassersleben ergänzt den westlichen Fördebereich, Sandwig und Holnis Drei bilden
                den Glücksburg-Zusatz. Wetter, UV, DWD-Warnungen und veröffentlichte amtliche
                Badegewässerdaten fließen in die Ampel ein. Hinweise und Sperrungen vor Ort haben
                immer Vorrang.
              </p>
            </section>

            <section className={styles.sourceSection} data-home-section="sources">
              <div>
                <span className={styles.kicker}>Datenquellen</span>
                <h2>Live-Daten im Überblick</h2>
              </div>
              <div className={styles.sourceGrid}>
                {data.sources.map((source) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.name}>
                    <strong>{source.name}</strong>
                    <em>{source.purpose} · ↗</em>
                  </a>
                ))}
              </div>
              <p className={styles.sourceNote}>
                Amtliche Warnungen: DWD · Pegel: WSV/PEGELONLINE · Badegewässer: Land Schleswig-Holstein.
              </p>
            </section>
          </>
        ) : loading ? (
          <section className={styles.loadingGrid}>
            <div /><div /><div />
          </section>
        ) : null}

        {!embedded ? (
          <footer className={styles.footer}>
            <span>FlensburgDirekt · lokal, unabhängig und datenbasiert</span>
          </footer>
        ) : (
          <div className={styles.homeEmbedFooter}>
            <a href="/live">Alle Live-Details öffnen →</a>
          </div>
        )}
      </div>
    </section>
  );
}
