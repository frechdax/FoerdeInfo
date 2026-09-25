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

type RegionData = {
  id: RegionId;
  weather: Weather | null;
  beaches: Bathing[];
};

type Feed = {
  updatedAt: string;
  places: RegionData[];
  sources: { weather: string; bathing: string };
};

type ActivityScore = {
  id: "walk" | "bike" | "beach" | "indoor";
  label: string;
  icon: string;
  score: number;
  verdict: string;
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

function activityScores(weather: Weather): ActivityScore[] {
  const wet = weather.rainChance * 0.58 + Math.min(28, weather.precipitation * 16);
  const gust = Math.max(0, weather.windGusts - 35) * 0.75;

  const walk = clamp(
    100 -
      wet * 0.78 -
      Math.max(0, weather.windSpeed - 28) * 1.2 -
      gust -
      tempPenalty(weather.temperature, 16, 10) -
      Math.max(0, weather.uvIndex - 8) * 2 -
      (weather.isDay ? 0 : 30)
  );

  const bike = clamp(
    100 -
      wet -
      Math.max(0, weather.windSpeed - 18) * 2 -
      gust * 1.2 -
      tempPenalty(weather.temperature, 17, 9) -
      (weather.isDay ? 0 : 55)
  );

  const beach = clamp(
    100 -
      wet -
      Math.max(0, weather.windSpeed - 23) * 1.7 -
      gust -
      tempPenalty(weather.temperature, 22, 7) -
      Math.max(0, weather.uvIndex - 7) * 2.5 -
      (weather.isDay ? 0 : 85)
  );

  const bestOutdoor = Math.max(walk, bike, beach);
  const indoor = clamp(55 + Math.max(0, 65 - bestOutdoor) * 0.75);

  const result: ActivityScore[] = [
    { id: "walk", label: "Spaziergang", icon: "🚶", score: walk, verdict: verdict(walk, weather.isDay, "walk") },
    { id: "bike", label: "Fahrrad", icon: "🚲", score: bike, verdict: verdict(bike, weather.isDay, "bike") },
    { id: "beach", label: "Strand", icon: "🏖️", score: beach, verdict: verdict(beach, weather.isDay, "beach") },
    { id: "indoor", label: "Indoor", icon: "🏛️", score: indoor, verdict: verdict(indoor, true, "indoor") },
  ];

  return result.sort((a, b) => b.score - a.score);
}

function sourceTime(value: string | null | undefined) {
  if (!value) return null;
  const time = value.slice(11, 16);
  return /^\d{2}:\d{2}$/.test(time) ? time : null;
}

export default function HomePage() {
  const [selected, setSelected] = useState<RegionId>("flensburg");
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (regions.some((region) => region.id === hash)) {
      setSelected(hash as RegionId);
    }

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

  const region = regions.find((item) => item.id === selected)!;
  const live = feed?.places.find((item) => item.id === selected);

  const scores = useMemo(
    () => (live?.weather ? activityScores(live.weather) : []),
    [live?.weather]
  );
  const best = scores[0];

  const activityOffers = useMemo(() => {
    const weather = live?.weather;
    if (!weather || !affiliateLinks.activities.enabled) return [];

    const walk = scores.find((item) => item.id === "walk")?.score ?? 0;
    const beach = scores.find((item) => item.id === "beach")?.score ?? 0;

    const offers: Array<{
      id: string;
      icon: string;
      title: string;
      detail: string;
      href: string;
    }> = [];

    if (
      beach >= 68 &&
      weather.windSpeed >= 4 &&
      weather.windSpeed <= 28 &&
      weather.rainChance <= 35
    ) {
      offers.push({
        id: "sailing",
        icon: "⛵",
        title: "Segeltörn auf der Flensburger Förde",
        detail: `Passt zu den aktuellen Bedingungen: Strand ${beach}/100 · Wind ${Math.round(weather.windSpeed)} km/h.`,
        href: affiliateLinks.activities.offers.sailing,
      });
    }

    if (beach >= 72 && weather.windSpeed <= 22 && weather.rainChance <= 30) {
      offers.push({
        id: "eboat",
        icon: "🚤",
        title: "E-Boot auf der Förde",
        detail: `Ruhigeres Wetter: Strand ${beach}/100 · Regenrisiko ${Math.round(weather.rainChance)} %.`,
        href: affiliateLinks.activities.offers.eBoat,
      });
    }

    if (walk >= 65 && weather.rainChance <= 40) {
      offers.push({
        id: "running",
        icon: "🏃",
        title: "Running- & Sightseeing-Tour in Flensburg",
        detail: `Draußen gerade gut machbar: Spaziergang ${walk}/100 · gefühlt ${Math.round(weather.apparentTemperature)} °C.`,
        href: affiliateLinks.activities.offers.runningTour,
      });
    }

    if (!offers.length) {
      offers.push({
        id: "browse",
        icon: best?.id === "indoor" ? "☔" : "🧭",
        title:
          best?.id === "indoor"
            ? "Indoor- und Schietwetter-Ideen ansehen"
            : "Aktivitäten an der Förde ansehen",
        detail:
          "GetYourGuide zeigt verfügbare Aktivitäten und Preise auf der Anbieterseite.",
        href: affiliateLinks.activities.url,
      });
    }

    return offers.slice(0, 2);
  }, [live?.weather, scores, best?.id]);

  return (
    <main className="foerde-page" id="content">
      <div className="foerde-shell">
        <header className="foerde-header">
          <a href="/" className="foerde-brand" aria-label="Förde.info Startseite">
            ⚓ <strong>förde.info</strong>
          </a>
          <nav aria-label="Bereiche">
            <a href="#orte">Orte</a>
            <a href="/wege">Wegecheck</a>
            <a href="/live">Live</a>
            <a href="/veranstaltungen">Veranstaltungen</a>
            <a href="/urlaub">Entdecken</a>
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

        <section className="foerde-live" id="orte" aria-label="Ort auswählen und aktuelle Daten ansehen">
          <div className="foerde-tabs" role="group" aria-label="Ort auswählen">
            {regions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selected === item.id ? "active" : ""}
                aria-pressed={selected === item.id}
                onClick={() => {
                  setSelected(item.id);
                  window.history.replaceState(null, "", `#${item.id}`);
                }}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="foerde-location">
            <div className="foerde-location-head">
              <div>
                <span className="foerde-kicker">Dein Ort</span>
                <h2>{region.name}</h2>
                <p>{region.detail}</p>
              </div>
              <a href={`/orte/${region.id}`} className="foerde-detail-link">
                Ort entdecken ↗
              </a>
            </div>

            <div className="foerde-stat-grid" aria-live="polite">
              <article className="foerde-stat">
                <span>🌤️ Wetter</span>
                <strong>
                  {live?.weather ? `${Math.round(live.weather.temperature)} °C` : "—"}
                </strong>
                <p>
                  {live?.weather
                    ? `${weatherLabel(live.weather.weatherCode)} · gefühlt ${Math.round(
                        live.weather.apparentTemperature
                      )} °C · Wind ${Math.round(live.weather.windSpeed)} km/h${
                        sourceTime(live.weather.observedAt)
                          ? ` · Stand ${sourceTime(live.weather.observedAt)} Uhr`
                          : ""
                      }`
                    : error || feed
                      ? "Wetterdaten momentan nicht erreichbar"
                      : "Wetterdaten werden geladen"}
                </p>
              </article>
              <article className="foerde-stat">
                <span>🌧️ Regenrisiko · nächste 3 Stunden</span>
                <strong>
                  {live?.weather ? `${Math.round(live.weather.rainChance)} %` : "—"}
                </strong>
                <p>
                  {live?.weather
                    ? `Böen ${Math.round(live.weather.windGusts)} km/h · UV max. ${live.weather.uvIndex.toFixed(
                        1
                      )}`
                    : `Prognose von Open-Meteo für ${region.name}`}
                </p>
              </article>
            </div>

            {live?.weather ? (
              <section className={styles.nowSection} aria-label="Was kann ich gerade machen?">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className="foerde-kicker">Entscheidung statt Rohdaten</span>
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
                    </article>
                  ))}
                </div>

                <p className={styles.scoreNote}>
                  Der Index kombiniert Tageslicht, Temperatur, Regenrisiko, Niederschlag,
                  Wind, Böen und UV. Er ist eine Orientierung von förde.info und keine
                  amtliche Bewertung.
                </p>
              </section>
            ) : null}

            {activityOffers.length ? (
              <section className={styles.offerSection} aria-label="Passende buchbare Aktivitäten">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className="foerde-kicker">Passend zu den Bedingungen</span>
                    <h3>Aktivitäten mit GetYourGuide</h3>
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
                  Preise und tatsächliche Verfügbarkeit kommen von GetYourGuide und werden
                  nach dem Öffnen der Anbieterseite angezeigt.
                </p>
              </section>
            ) : null}

            <section className="foerde-beaches" aria-label={`Badestellen bei ${region.name}`}>
              <div className="foerde-section-head">
                <h3>Badestellen</h3>
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
              {live?.beaches.length ? (
                <div className="foerde-beach-list">
                  {live.beaches.map((beach) => (
                    <div className="foerde-beach" key={beach.name}>
                      <strong>{beach.name}</strong>
                      <span>
                        {beach.quality
                          ? `Einstufung ${beach.period ?? ""}: ${beach.quality}`
                          : "Keine Einstufung verfügbar"}
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
          <article>
            <span>🏖️</span>
            <h2>Strände in {region.name}</h2>
            <p>Badestellen und veröffentlichte Einstufungen für deinen Ort ansehen.</p>
            <a href={`/orte/${region.id}`}>Ort entdecken →</a>
          </article>
          <article>
            <span>🧭</span>
            <h2>Freizeit & Urlaub</h2>
            <p>Ideen und Originalquellen für alle vier Orte an der Förde.</p>
            <a href="/urlaub">Region entdecken →</a>
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
