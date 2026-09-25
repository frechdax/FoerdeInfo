"use client";

import { useEffect, useState } from "react";
import { regions, type RegionId } from "@/lib/regions";

type Bathing = { name: string; quality: string | null; period: string | null };
type Weather = { temperature: number; weatherCode: number; windSpeed: number; rainChance: number; observedAt: string | null };
type RegionData = { id: RegionId; weather: Weather | null; beaches: Bathing[] };
type Feed = { updatedAt: string; places: RegionData[]; sources: { weather: string; bathing: string } };

function weatherLabel(code: number) {
  if (code === 0) return "Klar";
  if (code < 4) return "Bewölkt";
  if (code < 50) return "Nebel";
  if (code < 70) return "Regen oder Nieselregen";
  if (code < 90) return "Schnee oder Schauer";
  return "Gewitter möglich";
}

export default function HomePage() {
  const [selected, setSelected] = useState<RegionId>("flensburg");
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (regions.some((region) => region.id === hash)) setSelected(hash as RegionId);
    const controller = new AbortController();
    const refresh = () => fetch("/api/foerde", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Datenquelle nicht erreichbar"); return response.json(); })
      .then((value: Feed) => { setFeed(value); setError(false); })
      .catch((reason) => { if (reason.name !== "AbortError") setError(true); });
    refresh();
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  const region = regions.find((item) => item.id === selected)!;
  const live = feed?.places.find((item) => item.id === selected);

  return (
    <main className="foerde-page" id="content">
      <div className="foerde-shell">
        <header className="foerde-header">
          <a href="/" className="foerde-brand" aria-label="Förde.info Startseite">⚓ <strong>förde.info</strong></a>
          <nav aria-label="Bereiche">
            <a href="#orte">Orte</a><a href="/wege">Wegecheck</a><a href="/live">Live</a>
            <a href="/veranstaltungen">Veranstaltungen</a><a href="/urlaub">Entdecken</a>
            <a href="/gluecksburg#impressum">Impressum</a>
          </nav>
        </header>

        <section className="foerde-intro">
          <span className="foerde-kicker">Flensburger Förde · lokal und unabhängig</span>
          <h1>Was ist los an der Förde?</h1>
          <p>Flensburg, Wassersleben, Glücksburg und Langballig: Wetter vor Ort, Badegewässer und die richtigen Anlaufstellen für deinen Tag.</p>
        </section>

        <section className="foerde-live" id="orte" aria-label="Ort auswählen und aktuelle Daten ansehen">
          <div className="foerde-tabs" role="group" aria-label="Ort auswählen">
            {regions.map((item) => (
              <button key={item.id} type="button" className={selected === item.id ? "active" : ""}
                aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); window.history.replaceState(null, "", `#${item.id}`); }}>
                {item.name}
              </button>
            ))}
          </div>

          <div className="foerde-location">
            <div className="foerde-location-head">
              <div><span className="foerde-kicker">Dein Ort</span><h2>{region.name}</h2><p>{region.detail}</p></div>
              <a href={`/orte/${region.id}`} className="foerde-detail-link">Ort entdecken ↗</a>
            </div>
            <div className="foerde-stat-grid" aria-live="polite">
              <article className="foerde-stat">
                <span>🌤️ Wetter</span><strong>{live?.weather ? `${Math.round(live.weather.temperature)} °C` : "—"}</strong>
                <p>{live?.weather ? `${weatherLabel(live.weather.weatherCode)} · Wind ${Math.round(live.weather.windSpeed)} km/h${live.weather.observedAt ? ` · Stand ${live.weather.observedAt.slice(11, 16)} Uhr` : ""}` : error || feed ? "Wetterdaten momentan nicht erreichbar" : "Wetterdaten werden geladen"}</p>
              </article>
              <article className="foerde-stat">
                <span>🌧️ Regenrisiko · nächste 3 Stunden</span><strong>{live?.weather ? `${Math.round(live.weather.rainChance)} %` : "—"}</strong>
                <p>Prognose von Open-Meteo für {region.name}</p>
              </article>
            </div>
            <section className="foerde-beaches" aria-label={`Badestellen bei ${region.name}`}>
              <div className="foerde-section-head"><h3>Badestellen</h3><a href={feed?.sources.bathing ?? "https://opendata.schleswig-holstein.de/collection/badegewasser-stammdaten/aktuell"} target="_blank" rel="noopener noreferrer">Amtliche Quelle ↗</a></div>
              {live?.beaches.length ? (
                <div className="foerde-beach-list">{live.beaches.map((beach) => (
                  <div className="foerde-beach" key={beach.name}><strong>{beach.name}</strong><span>{beach.quality ? `Einstufung ${beach.period ?? ""}: ${beach.quality}` : "Keine Einstufung verfügbar"}</span></div>
                ))}</div>
              ) : <p className="foerde-empty">{error || feed ? "Amtliche Badestellen derzeit nicht abrufbar." : "Badestellen werden geladen."}</p>}
              <small>Die Einstufung beschreibt die amtliche Badegewässerqualität. Sie ist keine aktuelle Messung der Wassertemperatur oder Strandauslastung.</small>
            </section>
          </div>
        </section>

        <section className="foerde-actions" aria-label="Praktische Informationen">
          <article><span>🚶</span><h2>Komm ich da durch?</h2><p>Wege prüfen und Hindernisse in der Nachbarschaft melden.</p><a href="/wege">Wegecheck öffnen →</a></article>
          <article><span>📅</span><h2>Veranstaltungen</h2><p>Termine in der Region und Kalender der jeweiligen Veranstalter.</p><a href="/veranstaltungen">Termine ansehen →</a></article>
          <article><span>🏖️</span><h2>Strände in {region.name}</h2><p>Badestellen und veröffentlichte Einstufungen für deinen Ort ansehen.</p><a href={`/orte/${region.id}`}>Ort entdecken →</a></article>
          <article><span>🧭</span><h2>Freizeit & Urlaub</h2><p>Ideen und Originalquellen für alle vier Orte an der Förde.</p><a href="/urlaub">Region entdecken →</a></article>
        </section>

        <footer className="foerde-footer"><span>förde.info · ein privates, unabhängiges Angebot</span><nav aria-label="Weitere Seiten"><a href="/gluecksburg#impressum">Impressum & Datenschutz</a><a href="/gluecksburg">Glücksburg</a></nav></footer>
      </div>
    </main>
  );
}
