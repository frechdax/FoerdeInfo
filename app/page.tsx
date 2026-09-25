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

type LiveDataItem = {
  label: string;
  value: string;
  meta?: string;
};

type LiveDataModule = {
  status: "live" | "partial" | "unavailable";
  value: string;
  detail: string;
  updatedAt: string | null;
  source: string;
  sourceUrl: string;
  items?: LiveDataItem[];
};

type LiveDataFeed = {
  updatedAt: string;
  modules: {
    parking: LiveDataModule;
    visitors: LiveDataModule;
    charging: LiveDataModule;
    traffic: LiveDataModule;
    transit: LiveDataModule;
    sharing: LiveDataModule;
  };
};

type LiveRecommendationContext = {
  beachDelta: number;
  walkDelta: number;
  bikeDelta: number;
  beachFact: string | null;
  trafficFact: string | null;
  activeFactors: number;
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
  marine: Marine | null,
  live: LiveRecommendationContext | null = null
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
      (weather.isDay ? 0 : 30) +
      (live?.walkDelta ?? 0)
  );

  const bike = clamp(
    100 -
      wet -
      Math.max(0, weather.windSpeed - 18) * 2 -
      gust * 1.2 -
      tempPenalty(weather.temperature, 17, 9) -
      warningPenalty -
      (weather.isDay ? 0 : 55) +
      (live?.bikeDelta ?? 0)
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
      (weather.isDay ? 0 : 85) +
      (weather.isDay ? live?.beachDelta ?? 0 : 0)
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
      reason:\n        `${Math.round(weather.rainChance)} % Regen · gefühlt ${Math.round(weather.apparentTemperature)} °C` +\n        (live?.trafficFact ? " · " + live.trafficFact : ""),
    },
    {
      id: "bike",
      label: "Fahrrad",
      icon: "🚲",
      score: bike,
      verdict: verdict(bike, weather.isDay, "bike"),
      reason:\n        `Wind ${Math.round(weather.windSpeed)} · Böen ${Math.round(weather.windGusts)} km/h` +\n        (live?.trafficFact ? " · " + live.trafficFact : ""),
    },
    {
      id: "beach",
      label: "Strand & Wasser",
      icon: "🏖️",
      score: beach,
      verdict: verdict(beach, weather.isDay, "beach"),
      reason:
        (marine?.waveHeight != null
          ? `Welle ${marine.waveHeight.toFixed(1)} m · Wind ${Math.round(weather.windSpeed)} km/h`
          : `${Math.round(weather.rainChance)} % Regen · Wind ${Math.round(weather.windSpeed)} km/h`) +
        (live?.beachFact ? " · " + live.beachFact : ""),
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

function numberFrom(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function isFreshLiveModule(module: LiveDataModule | undefined, maxAgeMinutes = 10) {
  if (!module || module.status !== "live" || !module.updatedAt) return false;
  const age = Date.now() - new Date(module.updatedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMinutes * 60_000;
}

function buildLiveRecommendationContext(
  liveData: LiveDataFeed | null
): LiveRecommendationContext | null {
  if (!liveData) return null;

  let beachDelta = 0;
  let walkDelta = 0;
  let bikeDelta = 0;
  let beachFact: string | null = null;
  let trafficFact: string | null = null;
  let activeFactors = 0;

  const parking = liveData.modules.parking;
  if (isFreshLiveModule(parking)) {
    const solituede = parking.items?.find((item) =>
      item.label.toLocaleLowerCase("de").includes("solitüde")
    );
    if (solituede) {
      const free = numberFrom(solituede.value, /(\\d+)\\s*frei/i);
      const occupiedPercent = numberFrom(solituede.value, /(\\d+)\\s*%/i);
      if (free !== null || occupiedPercent !== null) {
        activeFactors += 1;
        if (occupiedPercent !== null) {
          if (occupiedPercent <= 45) beachDelta += 6;
          else if (occupiedPercent >= 90) beachDelta -= 10;
          else if (occupiedPercent >= 75) beachDelta -= 5;
        }
        if (free !== null) {
          if (free >= 20) beachDelta += 4;
          else if (free <= 5) beachDelta -= 5;
          beachFact = "Solitüde " + Math.round(free) + " Parkplätze frei";
        }
      }
    }
  }

  const visitors = liveData.modules.visitors;
  if (isFreshLiveModule(visitors)) {
    const solituede = visitors.items?.find((item) =>
      item.label.toLocaleLowerCase("de").includes("solitüde")
    );
    if (solituede) {
      const current = numberFrom(solituede.value, /(\\d+)\\s*aktuell/i);
      const today = numberFrom(solituede.meta ?? "", /Heute bisher\\s*(\\d+)/i);
      // 0/0 may also mean that the counter is inactive. Display it, but do not score it.
      if (current !== null && ((today ?? 0) > 0 || current > 0)) {
        activeFactors += 1;
        if (current <= 15) beachDelta += 5;
        else if (current <= 35) beachDelta += 2;
        else if (current >= 80) beachDelta -= 8;
        else if (current >= 50) beachDelta -= 4;
        beachFact =
          (beachFact ? beachFact + " · " : "") +
          (current <= 15
            ? "Besucheraufkommen ruhig"
            : current >= 50
              ? "Besucheraufkommen erhöht"
              : "Besucheraufkommen normal");
      }
    }
  }

  const traffic = liveData.modules.traffic;
  if (isFreshLiveModule(traffic, 15)) {
    const activeReports = numberFrom(traffic.value, /^(\\d+)\\s+aktive/i);
    if (activeReports !== null && activeReports > 0) {
      activeFactors += 1;
      const penalty = Math.min(8, activeReports * 2);
      walkDelta -= penalty;
      bikeDelta -= penalty;
      trafficFact = activeReports + " Wege-Meldung" + (activeReports === 1 ? "" : "en");
    }
  }

  if (!activeFactors) return null;
  return { beachDelta, walkDelta, bikeDelta, beachFact, trafficFact, activeFactors };
}

function stableLiveSignals(liveData: LiveDataFeed | null) {
  if (!liveData) return [];

  const definitions: Array<{
    key: keyof LiveDataFeed["modules"];
    icon: string;
    label: string;
    maxAge: number;
    requireItems?: boolean;
  }> = [
    { key: "parking", icon: "🚗", label: "Parken", maxAge: 10, requireItems: true },
    { key: "visitors", icon: "👥", label: "Besucher", maxAge: 10, requireItems: true },
    { key: "traffic", icon: "🚦", label: "Wege & Verkehr", maxAge: 15 },
    { key: "transit", icon: "🚌", label: "ÖPNV", maxAge: 10, requireItems: true },
    { key: "sharing", icon: "🚲", label: "Sharing", maxAge: 10, requireItems: true },
  ];

  return definitions.flatMap((definition) => {
    const module = liveData.modules[definition.key];
    if (!isFreshLiveModule(module, definition.maxAge)) return [];
    if (definition.requireItems && !module.items?.length) return [];
    return [{
      key: definition.key,
      icon: definition.icon,
      label: definition.label,
      value: module.value,
      detail: module.items?.[0]
        ? module.items[0].label + " · " + module.items[0].value
        : module.detail,
      updatedAt: module.updatedAt,
    }];
  });
}
function sourceTime(value: string | null | undefined) {
  if (!value) return null;
  const time = value.slice(11, 16);
  return /^\d{2}:\d{2}$/.test(time) ? time : null;
}

function strandampelStatus(
  quality: string | null,
  weather: Weather | null,
  warningLevel: number,
  marine: Marine | null
) {
  if (!weather) {
    return {
      tone: "neutral" as const,
      label: "Keine Live-Lage",
      reason: "Aktuelle Wetterdaten fehlen",
    };
  }

  const beachScore =
    activityScores(weather, warningLevel, marine).find((item) => item.id === "beach")
      ?.score ?? 0;
  const normalizedQuality = (quality ?? "").toLocaleLowerCase("de");

  if (
    normalizedQuality.includes("mangelhaft") ||
    warningLevel >= 3 ||
    beachScore < 40
  ) {
    return {
      tone: "red" as const,
      label: "Rot",
      reason:
        normalizedQuality.includes("mangelhaft")
          ? "Amtliche Einstufung mangelhaft"
          : warningLevel >= 3
            ? "Deutliche amtliche Wetterwarnung"
            : "Aktuelle Strandbedingungen eher ungeeignet",
    };
  }

  if (
    !quality ||
    normalizedQuality.includes("ausreichend") ||
    warningLevel >= 1 ||
    beachScore < 70
  ) {
    return {
      tone: "yellow" as const,
      label: "Gelb",
      reason: !quality
        ? "Keine veröffentlichte Einstufung verfügbar"
        : warningLevel >= 1
          ? "Amtliche Wetterwarnung vorhanden"
          : "Bedingungen nur eingeschränkt passend",
    };
  }

  return {
    tone: "green" as const,
    label: "Grün",
    reason: "Gute aktuelle Bedingungen und positive veröffentlichte Einstufung",
  };
}

export default function HomePage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [liveData, setLiveData] = useState<LiveDataFeed | null>(null);
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

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () =>
      fetch("/api/live-daten?ort=flensburg", { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Live-Daten nicht erreichbar");
          return response.json();
        })
        .then((value: LiveDataFeed) => setLiveData(value))
        .catch((reason) => {
          if (reason.name !== "AbortError") setLiveData(null);
        });

    refresh();
    const timer = window.setInterval(refresh, 2 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  const liveRecommendation = useMemo(
    () => buildLiveRecommendationContext(liveData),
    [liveData]
  );

  const liveSignals = useMemo(() => stableLiveSignals(liveData), [liveData]);

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
        const placeWarningLevel = (place.warnings ?? []).reduce(
          (max, warning) => Math.max(max, Number(warning.level) || 0),
          0
        );

        return place.beaches.map((beach) => ({
          ...beach,
          regionName,
          status: strandampelStatus(
            beach.quality,
            place.weather,
            placeWarningLevel,
            feed?.marine ?? null
          ),
        }));
      }),
    [feed]
  );

  const scores = useMemo(
    () =>
      regionalWeather
        ? activityScores(
            regionalWeather,
            warningLevel,
            feed?.marine ?? null,
            liveRecommendation
          )
        : [],
    [regionalWeather, warningLevel, feed?.marine, liveRecommendation]
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

            {liveSignals.length ? (
              <section className={styles.liveSignalSection} aria-label="Stabile Live-Signale">
                <div className={styles.liveSignalHeading}>
                  <div>
                    <span className="foerde-kicker">Stabile Live-Quellen</span>
                    <h3>Was gerade zusätzlich einfließt</h3>
                  </div>
                  <a href="/live-daten">Alle Live-Daten →</a>
                </div>
                <div className={styles.liveSignalGrid}>
                  {liveSignals.slice(0, 4).map((signal) => (
                    <article className={styles.liveSignalCard} key={signal.key}>
                      <div className={styles.liveSignalTop}>
                        <span aria-hidden="true">{signal.icon}</span>
                        <b>LIVE</b>
                      </div>
                      <strong>{signal.label}</strong>
                      <span>{signal.value}</span>
                      <small>{signal.detail}</small>
                    </article>
                  ))}
                </div>
                <p className={styles.liveSignalNote}>
                  Nur Quellen mit Live-Status und frischem Zeitstempel werden übernommen.
                  Fällt eine Quelle aus oder ist sie zu alt, verschwindet sie hier und hat
                  keinen Einfluss auf die Empfehlungen.
                </p>
              </section>
            ) : null}

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
                  Wind, Böen, UV und vorhandene amtliche DWD-Warnungen. Verfügbare frische
                  Live-Signale wie Parkplatzbelegung, Besucheraufkommen oder Wege-Meldungen
                  fließen mit begrenztem Gewicht ein. Fehlende Live-Daten werden nicht
                  geschätzt und verändern den Score nicht. Er ist eine Orientierung von
                  förde.info und keine amtliche Bewertung.
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
                  Die Auswahl berücksichtigt Wetter, Tageslicht, amtliche Warnungen,
                  Wellenhöhe und – nur wenn frisch verfügbar – stabile Live-Signale aus
                  Parken, Besucheraufkommen und Wege-Meldungen. Ausgefallene Quellen werden
                  nicht ersetzt oder geschätzt. Buchung, Preise und freie Plätze kommen von
                  GetYourGuide und werden dort aktuell angezeigt.
                </p>
              </section>
            ) : null}

            <section className="foerde-beaches" id="badestellen" aria-label="Strandampel an der Flensburger Förde">
              <div className="foerde-section-head">
                <div>
                  <span className="foerde-kicker">Aktuelle Lage + amtliche Einstufung</span>
                  <h3>Strandampel</h3>
                </div>
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
                    <div
                      className={
                        "foerde-beach " +
                        (beach.status.tone === "green"
                          ? styles.beachGreen
                          : beach.status.tone === "yellow"
                            ? styles.beachYellow
                            : beach.status.tone === "red"
                              ? styles.beachRed
                              : styles.beachNeutral)
                      }
                      key={beach.regionName + "-" + beach.name}
                    >
                      <div className={styles.beachCardHead}>
                        <strong>{beach.name}</strong>
                        <span
                          className={
                            styles.beachStatus +
                            " " +
                            (beach.status.tone === "green"
                              ? styles.beachStatusGreen
                              : beach.status.tone === "yellow"
                                ? styles.beachStatusYellow
                                : beach.status.tone === "red"
                                  ? styles.beachStatusRed
                                  : styles.beachStatusNeutral)
                          }
                        >
                          <i aria-hidden="true" />
                          {beach.status.label}
                        </span>
                      </div>
                      <span>
                        {beach.regionName}
                        {beach.quality
                          ? " · Einstufung " +
                            (beach.period ?? "") +
                            ": " +
                            beach.quality
                          : " · Keine Einstufung verfügbar"}
                      </span>
                      <small className={styles.beachReason}>{beach.status.reason}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="foerde-empty">
                  {error || feed
                    ? "Strandampel derzeit nicht abrufbar."
                    : "Strandampel wird geladen."}
                </p>
              )}
              <small>
                Die Strandampel ist eine Orientierung von förde.info aus aktueller Wetterlage,
                Tageslicht, DWD-Warnungen, Fördebedingungen und veröffentlichter amtlicher
                Badegewässer-Einstufung. Sie ist keine amtliche Freigabe, keine Live-Messung
                der Wasserqualität und keine Aussage zur Strandauslastung.
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
