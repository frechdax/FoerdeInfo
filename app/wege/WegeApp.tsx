"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { inArea, pointToRouteMeters, type Point, type WayMode, type WayReport } from "@/lib/wege";
import { affiliateLinks } from "@/lib/affiliate";
import liveStyles from "../live/live.module.css";
import styles from "./wege.module.css";

const WegeMap = dynamic(() => import("./WegeMap"), { ssr: false, loading: () => <div className={styles.mapLoading}>Karte lädt …</div> });

type Vote = { still: number; clear: number };
type Route = { coordinates: [number, number][]; distance: number; duration: number; message: string | null };
type LiveScore = {
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
type LiveData = {
  generatedAt: string;
  weather: {
    windSpeed: number;
    rainProbability3h: number;
    uvIndex: number;
  };
  scores: LiveScore[];
  bestTimes: BestTime[];
  pegel: null | {
    trend: "steigend" | "fallend" | "stabil";
  };
  warnings: Array<{ headline: string; level: number }>;
};
type Match = Point & { label: string };

const kinds: Record<WayReport["kind"], string> = {
  blocked: "Weg gesperrt", construction: "Baustelle", surface: "Schlechter Untergrund", flooding: "Wasser auf dem Weg", other: "Anderes Hindernis",
};
const modes: { id: WayMode; label: string }[] = [
  { id: "walk", label: "Zu Fuß" }, { id: "stroller", label: "Kinderwagen" },
  { id: "bike", label: "Fahrrad" }, { id: "wheelchair", label: "Rollstuhl" },
];

function time(value: string) {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

async function imageData(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 8_000_000) throw new Error("Bitte ein Bild mit maximal 8 MB wählen.");
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  for (const quality of [.7, .5, .35]) {
    const data = canvas.toDataURL("image/jpeg", quality);
    if (data.length <= 140000) return data;
  }
  throw new Error("Das Foto ist zu groß. Bitte einen kleineren Ausschnitt wählen.");
}

export default function WegeApp() {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [matches, setMatches] = useState<{ for: "start" | "end"; entries: Match[] } | null>(null);
  const [mode, setMode] = useState<WayMode>("walk");
  const [pick, setPick] = useState<"start" | "end" | "report" | null>(null);
  const [reportPoint, setReportPoint] = useState<Point | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [reports, setReports] = useState<WayReport[]>([]);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [kind, setKind] = useState<WayReport["kind"]>("blocked");
  const [reportMode, setReportMode] = useState<WayReport["mode"]>("all");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/wege/reports", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setReports(result.reports || []);
      setVotes(result.votes || {});
      setUpdatedAt(result.updatedAt);
    } catch { setMessage("Meldungen sind vorübergehend nicht abrufbar."); }
  }, []);

  useEffect(() => {
    reload();
    const poll = window.setInterval(reload, 30_000);
    const fetchLiveData = () =>
      fetch("/api/live", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((value) => setLiveData(value as LiveData | null))
        .catch(() => {});
    fetchLiveData();
    const livePoll = window.setInterval(fetchLiveData, 300_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(livePoll);
    };
  }, [reload]);

  const visible = reports;
  const relevant = useMemo(() => visible.filter(r => (r.mode === "all" || r.mode === mode) && (!route || pointToRouteMeters({ lat: r.latitude, lon: r.longitude }, route.coordinates) <= 40)), [visible, mode, route]);

  function setPoint(position: "start" | "end", point: Point, label: string) {
    if (position === "start") { setStart(point); setStartText(label); }
    else { setEnd(point); setEndText(label); }
    setRoute(null);
    setMatches(null);
    setPick(null);
    setMessage("");
  }

  function useLocation() {
    if (!navigator.geolocation) { setMessage("Standortbestimmung ist in diesem Browser nicht verfügbar."); return; }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      setGeoBusy(false);
      const point = { lat: position.coords.latitude, lon: position.coords.longitude };
      if (!inArea(point)) { setMessage("Dein Standort liegt außerhalb der Flensburger Förde."); return; }
      setPoint("start", point, "Mein Standort");
    }, () => { setGeoBusy(false); setMessage("Standort nicht verfügbar. Du kannst den Start auf der Karte setzen."); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30_000 });
  }

  async function search(position: "start" | "end") {
    const query = (position === "start" ? startText : endText).trim();
    if (query.length < 3) { setMessage("Bitte mindestens drei Zeichen eingeben."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/wege/geocode?q=${encodeURIComponent(query)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!result.matches.length) throw new Error("Keinen passenden Ort gefunden. Du kannst ihn auf der Karte setzen.");
      if (result.matches.length === 1) setPoint(position, result.matches[0], result.matches[0].label);
      else setMatches({ for: position, entries: result.matches });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Suche nicht erreichbar."); }
    finally { setBusy(false); }
  }

  async function calculate() {
    if (!start || !end) { setMessage("Bitte Start und Ziel auf der Karte setzen oder als Ort suchen."); return; }
    setBusy(true); setMessage(""); setRoute(null);
    try {
      const query = new URLSearchParams({ slat: String(start.lat), slon: String(start.lon), elat: String(end.lat), elon: String(end.lon), mode });
      const response = await fetch(`/api/wege/route?${query}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRoute(result);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Route nicht erreichbar."); }
    finally { setBusy(false); }
  }

  async function sendReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportPoint) { setMessage("Bitte die Stelle zuerst auf der Karte setzen."); return; }
    setBusy(true); setMessage("");
    try {
      const photo_data = photo ? await imageData(photo) : null;
      const response = await fetch("/api/wege/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: reportPoint.lat, longitude: reportPoint.lon, kind, mode: reportMode, description, photo_data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReportPoint(null); setDescription(""); setPhoto(null); setPick(null);
      setMessage("Danke! Deine Meldung ist jetzt sichtbar und läuft nach 48 Stunden ab.");
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Meldung nicht möglich."); }
    finally { setBusy(false); }
  }

  async function vote(id: string, verdict: "still" | "clear") {
    let viewerId = localStorage.getItem("foerde-wege-visitor");
    if (!viewerId) { viewerId = crypto.randomUUID(); localStorage.setItem("foerde-wege-visitor", viewerId); }
    try {
      const response = await fetch(`/api/wege/reports/${id}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ viewerId, verdict }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Danke für die Bestätigung.");
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Bestätigung nicht möglich."); }
  }

  function mapClick(point: Point) {
    if (!inArea(point)) { setMessage("Bitte eine Stelle in der Förderegion auswählen."); return; }
    if (pick === "start" || pick === "end") setPoint(pick, point, "Punkt auf Karte");
    if (pick === "report") { setReportPoint(point); setPick(null); setMessage(""); }
  }

  const bestScore =
    liveData?.scores?.length
      ? liveData.scores.reduce((best, current) =>
          current.score > best.score ? current : best
        )
      : null;
  const beachScore =
    liveData?.scores.find((item) => item.id === "beach")?.score ?? 0;
  const walkScore =
    liveData?.scores.find((item) => item.id === "walk")?.score ?? 0;
  const bikeScore =
    liveData?.scores.find((item) => item.id === "bike")?.score ?? 0;
  const outdoorGood = beachScore >= 65 || walkScore >= 72 || bikeScore >= 72;

  const dynamicOffers = liveData
    ? [
        ...(affiliateLinks.activities.enabled &&
        beachScore >= 72 &&
        liveData.weather.windSpeed <= 28
          ? [
              {
                id: "sailing",
                icon: "⛵",
                badge: "Werbung · Affiliate-Link",
                title: "Segeltörn auf der Flensburger Förde",
                description:
                  "Passt heute besonders gut: Strand-Index " +
                  beachScore +
                  "/100 · Wind " +
                  Math.round(liveData.weather.windSpeed) +
                  " km/h.",
                href: affiliateLinks.activities.offers.sailing,
                affiliate: true,
              },
            ]
          : []),
        ...(affiliateLinks.activities.enabled &&
        beachScore >= 75 &&
        liveData.weather.windSpeed <= 22
          ? [
              {
                id: "e-boat",
                icon: "🚤",
                badge: "Werbung · Affiliate-Link",
                title: "E-Boot auf der Flensburger Förde mieten",
                description:
                  "Sehr passend für ruhiges Fördewetter: Strand-Index " +
                  beachScore +
                  "/100 · Wind " +
                  Math.round(liveData.weather.windSpeed) +
                  " km/h.",
                href: affiliateLinks.activities.offers.eBoat,
                affiliate: true,
              },
            ]
          : []),
        ...(affiliateLinks.activities.enabled &&
        walkScore >= 72 &&
        liveData.weather.rainProbability3h <= 35
          ? [
              {
                id: "running-tour",
                icon: "🏃",
                badge: "Werbung · Affiliate-Link",
                title: "Running- & Sightseeing-Tour durch Flensburg",
                description:
                  "Gute Bedingungen für eine aktive Stadttour: Spaziergang " +
                  walkScore +
                  "/100 · Regenrisiko " +
                  Math.round(liveData.weather.rainProbability3h) +
                  " %.",
                href: affiliateLinks.activities.offers.runningTour,
                affiliate: true,
              },
            ]
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
    affiliate: false,
  };

  const recommendedOffers = dynamicOffers.length ? dynamicOffers : [fallbackOffer];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a href="/" className={styles.brand}>⚓ <strong>förde.info</strong></a>
          <nav aria-label="Navigation"><a href="/">Startseite</a><a href="/live">Live</a><a href="/veranstaltungen">Veranstaltungen</a></nav>
        </header>
        <div className={styles.title}><div><span className={styles.eyebrow}>Flensburg · Wassersleben · Glücksburg · Langballig</span><h1>Komm ich da durch?</h1><p>Prüfe deinen Weg und sieh, was andere vor Ort gemeldet haben.</p></div><span className={styles.liveBadge}>Wegecheck</span></div>
        <div className={styles.workspace}>
          <section className={styles.controls} aria-label="Route prüfen">
            <h2>Dein Weg</h2>
            <div className={styles.field}><label htmlFor="way-start">Start</label><div className={styles.inputRow}><input id="way-start" value={startText} placeholder="Adresse oder Ort" onChange={e => { setStartText(e.target.value); setStart(null); setRoute(null); }} onKeyDown={e => { if (e.key === "Enter") search("start"); }} /><button type="button" onClick={() => search("start")} disabled={busy}>Suchen</button></div><div className={styles.minorActions}><button type="button" onClick={useLocation} disabled={geoBusy}>{geoBusy ? "Standort wird ermittelt …" : "◎ Meinen Standort verwenden"}</button><button type="button" onClick={() => { setPick("start"); setMessage("Tippe auf der Karte auf deinen Startpunkt."); }}>Auf Karte setzen</button></div></div>
            <div className={styles.field}><label htmlFor="way-end">Ziel</label><div className={styles.inputRow}><input id="way-end" value={endText} placeholder="Adresse oder Ort" onChange={e => { setEndText(e.target.value); setEnd(null); setRoute(null); }} onKeyDown={e => { if (e.key === "Enter") search("end"); }} /><button type="button" onClick={() => search("end")} disabled={busy}>Suchen</button></div><div className={styles.minorActions}><button type="button" onClick={() => { setPick("end"); setMessage("Tippe auf der Karte auf dein Ziel."); }}>Auf Karte setzen</button></div></div>
            {matches && <div className={styles.matches}><strong>Ort auswählen</strong>{matches.entries.map((m, i) => <button key={i} type="button" onClick={() => setPoint(matches.for, m, m.label)}>{m.label}</button>)}</div>}
            <fieldset className={styles.modes}><legend>Unterwegs mit</legend><div>{modes.map(item => <label key={item.id} className={mode === item.id ? styles.selected : ""}><input type="radio" name="routeMode" value={item.id} checked={mode === item.id} onChange={() => { setMode(item.id); setRoute(null); }} />{item.label}</label>)}</div></fieldset>
            <button type="button" className={styles.primary} onClick={calculate} disabled={busy}>{busy ? "Bitte warten …" : "Weg prüfen →"}</button>
            {route && <div className={styles.result} role="status"><strong>{(route.distance / 1000).toFixed(1).replace(".", ",")} km · ca. {Math.round(route.duration / 60)} Min.</strong><span>{relevant.length ? `${relevant.length} ${relevant.length === 1 ? "Meldung" : "Meldungen"} innerhalb von 40 m der Route` : "Keine aktiven Meldungen nahe dieser Route"}</span>{route.message && <small>{route.message}</small>}<small>Nur bekannte Meldungen. Eine freie oder barrierefreie Passage ist nicht garantiert.</small></div>}
            <button type="button" className={styles.reportButton} onClick={() => { setPick("report"); setReportPoint(null); setMessage("Tippe auf der Karte auf die betroffene Stelle."); }}>＋ Hindernis melden</button>
          </section>
          <section className={styles.mapPanel} aria-label="Karte"><div className={styles.mapHeader}><span>{pick ? `Karte antippen: ${pick === "report" ? "Hindernis" : pick === "start" ? "Startpunkt" : "Ziel"}` : "Karte der Förderegion"}</span><span>{updatedAt ? `Meldungen: ${time(updatedAt)}` : "Meldungen laden …"}</span></div><WegeMap start={start} end={end} reportPoint={reportPoint} reports={visible} route={route?.coordinates || null} onPick={mapClick} onSelect={setSelectedId} selectedId={selectedId} /></section>
        </div>

        {reportPoint && <section className={styles.formPanel} aria-label="Hindernis melden"><div><span className={styles.eyebrow}>Stelle ausgewählt</span><h2>Was ist dort los?</h2><p>Deine Beobachtung erscheint öffentlich. Bitte keine Personen oder Kennzeichen fotografieren.</p></div><form onSubmit={sendReport}><div className={styles.formGrid}><label>Art<select value={kind} onChange={e => setKind(e.target.value as WayReport["kind"])}>{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Betroffen<select value={reportMode} onChange={e => setReportMode(e.target.value as WayReport["mode"])}><option value="all">Alle</option>{modes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div><label>Kurze Beschreibung<textarea required minLength={8} maxLength={280} value={description} onChange={e => setDescription(e.target.value)} placeholder="z. B. Gehweg komplett gesperrt, Umweg über …" /></label><label>Foto (freiwillig, bis 8 MB)<input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} /></label><input name="website" className={styles.honey} tabIndex={-1} autoComplete="off" aria-hidden="true" /><div className={styles.formActions}><button type="submit" className={styles.primary} disabled={busy}>Meldung veröffentlichen</button><button type="button" onClick={() => setReportPoint(null)}>Abbrechen</button></div><small>Ohne Anmeldung · sichtbar bis zu 48 Stunden · von Nutzern gemeldet und nicht amtlich geprüft</small></form></section>}
        {message && <div className={styles.notice} role="status">{message}<button type="button" onClick={() => setMessage("")} aria-label="Meldung schließen">×</button></div>}

        <section className={styles.list} aria-label="Aktuelle Hindernisse"><div className={styles.listTitle}><div><span className={styles.eyebrow}>Aus der Nachbarschaft</span><h2>{route ? "Meldungen an deinem Weg" : "Aktuelle Meldungen"}</h2></div><span>{relevant.length} {relevant.length === 1 ? "Stelle" : "Stellen"}</span></div>{relevant.length ? <div className={styles.reportGrid}>{relevant.map(r => <article key={r.id} className={`${styles.reportCard} ${selectedId === r.id ? styles.reportSelected : ""}`}><div className={styles.reportTop}><span>{kinds[r.kind]}</span><small>{time(r.created_at)} Uhr</small></div><p>{r.description}</p>{(votes[r.id]?.clear || 0) >= 2 && <small>Mehrfach als wieder frei gemeldet – bitte vor Ort prüfen.</small>}{r.photo_data && <a href={r.photo_data} target="_blank" rel="noopener noreferrer" aria-label="Foto der gemeldeten Stelle öffnen"><img src={r.photo_data} alt="Von Nutzern hochgeladenes Foto der gemeldeten Stelle" className={styles.reportPhoto} /></a>}<small>Betroffen: {r.mode === "all" ? "alle" : modes.find(m => m.id === r.mode)?.label} · läuft ab {time(r.expires_at)} Uhr</small><div className={styles.voteActions}><button type="button" onClick={() => vote(r.id, "still")}>Noch da {votes[r.id]?.still ? `(${votes[r.id].still})` : ""}</button><button type="button" onClick={() => vote(r.id, "clear")}>Wieder frei {votes[r.id]?.clear ? `(${votes[r.id].clear})` : ""}</button><button type="button" onClick={() => setSelectedId(r.id)}>Auf Karte</button></div></article>)}</div> : <p className={styles.empty}>{route ? "Für diese Route liegen derzeit keine aktiven Meldungen vor. Das bedeutet nicht, dass jeder Abschnitt frei ist." : "Zurzeit sind keine aktiven Hindernisse gemeldet. Du kannst eine Stelle auf der Karte hinzufügen."}</p>}<small>Bestätigungen ergänzen die Meldung, geben den Weg aber nicht verbindlich frei. Alle Meldungen sind unbestätigte Beobachtungen und verschwinden spätestens nach 48 Stunden.</small></section>

        {liveData && bestScore ? (
          <section className={liveStyles.nowSummary} aria-label="Beste Option gerade">
            <div className={liveStyles.summaryLead}>
              <span className={liveStyles.summaryIcon} aria-hidden="true">
                {bestScore.icon}
              </span>
              <span>
                <small>Beste Option gerade</small>
                <strong>{bestScore.label} · {bestScore.score}/100</strong>
              </span>
            </div>
            <div className={liveStyles.summaryFacts}>
              <span>🌧️ 3 h: <strong>{Math.round(liveData.weather.rainProbability3h)} %</strong></span>
              <span>💨 Wind: <strong>{Math.round(liveData.weather.windSpeed)} km/h</strong></span>
              <span>☀️ UV: <strong>{liveData.weather.uvIndex.toFixed(1)}</strong></span>
              <span>
                {liveData.warnings.length ? "⚠️" : "✓"} Warnungen:{" "}
                <strong>{liveData.warnings.length ? liveData.warnings.length : "keine"}</strong>
              </span>
              <span>
                🌊 Pegel: <strong>{liveData.pegel ? liveData.pegel.trend : "—"}</strong>
              </span>
            </div>
          </section>
        ) : null}

        {liveData ? (
          <section className={liveStyles.referralSection} aria-label="Passend für heute">
            <div className={liveStyles.sectionHeading}>
              <div>
                <span className={liveStyles.kicker}>Passend für heute</span>
                <h2>Was heute besonders gut passt</h2>
              </div>
              <span className={liveStyles.updated}>situativ empfohlen</span>
            </div>

            <div className={liveStyles.referralGrid}>
              <a
                className={liveStyles.referralCard}
                href={affiliateLinks.accommodation.url}
                target="_blank"
                rel="sponsored noreferrer"
              >
                <span className={liveStyles.referralIcon} aria-hidden="true">🏨</span>
                <span className={liveStyles.referralBadge}>Werbung · Affiliate-Link</span>
                <strong>Unterkunft in Glücksburg finden</strong>
                <p>Hotels, Ferienwohnungen und weitere Übernachtungsmöglichkeiten vergleichen.</p>
                <em>Unterkünfte ansehen ↗</em>
              </a>

              {recommendedOffers.map((offer) => (
                <a
                  className={liveStyles.referralCard}
                  href={offer.href}
                  {...(offer.affiliate
                    ? { target: "_blank", rel: "sponsored noreferrer" }
                    : {})}
                  key={offer.id}
                >
                  <span className={liveStyles.referralIcon} aria-hidden="true">
                    {offer.icon}
                  </span>
                  <span
                    className={
                      liveStyles.referralBadge +
                      " " +
                      (!offer.affiliate ? liveStyles.editorialBadge : "")
                    }
                  >
                    {offer.badge}
                  </span>
                  <strong>{offer.title}</strong>
                  <p>{offer.description}</p>
                  <em>
                    {offer.affiliate
                      ? "Verfügbarkeit & Preis prüfen ↗"
                      : "Freizeitideen öffnen →"}
                  </em>
                </a>
              ))}

              <a className={liveStyles.referralCard} href="/veranstaltungen">
                <span className={liveStyles.referralIcon} aria-hidden="true">📅</span>
                <span className={liveStyles.referralBadge + " " + liveStyles.editorialBadge}>
                  Redaktionell
                </span>
                <strong>Was ist heute in Glücksburg los?</strong>
                <p>Aktuelle Veranstaltungen und Termine mit dem Live-Check kombinieren.</p>
                <em>Heute ansehen →</em>
              </a>

              <a className={liveStyles.referralCard} href="/partner">
                <span className={liveStyles.referralIcon} aria-hidden="true">🤝</span>
                <span className={liveStyles.referralBadge + " " + liveStyles.partnerBadge}>
                  Für Betriebe
                </span>
                <strong>Lokaler Anbieter in Glücksburg?</strong>
                <p>Mit einem passenden Angebot auf förde.info sichtbar werden.</p>
                <em>Partner werden →</em>
              </a>
            </div>

            <p className={liveStyles.affiliateNote}>
              Affiliate-Hinweis: Bei einer Buchung über entsprechend gekennzeichnete Links kann
              förde.info eine Provision erhalten. Für dich entstehen dadurch keine zusätzlichen
              Kosten. Redaktionelle Empfehlungen sind davon unabhängig.
            </p>
          </section>
        ) : null}

        {liveData ? (
          <section
            className={liveStyles.featureSection}
            aria-label="Beste Zeit heute"
          >
            <div className={liveStyles.sectionHeading}>
              <div>
                <span className={liveStyles.kicker}>Beste Zeit heute</span>
                <h2>Wann lohnt es sich am meisten?</h2>
              </div>
              <span className={liveStyles.updated}>2-Stunden-Fenster · heute</span>
            </div>

            <div className={liveStyles.bestTimeGrid}>
              {liveData.bestTimes.map((item) => (
                <article className={liveStyles.bestTimeCard} key={item.id}>
                  <div className={liveStyles.bestTimeTop}>
                    <span className={liveStyles.scoreIcon}>{item.icon}</span>
                    {item.score !== null ? (
                      <span className={liveStyles.bestTimeScore}>{item.score}/100</span>
                    ) : null}
                  </div>
                  <h3>{item.label}</h3>
                  {item.start && item.end ? (
                    <>
                      <strong className={liveStyles.timeWindow}>
                        {item.start}–{item.end} Uhr
                      </strong>
                      <span className={liveStyles.bestTimeVerdict}>{item.verdict}</span>
                      <div className={liveStyles.bestTimeMeta}>
                        <span>🌧️ {item.rainProbability ?? 0}%</span>
                        <span>💨 {item.windSpeed ?? 0} km/h</span>
                        <span>☀️ UV {item.uvIndex ?? 0}</span>
                      </div>
                    </>
                  ) : (
                    <p className={liveStyles.muted}>
                      Für heute ist kein sinnvoller Zeitraum mehr verfügbar.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <footer className={styles.footer}><span>Routen: FOSSGIS / OpenStreetMap · Karte: OpenStreetMap-Mitwirkende. Routingdaten können älter sein als die angezeigten Meldungen.</span><a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Kartenfehler melden ↗</a><a href="/gluecksburg#impressum">Impressum & Datenschutz</a></footer>
      </div>
    </main>
  );
}
