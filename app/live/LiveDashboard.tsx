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

export default function LiveDashboard() {
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
        ...(affiliateLinks.activities.enabled && walkScore >= 70
          ? [{
              id: "history-walk",
              icon: "🚶",
              badge: "Werbung · Affiliate-Link",
              title: "Historischer Stadtrundgang in Flensburg",
              description: `Gute Bedingungen für draußen: Spaziergang ${walkScore}/100 · Regenrisiko ${Math.round(data.weather.rainProbability3h)} %.`,
              href: affiliateLinks.activities.offers.historyWalk,
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
    provider: "GlücksburgDirekt",
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
              Öffentliche Daten verständlich zusammengefasst: Wetter, beste Zeit für draußen,
              Strandbedingungen, Fördepegel, amtliche Warnungen und lokale Veränderungen.
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
                amtliche Wetterwarnungen. Er ist eine Orientierung von GlücksburgDirekt und keine
                amtliche Bewertung.
              </p>
            </section>

            <section className={styles.referralSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>Passend für heute</span>
                  <h2>Von der Information direkt zur passenden Option</h2>
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
                      "Unterkunft in Glücksburg",
                      affiliateLinks.accommodation.provider,
                      true
                    )
                  }
                >
                  <span className={styles.referralIcon} aria-hidden="true">🏨</span>
                  <span className={styles.referralBadge}>Werbung · Affiliate-Link</span>
                  <strong>Unterkunft in Glücksburg finden</strong>
                  <p>Hotels, Ferienwohnungen und weitere Übernachtungsmöglichkeiten vergleichen.</p>
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
                  href="/heute-in-gluecksburg"
                  onClick={() =>
                    trackReferralClick("Heute in Glücksburg", "GlücksburgDirekt", false)
                  }
                >
                  <span className={styles.referralIcon} aria-hidden="true">📅</span>
                  <span className={styles.referralBadge + " " + styles.editorialBadge}>Redaktionell</span>
                  <strong>Was ist heute in Glücksburg los?</strong>
                  <p>Aktuelle Veranstaltungen und Termine mit dem Live-Check kombinieren.</p>
                  <em>Heute ansehen →</em>
                </a>

                <a
                  className={styles.referralCard}
                  href="/partner"
                  onClick={() =>
                    trackReferralClick("Lokaler Partner werden", "GlücksburgDirekt", false)
                  }
                >
                  <span className={styles.referralIcon} aria-hidden="true">🤝</span>
                  <span className={styles.referralBadge + " " + styles.partnerBadge}>Für Betriebe</span>
                  <strong>Lokaler Anbieter in Glücksburg?</strong>
                  <p>Mit einem passenden Angebot auf GlücksburgDirekt sichtbar werden.</p>
                  <em>Partner werden →</em>
                </a>
              </div>

              <p className={styles.affiliateNote}>
                Affiliate-Hinweis: Bei einer Buchung über entsprechend gekennzeichnete Links kann
                GlücksburgDirekt eine Provision erhalten. Für dich entstehen dadurch keine
                zusätzlichen Kosten. Redaktionelle Empfehlungen sind davon unabhängig.
              </p>
            </section>

            <section className={styles.featureSection}>
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

            <section className={styles.featureSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>Strand-Ampel</span>
                  <h2>Holnis, Sandwig & Quellental auf einen Blick</h2>
                </div>
                <span className={styles.updated}>Wetter + UV + amtliche Daten, wo verfügbar</span>
              </div>

              {data.beaches.length ? (
                <div className={styles.beachGrid}>
                  {data.beaches.map((beach) => (
                    <article className={styles.beachCard} key={beach.id}>
                      <div className={styles.beachHead}>
                        <div>
                          <span className={styles.beachPlace}>🏖️ Badestelle</span>
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
                          : "Keine separate amtliche Proben- oder Qualitätseinstufung für Quellental eingebunden"}
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
                Die Ampelfarbe ist eine GlücksburgDirekt-Zusammenfassung. Bei Holnis Drei und
                Sandwig fließen Wetter, UV, DWD-Warnungen und die veröffentlichten amtlichen
                Badegewässerdaten ein. Bei Quellental basiert die Ampel mangels separater amtlicher
                Einstufung auf Wetter, UV, Wind, Regen und DWD-Warnungen. Aktuelle Sperrungen,
                Warnschilder und Hinweise der Behörden vor Ort haben immer Vorrang.
              </p>
            </section>

            <section className={styles.featureSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>Baustellen & Veränderungen</span>
                  <h2>Was verändert sich in Glücksburg?</h2>
                </div>
                <a
                  className={styles.sourceLink}
                  href={data.planningSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Bauleitpläne im DANord ↗
                </a>
              </div>

              {data.changes.length ? (
                <div className={styles.changeList}>
                  {data.changes.map((item) => (
                    <a
                      className={styles.changeRow}
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      key={item.id}
                    >
                      <span className={styles.changeIcon} aria-hidden="true">
                        {item.category === "Bauleitplanung"
                          ? "🏗️"
                          : item.category === "Straße & Verkehr"
                            ? "🚧"
                            : "🏘️"}
                      </span>
                      <span className={styles.changeCopy}>
                        <small>{item.category} · {formatDate(item.publishedAt)}</small>
                        <strong>{item.title}</strong>
                        <em>{item.sourceType}</em>
                      </span>
                      <span className={styles.changeArrow} aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className={styles.dataEmpty}>
                  <strong>Keine neuen passenden Meldungen gefunden.</strong>
                  <span>
                    Die amtlichen Bekanntmachungen werden automatisch nach Bauleitplanung,
                    Baustellen, Straßensperrungen und Entwicklungsvorhaben gefiltert.
                  </span>
                </div>
              )}
            </section>

            <section className={styles.seoInfo}>
              <span className={styles.kicker}>Glücksburg live im Überblick</span>
              <h2>Wetter, Strand-Ampel, Fördepegel und Baustellen für Glücksburg</h2>
              <p>
                Auf GlücksburgDirekt findest du aktuelle Informationen für Glücksburg an der Ostsee:
                Wetter und Regenrisiko, amtliche DWD-Warnungen, den Fördepegel bei Flensburg,
                Strandbedingungen für Holnis Drei, Sandwig und Quellental sowie Hinweise zu Bauleitplanung,
                Baustellen und Veränderungen im Stadtgebiet.
              </p>
              <p>
                Die Live-Ansicht verbindet mehrere öffentliche Datenquellen und übersetzt sie in
                verständliche Hinweise für Strand, Spaziergang, Fahrrad und Spielplatz. So siehst du
                nicht nur Messwerte, sondern auch, wann sich Aktivitäten heute sinnvoll anbieten.
              </p>
              <nav className={styles.seoLinks} aria-label="Verwandte Inhalte in Glücksburg">
                <a href="/straende-gluecksburg">Strände in Glücksburg</a>
                <a href="/heute-in-gluecksburg">Heute in Glücksburg</a>
                <a href="/veranstaltungen">Veranstaltungen in Glücksburg</a>
                <a href="/rathaus">Rathaus & amtliche Informationen</a>
              </nav>
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
                Open-Data-Angebot des Deutschen Wetterdienstes. Die Badegewässerdaten stammen
                aus dem Open-Data-Angebot des Landes Schleswig-Holstein.
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
