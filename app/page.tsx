"use client";

import { useEffect, useMemo, useState } from "react";
import { affiliateLinks } from "@/lib/affiliate";
import { regions, type RegionId } from "@/lib/regions";
import styles from "./foerde-home.module.css";

type Bathing = {
  name: string;
  quality: string | null;
  period: string | null;
};

type Weather = {
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  windGusts: number;
  rainChance: number;
  uvIndex: number;
  isDay: boolean;
  observedAt: string | null;
};

type DwdWarning = {
  headline: string;
  event: string;
  level: number;
  start: number;
  end: number;
};

type Marine = {
  waveHeight: number | null;
  wavePeriod: number | null;
  windWaveHeight: number | null;
  observedAt: string | null;
};

type RegionData = {
  id: RegionId;
  weather: Weather | null;
  beaches: Bathing[];
  warnings: DwdWarning[];
};

type Feed = {
  updatedAt: string;
  marine: Marine | null;
  places: RegionData[];
  sources: { weather: string; bathing: string; warnings: string; marine: string };
};

type ActivityScore = {
  id: "walk" | "bike" | "beach" | "indoor";
  label: string;
  icon: string;
  score: number;
  verdict: string;
  reason: string;
};

function weatherLabel(code: number) {
  if (code === 0) return "Klar";
  if (code < 4) return "Bewölkt";
  if (code < 50) return "Nebel";
  if (code < 70) return "Regen oder Nieselregen";
  if (code < 90) return "Schnee oder Schauer";
  return "Gewitter möglich";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tempPenalty(temp: number, ideal: number, tolerance: number) {
  return Math.max(0, Math.abs(temp - ideal) - tolerance) * 3;
}

function verdict(score: number, isDay: boolean, id: ActivityScore["id"]) {
  if (!isDay && id === "beach") return "Für heute zu spät";
  if (!isDay && id === "bike") return "Nur mit guter Beleuchtung";
  if (!isDay && id === "walk") return "Okay, aber dunkel";
  if (score >= 80) return "Sehr gut";
  if (score >= 65) return "Gut";
  if (score >= 45) return "Eher wechselhaft";
  return "Gerade eher nicht";
}

function activityScores(
  weather: Weather,
  warningLevel: number,
  marine: Marine | null
): ActivityScore[] {
  const wet = weather.rainChance * 0.58 + Math.min(28, weather.precipitation * 16);
  const gust = Math.max(0, weather.windGusts - 35) * 0.75;
  const warningPenalty =
    warningLevel >= 4 ? 70 : warningLevel === 3 ? 45 : warningLevel === 2 ? 25 : warningLevel === 1 ? 12 : 0;
  const wavePenalty =
    marine?.waveHeight != null ? Math.max(0, marine.waveHeight - 0.45) * 28 : 0;

  const walk = clamp(
    100 -
      wet * 0.78 -
      Math.max(0, weather.windSpeed - 28) * 1.2 -
      gust -
      tempPenalty(weather.temperature, 16, 10) -
      Math.max(0, weather.uvIndex - 8) * 2 -
      warningPenalty -
      (weather.isDay ? 0 : 30)
  );

  const bike = clamp(
    100 -
      wet -
      Math.max(0, weather.windSpeed - 18) * 2 -
      gust * 1.2 -
      tempPenalty(weather.temperature, 17, 9) -
      warningPenalty -
      (weather.isDay ? 0 : 55)
  );

  const beach = clamp(
    100 -
      wet -
      Math.max(0, weather.windSpeed - 23) * 1.7 -
      gust -
      tempPenalty(weather.temperature, 22, 7) -
      Math.max(0, weather.uvIndex - 7) * 2.5 -
      warningPenalty -
      wavePenalty -
      (weather.isDay ? 0 : 85)
  );

  const bestOutdoor = Math.max(walk, bike, beach);
  const indoor = clamp(55 + Math.max(0, 65 - bestOutdoor) * 0.75);

  const result: ActivityScore[] = [
    {
      id: "walk",
      label: "Spaziergang",
      icon: "🚶",
      score: walk,
      verdict: verdict(walk, weather.isDay, "walk"),
      reason: `${Math.round(weather.rainChance)} % Regen · gefühlt ${Math.round(weather.apparentTemperature)} °C`,
    },
    {
      id: "bike",
      label: "Fahrrad",
      icon: "🚲",
      score: bike,
      verdict: verdict(bike, weather.isDay, "bike"),
      reason: `Wind ${Math.round(weather.windSpeed)} · Böen ${Math.round(weather.windGusts)} km/h`,
    },
    {
      id: "beach",
      label: "Strand & Wasser",
      icon: "🏖️",
      score: beach,
      verdict: verdict(beach, weather.isDay, "beach"),
      reason:
        marine?.waveHeight != null
          ? `Welle ${marine.waveHeight.toFixed(1)} m · Wind ${Math.round(weather.windSpeed)} km/h`
          : `${Math.round(weather.rainChance)} % Regen · Wind ${Math.round(weather.windSpeed)} km/h`,
    },
    {
      id: "indoor",
      label: "Drinnen",
      icon: "🏛️",
      score: indoor,
      verdict: verdict(indoor, true, "indoor"),
      reason:
        weather.rainChance >= 45
          ? `Gute Ausweichoption bei ${Math.round(weather.rainChance)} % Regenrisiko`
          : "Wetterunabhängig und jederzeit planbar",
    },
  ];

  return result.sort((a, b) => b.score - a.score);
}

function sourceTime(value: string | null | undefined) {
  if (!value) return null;
  const time = value.slice(11, 16);
  return /^\d{2}:\d{2}$/.test(time) ? time : null;
}

export default function HomePage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () =>
      fetch("/api/foerde", { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Datenquelle nicht erreichbar");
          return response.json();
        })
        .then((value: Feed) => {
          setFeed(value);
          setError(false);
        })
        .catch((reason) => {
          if (reason.name !== "AbortError") setError(true);
        });

    refresh();
    const timer = window.setInterval(refresh, 5 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  const regionalWeather = useMemo<Weather | null>(() => {
    const values = (feed?.places ?? [])
      .map((place) => place.weather)
      .filter((value): value is Weather => Boolean(value));

    if (!values.length) return null;

    const average = (pick: (value: Weather) => number) =>
      values.reduce((sum, value) => sum + pick(value), 0) / values.length;

    return {
      temperature: average((value) => value.temperature),
      apparentTemperature: average((value) => value.apparentTemperature),
      precipitation: Math.max(...values.map((value) => value.precipitation)),
      weatherCode: values[0].weatherCode,
      windSpeed: average((value) => value.windSpeed),
      windGusts: Math.max(...values.map((value) => value.windGusts)),
      rainChance: Math.max(...values.map((value) => value.rainChance)),
      uvIndex: Math.max(...values.map((value) => value.uvIndex)),
      isDay: values.some((value) => value.isDay),
      observedAt:
        values
          .map((value) => value.observedAt)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null,
    };
  }, [feed]);

  const regionalWarnings = useMemo(() => {
    const seen = new Set<string>();
    return (feed?.places ?? []).flatMap((place) =>
      (place.warnings ?? []).filter((warning) => {
        const key = warning.event + "|" + warning.headline + "|" + warning.start;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );
  }, [feed]);

  const warningLevel =
    regionalWarnings.reduce(
      (max, item) => Math.max(max, Number(item.level) || 0),
      0
    ) ?? 0;

  const beaches = useMemo(
    () =>
      (feed?.places ?? []).flatMap((place) => {
        const regionName =
          regions.find((region) => region.id === place.id)?.name ?? place.id;
        return place.beaches.map((beach) => ({ ...beach, regionName }));
      }),
    [feed]
  );

  const scores = useMemo(
    () =>
      regionalWeather
        ? activityScores(regionalWeather, warningLevel, feed?.marine ?? null)
        : [],
    [regionalWeather, warningLevel, feed?.marine]
  );
  const best = scores[0];

  const activityOffers = useMemo(() => {
    const weather = regionalWeather;
    if (!weather || !affiliateLinks.activities.enabled) return [];

    const walk = scores.find((item) => item.id === "walk")?.score ?? 0;
    const beach = scores.find((item) => item.id === "beach")?.score ?? 0;
    const indoor = scores.find((item) => item.id === "indoor")?.score ?? 0;
    const waveHeight = feed?.marine?.waveHeight;

    const offers: Array<{
      id: string;
      icon: string;
      title: string;
      detail: string;
      href: string;
    }> = [];

    if (
      beach >= 64 &&
      weather.windSpeed >= 4 &&
      weather.windSpeed <= 30 &&
      weather.rainChance <= 35 &&
      (waveHeight == null || waveHeight <= 1.2)
    ) {
      offers.push({
        id: "sailing",
        icon: "⛵",
        title: "Segeltörn auf der Flensburger Förde",
        detail:
          "Jetzt passend: Wind " +
          Math.round(weather.windSpeed) +
          " km/h · Regen " +
          Math.round(weather.rainChance) +
          " %" +
          (waveHeight != null ? " · Welle " + waveHeight.toFixed(1) + " m" : "") +
          ".",
        href: affiliateLinks.activities.offers.sailing,
      });
    }

    if (
      beach >= 68 &&
      weather.windSpeed <= 22 &&
      weather.rainChance <= 30 &&
      (waveHeight == null || waveHeight <= 0.65)
    ) {
      offers.push({
        id: "eboat",
        icon: "🚤",
        title: "E-Boot auf der Förde",
        detail:
          "Ruhige Bedingungen: Wind " +
          Math.round(weather.windSpeed) +
          " km/h · Regen " +
          Math.round(weather.rainChance) +
          " %" +
          (waveHeight != null ? " · Welle " + waveHeight.toFixed(1) + " m" : "") +
          ".",
        href: affiliateLinks.activities.offers.eBoat,
      });
    }

    if (walk >= 68 && weather.rainChance <= 35 && weather.isDay) {
      offers.push({
        id: "running",
        icon: "🏃",
        title: "Running- & Sightseeing-Tour",
        detail:
          "Draußen gerade gut: gefühlt " +
          Math.round(weather.apparentTemperature) +
          " °C · Regen " +
          Math.round(weather.rainChance) +
          " %.",
        href: affiliateLinks.activities.offers.runningTour,
      });
    } else if (walk >= 48 && weather.rainChance <= 50 && weather.isDay) {
      offers.push({
        id: "walking",
        icon: "🚶",
        title: "Private Stadtführung in Flensburg",
        detail:
          "Für eine ruhigere Tour: gefühlt " +
          Math.round(weather.apparentTemperature) +
          " °C · Wind " +
          Math.round(weather.windSpeed) +
          " km/h.",
        href: affiliateLinks.activities.offers.walkingTour,
      });
    }

    if (indoor >= 62 || weather.rainChance > 45 || !weather.isDay) {
      offers.push({
        id: "escape",
        icon: "🕵️",
        title: "True-Crime-Stadtabenteuer",
        detail:
          !weather.isDay
            ? "Eine buchbare Alternative für den späteren Tagesverlauf."
            : "Passt als Alternative bei wechselhaftem Wetter; Teile der Tour finden draußen statt.",
        href: affiliateLinks.activities.offers.escapeGame,
      });
    }

    if (offers.length < 3) {
      offers.push({
        id: "browse",
        icon: best?.id === "indoor" ? "☔" : "🧭",
        title: "Weitere Aktivitäten an der Förde",
        detail:
          "Termine, aktuelle Preise und freie Plätze direkt bei GetYourGuide prüfen.",
        href: affiliateLinks.activities.url,
      });
    }

    return offers.slice(0, 3);
  }, [regionalWeather, scores, best?.id, feed?.marine]);

  return (
    <main className="foerde-page" id="content">
      <div className="foerde-shell">
        <header className="foerde-header">
          <a href="/" className="foerde-brand" aria-label="Förde.info Startseite">
            ⚓ <strong>förde.info</strong>
          </a>
          <nav aria-label="Bereiche">
            <a href="#live">Live</a>
            <a href="/wege">Wegecheck</a>
            <a href="/veranstaltungen">Veranstaltungen</a>
            <a href="/gluecksburg#impressum">Impressum</a>
          </nav>
        </header>

        <section className="foerde-intro">
          <span className="foerde-kicker">Flensburger Förde · lokal und unabhängig</span>
          <h1>Was ist los an der Förde?</h1>
          <p>
            Flensburg, Wassersleben, Glücksburg und Langballig: aktuelle Bedingungen,
            Veranstaltungen und passende Ideen für genau jetzt.
          </p>
        </section>

        <section className="foerde-live" id="live" aria-label="Aktuelle Lage an der Flensburger Förde">
          <div className="foerde-location">
            <div className={styles.overviewHeader}>
              <div>
                <span className="foerde-kicker">Live an der Förde</span>
                <h2>Was lohnt sich gerade?</h2>
                <p>Aktuelle API-Daten werden in konkrete Empfehlungen für genau jetzt übersetzt.</p>
              </div>
              {feed?.updatedAt ? (
                <small>
                  Aktualisiert {sourceTime(feed.updatedAt) ?? "gerade"} Uhr
                </small>
              ) : null}
            </div>

            <article className={styles.weatherSummary} aria-live="polite">
              <div className={styles.weatherTop}>
                <span>🌤️ Wetter</span>
                <strong>
                  {regionalWeather ? Math.round(regionalWeather.temperature) + " °C" : "—"}
                </strong>
              </div>
              <p>
                {regionalWeather
                  ? weatherLabel(regionalWeather.weatherCode) +
                    " · gefühlt " +
                    Math.round(regionalWeather.apparentTemperature) +
                    " °C · Wind " +
                    Math.round(regionalWeather.windSpeed) +
                    " km/h" +
                    (sourceTime(regionalWeather.observedAt)
                      ? " · Stand " + sourceTime(regionalWeather.observedAt) + " Uhr"
                      : "")
                  : error || feed
                    ? "Wetterdaten momentan nicht erreichbar"
                    : "Wetterdaten werden geladen"}
              </p>
              <div className={styles.weatherDivider} />
              <div className={styles.rainRow}>
                <span>🌧️ Regenrisiko · nächste 3 Stunden</span>
                <strong>
                  {regionalWeather ? Math.round(regionalWeather.rainChance) + " %" : "—"}
                </strong>
              </div>
              <p>
                {regionalWeather
                  ? "Böen " +
                    Math.round(regionalWeather.windGusts) +
                    " km/h · UV max. " +
                    regionalWeather.uvIndex.toFixed(1)
                  : "Kurzfristprognose von Open-Meteo"}
              </p>
              <small className={styles.regionalNote}>
                Regional zusammengefasst: Temperatur und Wind werden gemittelt; bei
                Regenrisiko, Böen und UV wird der höchste Kurzfristwert der vier Orte gezeigt.
              </small>
              {feed?.marine?.waveHeight != null ? (
                <>
                  <div className={styles.weatherDivider} />
                  <div className={styles.rainRow}>
                    <span>🌊 Fördebedingungen</span>
                    <strong>{feed.marine.waveHeight.toFixed(1)} m</strong>
                  </div>
                  <p>
                    Wellenhöhe
                    {feed.marine.wavePeriod != null
                      ? " · Periode " + feed.marine.wavePeriod.toFixed(1) + " s"
                      : ""}
                    {sourceTime(feed.marine.observedAt)
                      ? " · Stand " + sourceTime(feed.marine.observedAt) + " Uhr"
                      : ""}
                  </p>
                </>
              ) : null}
            </article>

            {regionalWarnings.length ? (
              <aside className={styles.warningBox} role="status">
                <span aria-hidden="true">⚠️</span>
                <span>
                  <strong>Amtliche DWD-Warnung für die Region</strong>
                  <small>{regionalWarnings[0].headline}</small>
                </span>
                <a
                  href={feed?.sources.warnings ?? "https://www.dwd.de/"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DWD öffnen ↗
                </a>
              </aside>
            ) : null}

            {regionalWeather ? (
              <section className={styles.nowSection} aria-label="Was kann ich gerade machen?">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className="foerde-kicker">Direkt entscheiden</span>
                    <h3>Was kann ich gerade machen?</h3>
                  </div>
                  {best ? (
                    <span className={styles.bestBadge}>
                      {best.icon} Beste Option: {best.label}
                    </span>
                  ) : null}
                </div>

                <div className={styles.scoreGrid}>
                  {scores.map((item) => (
                    <article className={styles.scoreCard} key={item.id}>
                      <div className={styles.scoreTop}>
                        <span aria-hidden="true">{item.icon}</span>
                        <strong>{item.score}/100</strong>
                      </div>
                      <h4>{item.label}</h4>
                      <p>{item.verdict}</p>
                      <small className={styles.scoreReason}>{item.reason}</small>
                    </article>
                  ))}
                </div>

                <p className={styles.scoreNote}>
                  Der Index kombiniert Tageslicht, Temperatur, Regenrisiko, Niederschlag,
                  Wind, Böen, UV und vorhandene amtliche DWD-Warnungen. Er ist eine
                  Orientierung von förde.info und keine amtliche Bewertung.
                </p>
              </section>
            ) : null}

            {activityOffers.length ? (
              <section className={styles.offerSection} aria-label="Passende buchbare Aktivitäten">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className="foerde-kicker">Auf Basis der Live-Daten</span>
                    <h3>Jetzt passende Aktivitäten</h3>
                  </div>
                  <span className={styles.adLabel}>Werbung · Affiliate-Links</span>
                </div>

                <div className={styles.offerGrid}>
                  {activityOffers.map((offer) => (
                    <a
                      className={styles.offerCard}
                      href={offer.href}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      key={offer.id}
                    >
                      <span className={styles.offerIcon} aria-hidden="true">
                        {offer.icon}
                      </span>
                      <span>
                        <strong>{offer.title}</strong>
                        <small>{offer.detail}</small>
                      </span>
                      <b aria-hidden="true">↗</b>
                    </a>
                  ))}
                </div>

                <p className={styles.scoreNote}>
                  Die Auswahl berücksichtigt Wetter, Tageslicht, amtliche Warnungen und – falls
                  verfügbar – Wellenhöhe. Buchung, Preise und freie Plätze kommen von
                  GetYourGuide und werden dort aktuell angezeigt.
                </p>
              </section>
            ) : null}

            <section className="foerde-beaches" id="badestellen" aria-label="Badestellen an der Flensburger Förde">
              <div className="foerde-section-head">
                <h3>Badestellen an der Förde</h3>
                <a
                  href={
                    feed?.sources.bathing ??
                    "https://opendata.schleswig-holstein.de/collection/badegewasser-stammdaten/aktuell"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Amtliche Quelle ↗
                </a>
              </div>
              {beaches.length ? (
                <div className="foerde-beach-list">
                  {beaches.map((beach) => (
                    <div className="foerde-beach" key={beach.regionName + "-" + beach.name}>
                      <strong>{beach.name}</strong>
                      <span>
                        {beach.regionName}
                        {beach.quality
                          ? " · Einstufung " +
                            (beach.period ?? "") +
                            ": " +
                            beach.quality
                          : " · Keine Einstufung verfügbar"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="foerde-empty">
                  {error || feed
                    ? "Amtliche Badestellen derzeit nicht abrufbar."
                    : "Badestellen werden geladen."}
                </p>
              )}
              <small>
                Die Einstufung beschreibt die amtliche Badegewässerqualität. Sie ist keine
                aktuelle Messung der Wassertemperatur oder Strandauslastung.
              </small>
            </section>
          </div>
        </section>

        <section className="foerde-actions" aria-label="Praktische Informationen">
          <article>
            <span>🚶</span>
            <h2>Komm ich da durch?</h2>
            <p>Wege prüfen und Hindernisse in der Nachbarschaft melden.</p>
            <a href="/wege">Wegecheck öffnen →</a>
          </article>
          <article>
            <span>📅</span>
            <h2>Veranstaltungen</h2>
            <p>Termine mit Details, Originalquelle und iCal-Aktion.</p>
            <a href="/veranstaltungen">Termine ansehen →</a>
          </article>
        </section>

        <footer className="foerde-footer">
          <span>förde.info · ein privates, unabhängiges Angebot</span>
          <nav aria-label="Weitere Seiten">
            <a href="/gluecksburg#impressum">Impressum & Datenschutz</a>
            <a href="/gluecksburg">Glücksburg</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

// production-deploy-20260925-wege
