"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type View =
  | "home"
  | "street"
  | "waste"
  | "events"
  | "rathaus"
  | "rathaus-news"
  | "official-notices"
  | "impressum";

type Street = {
  id: string;
  name: string;
  asf_ort_number?: number | null;
  asf_street_number?: number | null;
};

type HouseNumber = { id: string; label: string };
type WasteEvent = { type: string; date: string };

type WeatherNow = {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  isDay: boolean;
  min: number;
  max: number;
};
type EventDateFilter =
  | "all"
  | "today"
  | "tomorrow"
  | "this-week"
  | "next-week";

type EventRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  end_date?: string | null;
  time?: string | null;
  location?: string | null;
  organizer?: string | null;
  family_friendly?: boolean;
  source_url?: string | null;
};

type CivicInfo = {
  title: string;
  data: {
    email?: string | null;
    appointment_url?: string | null;
    opening_hours?: {
      monday?: string | null;
      tuesday?: string | null;
      friday?: string | null;
    };
  };
  source_url: string;
};

type OfficialNotice = {
  id: string;
  published_at: string | null;
  title: string;
  source_url: string;
};

type RathausNews = {
  id: string;
  published_at: string | null;
  title: string;
  source_url: string;
};

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(value: string, days: number) {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getMonday(value: string) {
  const date = new Date(value + "T00:00:00Z");
  const day = date.getUTCDay() || 7;
  return addDays(value, 1 - day);
}

function matchesEventDateFilter(date: string, filter: EventDateFilter) {
  const current = today();

  if (filter === "all") return true;
  if (filter === "today") return date === current;
  if (filter === "tomorrow") return date === addDays(current, 1);

  if (filter === "this-week") {
    const start = getMonday(current);
    const end = addDays(start, 6);
    return date >= start && date <= end;
  }

  if (filter === "next-week") {
    const start = addDays(getMonday(current), 7);
    const end = addDays(start, 6);
    return date >= start && date <= end;
  }

  return true;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value + "T12:00:00"));
}

function monthShort(value: string) {
  return new Intl.DateTimeFormat("de-DE", { month: "short" })
    .format(new Date(value + "T12:00:00"))
    .replace(".", "")
    .toUpperCase();
}

function dayNumber(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(
    new Date(value + "T12:00:00")
  );
}

function wasteTone(type: string) {
  if (type === "Restmüll") return "bin-rest";
  if (type === "Biomüll") return "bin-bio";
  if (type === "Papier") return "bin-paper";
  if (type === "Gelbe Tonne") return "bin-yellow";
  return "";
}

function icon(label: string) {
  return <span className="nav-icon" aria-hidden="true">{label}</span>;
}

function weatherMeta(code: number, isDay: boolean) {
  if (code === 0) return { icon: isDay ? "☀️" : "🌙", label: "Klar" };
  if ([1, 2].includes(code)) return { icon: isDay ? "🌤️" : "☁️", label: "Leicht bewölkt" };
  if (code === 3) return { icon: "☁️", label: "Bewölkt" };
  if ([45, 48].includes(code)) return { icon: "🌫️", label: "Nebel" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "🌦️", label: "Nieselregen" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: "🌧️", label: "Regen" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "❄️", label: "Schnee" };
  if ([95, 96, 99].includes(code)) return { icon: "⛈️", label: "Gewitter" };
  return { icon: "🌥️", label: "Wechselhaft" };
}

function windDirectionLabel(degrees: number) {
  const directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

export default function HomePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [view, setView] = useState<View>("home");
  const [streets, setStreets] = useState<Street[]>([]);
  const [selectedStreet, setSelectedStreet] = useState("");
  const [houseNumbers, setHouseNumbers] = useState<HouseNumber[]>([]);
  const [selectedHouseNumber, setSelectedHouseNumber] = useState("");
  const [restoreHouseNumber, setRestoreHouseNumber] = useState("");
  const [wasteEvents, setWasteEvents] = useState<WasteEvent[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [officialNotices, setOfficialNotices] = useState<OfficialNotice[]>([]);
  const [rathausNews, setRathausNews] = useState<RathausNews[]>([]);
  const [civic, setCivic] = useState<CivicInfo | null>(null);
  const [loadingStreet, setLoadingStreet] = useState(false);
  const [loadingWaste, setLoadingWaste] = useState(false);
  const [notice, setNotice] = useState("");
  const [streetSearch, setStreetSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [eventDateFilter, setEventDateFilter] = useState<EventDateFilter>("all");
  const [eventMonthFilter, setEventMonthFilter] = useState("all");
  const [weather, setWeather] = useState<WeatherNow | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as View;
    if (["home", "street", "waste", "events", "rathaus", "rathaus-news", "official-notices", "impressum"].includes(hash)) setView(hash);
    try {
      const saved = JSON.parse(localStorage.getItem("gluecksburg-direkt-address") || "{}");
      if (saved.streetId) setSelectedStreet(saved.streetId);
      if (saved.houseNumberId) setRestoreHouseNumber(saved.houseNumberId);
    } catch {}
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWeather() {
      try {
        const params = new URLSearchParams({
          latitude: "54.8357",
          longitude: "9.5487",
          current: "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day",
          daily: "temperature_2m_max,temperature_2m_min",
          timezone: "Europe/Berlin",
          forecast_days: "1",
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const data = await response.json();
        if (!data?.current || !data?.daily) return;

        setWeather({
          temperature: Number(data.current.temperature_2m),
          windSpeed: Number(data.current.wind_speed_10m),
          windDirection: Number(data.current.wind_direction_10m),
          weatherCode: Number(data.current.weather_code),
          isDay: Boolean(data.current.is_day),
          min: Number(data.daily.temperature_2m_min?.[0]),
          max: Number(data.daily.temperature_2m_max?.[0]),
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") setWeather(null);
      }
    }

    loadWeather();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    async function loadBaseData() {
      const [
        { data: streetRows },
        { data: eventRows },
        { data: civicRows },
        { data: noticeRows },
        { data: rathausRows },
      ] = await Promise.all([
          supabase
            .from("streets")
            .select("id,name,asf_ort_number,asf_street_number")
            .order("name"),
          supabase
            .from("events")
            .select("id,title,description,category,date,end_date,time,location,organizer,family_friendly,source_url")
            .eq("status", "published")
            .gte("date", today())
            .order("date")
            .limit(300),
          supabase
            .from("civic_info")
            .select("title,data,source_url")
            .eq("key", "buergerbuero")
            .maybeSingle(),
          supabase
            .from("official_notices")
            .select("id,published_at,title,source_url")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(30),
          supabase
            .from("rathaus_news")
            .select("id,published_at,title,source_url")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(30),
        ]);

      setStreets((streetRows ?? []) as Street[]);
      setEvents((eventRows ?? []) as EventRow[]);
      setCivic((civicRows ?? null) as CivicInfo | null);
      setOfficialNotices((noticeRows ?? []) as OfficialNotice[]);
      setRathausNews((rathausRows ?? []) as RathausNews[]);
    }

    loadBaseData();
  }, [supabase]);

  useEffect(() => {
    setHouseNumbers([]);
    setSelectedHouseNumber("");
    setWasteEvents([]);
    if (!supabase || !selectedStreet) return;

    async function loadHouseNumbers() {
      setLoadingStreet(true);
      setNotice("");
      const { data, error } = await supabase.functions.invoke("waste-address-options", {
        body: { street_id: selectedStreet },
      });

      if (error) {
        setNotice("Hausnummern konnten gerade nicht geladen werden.");
      } else {
        const rows = (data?.house_numbers ?? []) as HouseNumber[];
        setHouseNumbers(rows);
        if (restoreHouseNumber && rows.some((item) => item.id === restoreHouseNumber)) {
          setSelectedHouseNumber(restoreHouseNumber);
          setRestoreHouseNumber("");
        }
      }
      setLoadingStreet(false);
    }

    loadHouseNumbers();
  }, [selectedStreet, supabase, restoreHouseNumber]);

  useEffect(() => {
    if (!selectedStreet) return;
    try {
      localStorage.setItem(
        "gluecksburg-direkt-address",
        JSON.stringify({
          streetId: selectedStreet,
          houseNumberId: selectedHouseNumber || "",
        })
      );
    } catch {}
  }, [selectedStreet, selectedHouseNumber]);

  function navigate(next: View) {
    setView(next);
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadWaste(targetView: View = "waste") {
    if (!supabase || !selectedStreet || !selectedHouseNumber) {
      setNotice("Bitte zuerst Straße und Hausnummer auswählen.");
      navigate("street");
      return;
    }

    setLoadingWaste(true);
    setNotice("");

    const { data, error } = await supabase.functions.invoke("sync-waste", {
      body: {
        street_id: selectedStreet,
        house_number_id: selectedHouseNumber,
      },
    });

    if (error) {
      setNotice("Die Abfuhrtermine konnten gerade nicht geladen werden.");
    } else {
      setWasteEvents((data?.events ?? []) as WasteEvent[]);
      setNotice("Abfuhrtermine wurden direkt bei ASF aktualisiert.");
      if (targetView) navigate(targetView);
    }

    setLoadingWaste(false);
  }

  const selectedStreetName = streets.find((street) => street.id === selectedStreet)?.name;
  const selectedHouseNumberLabel = houseNumbers.find((h) => h.id === selectedHouseNumber)?.label;
  const addressLabel = selectedStreetName
    ? selectedHouseNumberLabel
      ? `${selectedStreetName} ${selectedHouseNumberLabel}`
      : selectedStreetName
    : "Noch keine Adresse gewählt";

  const filteredStreets = streets.filter((street) =>
    street.name.toLocaleLowerCase("de").includes(streetSearch.toLocaleLowerCase("de").trim())
  );

  const eventMonths = Array.from(
    new Set(events.map((event) => event.date.slice(0, 7)))
  ).sort();

  const filteredEvents = events.filter((event) => {
    if (eventMonthFilter !== "all" && event.date.slice(0, 7) !== eventMonthFilter) return false;
    if (!matchesEventDateFilter(event.date, eventDateFilter)) return false;
    if (!globalSearch.trim()) return true;
    const q = globalSearch.toLocaleLowerCase("de");
    return [event.title, event.description, event.location, event.organizer]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("de")
      .includes(q);
  });

  const nextWaste = wasteEvents[0];
  const currentEvents = events.slice(0, 4);

  const navItems: Array<{ id: View; label: string; symbol: string }> = [
    { id: "home", label: "Start", symbol: "⌂" },
    { id: "waste", label: "Müllabfuhr", symbol: "♻" },
    { id: "events", label: "Veranstaltungen", symbol: "□" },
    { id: "rathaus", label: "Rathaus", symbol: "▦" },
    { id: "impressum", label: "Impressum", symbol: "§" },
  ];

  const rathausSubItems: Array<{ id: View; label: string }> = [
    { id: "rathaus-news", label: "Aktuelles aus dem Rathaus" },
    { id: "official-notices", label: "Amtl. Bekanntmachungen" },
  ];

  const currentLabel =
    rathausSubItems.find((item) => item.id === view)?.label ||
    navItems.find((item) => item.id === view)?.label ||
    "Start";

  const currentWeather = weather ? weatherMeta(weather.weatherCode, weather.isDay) : null;

  return (
    <>
      <a className="skip" href="#content">Zum Inhalt springen</a>

      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-mark">⚓</span>
          <span>
            Glücksburg
            <span className="brand-direct">DIREKT</span>
          </span>
        </button>

        <div className="sidebar-location">⌖ GLÜCKSBURG (OSTSEE)</div>

        <nav>
          {navItems.map((item) => (
            <div key={item.id}>
              <button
                className={
                  "nav-item " +
                  (view === item.id ||
                  (item.id === "rathaus" &&
                    (view === "rathaus-news" || view === "official-notices"))
                    ? "active"
                    : "")
                }
                onClick={() => navigate(item.id)}
              >
                {icon(item.symbol)}
                <span>{item.label}</span>
                {view === item.id && <span className="nav-dot" />}
              </button>

              {item.id === "rathaus" && (
                <div className="nav-submenu">
                  {rathausSubItems.map((subitem) => (
                    <button
                      key={subitem.id}
                      className={"nav-subitem " + (view === subitem.id ? "active" : "")}
                      onClick={() => navigate(subitem.id)}
                    >
                      <span className="nav-subline" />
                      <span>{subitem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="local-message">
            <span>●</span>
            <p>Privat, lokal und unabhängig.</p>
          </div>
        </div>
      </aside>

      <div className="app-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Glücksburg Direkt</span>
            <span>›</span>
            <strong>{currentLabel}</strong>
          </div>

          <button className="icon-button" aria-label="Hinweise">◌</button>
          <div className="avatar" aria-label="Glücksburg Direkt">GD</div>
        </header>

        <main className="main" id="content">
          {notice && (
            <div className="status-banner">
              <span className="dot" />
              <div>
                <strong>Aktueller Hinweis</strong>
                <span>{notice}</span>
              </div>
              <button onClick={() => setNotice("")}>Schließen</button>
            </div>
          )}

          {view === "home" && (
            <>
              <div className="demo-strip">
                <span className="demo-dot" />
                <strong>GLÜCKSBURG DIREKT</strong>
                <span>Aktuelle Daten aus ASF, kulturbytes und der Stadt Glücksburg.</span>
              </div>

              <section className="welcome">
                <div>
                  <div className="eyebrow">Moin aus Glücksburg</div>
                  <h1>Alles Wichtige für deinen Alltag <span className="wave">👋</span></h1>
                  <p>Müll, Termine und Rathausinformationen auf einen Blick.</p>
                </div>
                <button className="location-pill" onClick={() => navigate("street")}>
                  ⌖ {addressLabel}
                </button>
              </section>

              {!selectedStreet && (
                <section className="onboard-banner">
                  <div>
                    <strong>Richte deine Adresse ein</strong>
                    <p>Wähle Straße und Hausnummer, damit dein persönlicher Abfallkalender stimmt.</p>
                  </div>
                  <button className="button primary" onClick={() => navigate("street")}>
                    Adresse wählen
                  </button>
                </section>
              )}

              <section className="today-weather-card" aria-label="Wetter heute in Glücksburg">
                <div className="today-weather-main">
                  <span className="today-weather-icon" aria-hidden="true">
                    {currentWeather?.icon || "🌤️"}
                  </span>
                  <div>
                    <span className="dashboard-kicker">Heute in Glücksburg</span>
                    <h2>{currentWeather?.label || "Wetter wird geladen"}</h2>
                    <p>Aktuelle Wetterlage an der Flensburger Förde</p>
                  </div>
                </div>

                {weather ? (
                  <div className="today-weather-values">
                    <div>
                      <small>Temperatur</small>
                      <strong>{Math.round(weather.temperature)}°C</strong>
                      <span>{Math.round(weather.min)}° / {Math.round(weather.max)}°</span>
                    </div>
                    <div>
                      <small>Wind</small>
                      <strong>{Math.round(weather.windSpeed)} km/h</strong>
                      <span>aus {windDirectionLabel(weather.windDirection)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="today-weather-loading">Wetterdaten werden geladen …</div>
                )}
              </section>

              <section className="home-dashboard-grid">
                <article className="dashboard-panel rathaus-dashboard-card">
                  <div className="dashboard-panel-heading">
                    <div>
                      <span className="dashboard-kicker">Stadt Glücksburg</span>
                      <h2>Rathaus</h2>
                    </div>
                    <span className="dashboard-main-icon" aria-hidden="true">🏛️</span>
                  </div>

                  <div className="office-hours dashboard-office-hours">
                    <div>
                      <strong>Montag</strong>
                      <span>{civic?.data?.opening_hours?.monday || "—"}</span>
                    </div>
                    <div>
                      <strong>Dienstag</strong>
                      <span>{civic?.data?.opening_hours?.tuesday || "—"}</span>
                    </div>
                    <div>
                      <strong>Freitag</strong>
                      <span>{civic?.data?.opening_hours?.friday || "—"}</span>
                    </div>
                  </div>

                  <div className="dashboard-card-footer">
                    <span>Bürgerbüro · Öffnungszeiten & Kontakt</span>
                    <button className="text-button" onClick={() => navigate("rathaus")}>
                      Rathaus öffnen →
                    </button>
                  </div>
                </article>

                <section className="dashboard-panel">
                  <div className="dashboard-panel-heading">
                    <div>
                      <span className="dashboard-kicker">Aktuell</span>
                      <h2>Neues aus dem Rathaus</h2>
                    </div>
                    <button className="text-button" onClick={() => navigate("rathaus-news")}>
                      Alle ansehen →
                    </button>
                  </div>

                  <div className="dashboard-list">
                    {rathausNews.slice(0, 4).map((item) => (
                      <a
                        className="dashboard-list-row"
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        key={item.id}
                      >
                        <div>
                          <small>{item.published_at ? formatDate(item.published_at) : "Rathaus"}</small>
                          <strong>{item.title}</strong>
                        </div>
                        <span>›</span>
                      </a>
                    ))}
                  </div>

                  {!rathausNews.length && (
                    <div className="dashboard-empty">Aktuell sind keine Rathaus-Meldungen geladen.</div>
                  )}
                </section>

                <section className="dashboard-panel">
                  <div className="dashboard-panel-heading">
                    <div>
                      <span className="dashboard-kicker">Kalender</span>
                      <h2>Veranstaltungen</h2>
                    </div>
                    <button className="text-button" onClick={() => navigate("events")}>
                      Alle Termine →
                    </button>
                  </div>

                  <div className="dashboard-list">
                    {currentEvents.slice(0, 4).map((event) => (
                      <a
                        className="dashboard-list-row event-dashboard-row"
                        href={event.source_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        key={event.id}
                      >
                        <div className="date-tile">
                          <span>{monthShort(event.date)}</span>
                          <strong>{dayNumber(event.date)}</strong>
                        </div>
                        <div>
                          <strong>{event.title}</strong>
                          <small>
                            {event.time ? event.time + " Uhr · " : ""}
                            {event.location || "Glücksburg"}
                          </small>
                        </div>
                        <span>›</span>
                      </a>
                    ))}
                  </div>
                </section>

                <section className="dashboard-panel">
                  <div className="dashboard-panel-heading">
                    <div>
                      <span className="dashboard-kicker">ASF-Abfallkalender</span>
                      <h2>Müllabfuhr</h2>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => wasteEvents.length ? navigate("waste") : navigate("street")}
                    >
                      {wasteEvents.length ? "Alle Termine →" : "Adresse wählen →"}
                    </button>
                  </div>

                  {wasteEvents.length ? (
                    <div className="dashboard-list">
                      {wasteEvents.slice(0, 4).map((entry, index) => (
                        <button
                          className="dashboard-list-row waste-dashboard-row"
                          onClick={() => navigate("waste")}
                          key={entry.date + entry.type + index}
                        >
                          <span className={"waste-mini-icon " + wasteTone(entry.type)}>♻</span>
                          <div>
                            <small>{formatDate(entry.date)}</small>
                            <strong>{entry.type}</strong>
                          </div>
                          <span>›</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="dashboard-empty">
                      <strong>Noch keine Abfuhrtermine geladen</strong>
                      <span>Wähle einmal deine Adresse, dann erscheinen hier die nächsten Termine.</span>
                      <button className="button primary" onClick={() => navigate("street")}>
                        Adresse auswählen
                      </button>
                    </div>
                  )}
                </section>
              </section>

            </>
          )}

          {view === "street" && (
            <>
              <section className="page-heading">
                <div className="eyebrow">Persönlicher Bereich</div>
                <h1>Meine Straße</h1>
                <p>Wähle Straße und Hausnummer für deinen adressgenauen ASF-Abfallkalender.</p>
              </section>

              <div className="settings-grid">
                <section className="card padded">
                  <h2>Adresse auswählen</h2>
                  <div className="form-stack">
                    <label>
                      Straße suchen
                      <input
                        type="search"
                        value={streetSearch}
                        onChange={(event) => setStreetSearch(event.target.value)}
                        placeholder="Zum Beispiel Bremsberg oder Uferstraße"
                      />
                    </label>

                    <label>
                      Deine Straße
                      <select
                        value={selectedStreet}
                        onChange={(event) => setSelectedStreet(event.target.value)}
                      >
                        <option value="">Straße auswählen</option>
                        {filteredStreets.map((street) => (
                          <option key={street.id} value={street.id}>{street.name}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Hausnummer
                      <select
                        value={selectedHouseNumber}
                        onChange={(event) => setSelectedHouseNumber(event.target.value)}
                        disabled={!selectedStreet || loadingStreet}
                      >
                        <option value="">
                          {loadingStreet ? "Hausnummern werden geladen …" : "Hausnummer auswählen"}
                        </option>
                        {houseNumbers.map((house) => (
                          <option key={house.id} value={house.id}>{house.label}</option>
                        ))}
                      </select>
                    </label>

                    <button
                      className="button primary"
                      disabled={!selectedStreet || !selectedHouseNumber || loadingWaste}
                      onClick={() => loadWaste("waste")}
                    >
                      {loadingWaste ? "Termine werden geladen …" : "Adresse übernehmen & Termine laden"}
                    </button>
                  </div>

                  <p className="notice">
                    Die Hausnummer wird nur für die ASF-Abfrage verwendet. Im Cache wird kein Klartext der Hausnummer gespeichert.
                  </p>
                </section>

                <section className="card padded">
                  <h2>Aktuelle Auswahl</h2>
                  <div className="summary">
                    <strong>{selectedStreetName || "Noch keine Straße gewählt"}</strong>
                    <div>
                      <small>Hausnummer</small>
                      <p>{selectedHouseNumberLabel || "Noch nicht gewählt"}</p>
                    </div>
                    <div>
                      <small>Datenquelle</small>
                      <p>Abfallwirtschaft Schleswig-Flensburg (ASF)</p>
                    </div>
                  </div>
                  <p className="muted">In Glücksburg sind {streets.length} ASF-Straßeneinträge verfügbar.</p>
                </section>
              </div>
            </>
          )}

          {view === "waste" && (
            <>
              <section className="page-heading">
                <div className="eyebrow">ASF-Abfallkalender</div>
                <h1>Müllabfuhr</h1>
                <p>{addressLabel}</p>
              </section>

              <div className="toolbar">
                <button className="button" onClick={() => navigate("street")}>Adresse ändern</button>
                <button
                  className="button primary"
                  disabled={!selectedStreet || !selectedHouseNumber || loadingWaste}
                  onClick={() => loadWaste("waste")}
                >
                  {loadingWaste ? "Aktualisiere …" : "Termine aktualisieren"}
                </button>
              </div>

              {wasteEvents.length ? (
                <div className="waste-grid">
                  {wasteEvents.slice(0, 16).map((entry, index) => (
                    <article className={"card waste-tile " + wasteTone(entry.type)} key={entry.date + entry.type + index}>
                      <span className="waste-symbol">♻</span>
                      <small>{formatDate(entry.date)}</small>
                      <h2>{entry.type}</h2>
                      <p>Nächster Termin laut ASF.</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <h2>Noch keine Abfuhrtermine geladen</h2>
                  <p>Wähle zuerst Straße und Hausnummer oder aktualisiere den Kalender.</p>
                  <button className="button primary" onClick={() => navigate("street")}>Adresse auswählen</button>
                </div>
              )}

              <div className="source-note">
                <a href="https://www.asf-online.de/abfuhrtermine/" target="_blank" rel="noreferrer">
                  Quelle: ASF Schleswig-Flensburg ↗
                </a>
              </div>
            </>
          )}

          {view === "events" && (
            <>
              <section className="page-heading">
                <div className="eyebrow">kulturbytes</div>
                <h1>Veranstaltungen</h1>
                <p>Aktuelle Termine in Glücksburg mit direktem Link zur jeweiligen Veranstaltungsseite.</p>
              </section>

              <div className="event-filter-bar" aria-label="Veranstaltungen nach Zeitraum filtern">
                {[
                  ["all", "Alle"],
                  ["today", "Heute"],
                  ["tomorrow", "Morgen"],
                  ["this-week", "Diese Woche"],
                  ["next-week", "Nächste Woche"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={"chip " + (eventDateFilter === id ? "active" : "")}
                    onClick={() => setEventDateFilter(id as EventDateFilter)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="toolbar">
                <label>
                  Monat
                  <select
                    value={eventMonthFilter}
                    onChange={(event) => {
                      setEventMonthFilter(event.target.value);
                      if (event.target.value !== "all") setEventDateFilter("all");
                    }}
                  >
                    <option value="all">Alle Monate</option>
                    {eventMonths.map((month) => (
                      <option key={month} value={month}>
                        {new Intl.DateTimeFormat("de-DE", {
                          month: "long",
                          year: "numeric",
                        }).format(new Date(month + "-01T12:00:00"))}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Suche
                  <input
                    type="search"
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Titel, Ort oder Veranstalter"
                  />
                </label>
              </div>

              <div className="stack">
                {filteredEvents.map((event) => (
                  <a
                    className="content-row"
                    href={event.source_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    key={event.id}
                  >
                    <div className="date-tile">
                      <span>{monthShort(event.date)}</span>
                      <strong>{dayNumber(event.date)}</strong>
                    </div>
                    <div>
                      {event.family_friendly && <span className="badge teal">Familie</span>}
                      <h3>{event.title}</h3>
                      <p>
                        {event.time ? event.time + " Uhr · " : ""}
                        {event.location || "Glücksburg"}
                      </p>
                    </div>
                    <span>›</span>
                  </a>
                ))}
              </div>

              {!filteredEvents.length && (
                <div className="empty">
                  Für den gewählten Zeitraum wurden keine passenden Veranstaltungen gefunden.
                </div>
              )}

              <div className="source-note">
                <a href="https://gluecksburg.kulturbytes.de" target="_blank" rel="noreferrer">
                  Zum offiziellen Veranstaltungskalender ↗
                </a>
              </div>
            </>
          )}

          {view === "rathaus" && (
            <>
              <section className="page-heading">
                <div className="eyebrow">Stadt Glücksburg</div>
                <h1>Rathaus</h1>
                <p>Öffnungszeiten, Kontakt und die wichtigsten Rathausbereiche.</p>
              </section>

              <div className="settings-grid">
                <section className="card padded">
                  <h2>{civic?.title || "Bürgerbüro Glücksburg"}</h2>

                  <div className="office-hours">
                    <div><strong>Montag</strong><span>{civic?.data?.opening_hours?.monday || "—"}</span></div>
                    <div><strong>Dienstag</strong><span>{civic?.data?.opening_hours?.tuesday || "—"}</span></div>
                    <div><strong>Freitag</strong><span>{civic?.data?.opening_hours?.friday || "—"}</span></div>
                  </div>

                  <div className="actions">
                    {civic?.data?.appointment_url && (
                      <a className="button primary" href={civic.data.appointment_url} target="_blank" rel="noreferrer">
                        Online-Termin
                      </a>
                    )}
                    {civic?.data?.email && (
                      <a className="button" href={"mailto:" + civic.data.email}>E-Mail</a>
                    )}
                    {civic?.source_url && (
                      <a className="button" href={civic.source_url} target="_blank" rel="noreferrer">Stadtseite ↗</a>
                    )}
                  </div>
                </section>

                <section className="card padded">
                  <h2>Rathaus-Bereiche</h2>
                  <div className="rathaus-menu-cards">
                    <button className="rathaus-menu-card" onClick={() => navigate("rathaus-news")}>
                      <span className="icon-box teal">▦</span>
                      <div>
                        <strong>Aktuelles aus dem Rathaus</strong>
                        <small>Neuigkeiten und Hinweise der Stadt</small>
                      </div>
                      <span>›</span>
                    </button>
                    <button className="rathaus-menu-card" onClick={() => navigate("official-notices")}>
                      <span className="icon-box amber">!</span>
                      <div>
                        <strong>Amtl. Bekanntmachungen</strong>
                        <small>Formelle Veröffentlichungen und PDFs</small>
                      </div>
                      <span>›</span>
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}

          {view === "rathaus-news" && (
            <>
              <section className="page-heading">
                <div className="eyebrow">Rathaus · Stadt Glücksburg</div>
                <h1>Aktuelles aus dem Rathaus</h1>
                <p>Neuigkeiten, Hinweise und aktuelle Informationen der Stadt Glücksburg.</p>
              </section>

              <div className="stack">
                {rathausNews.map((item) => (
                  <a
                    className="content-row"
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    key={item.id}
                  >
                    <span className="icon-box teal">▦</span>
                    <div>
                      <span className="badge teal">Rathaus</span>
                      <h3>{item.title}</h3>
                      <p>{item.published_at ? formatDate(item.published_at) : "Datum laut Stadtseite"}</p>
                    </div>
                    <span>Mehr →</span>
                  </a>
                ))}
              </div>

              {!rathausNews.length && (
                <div className="empty">Zurzeit konnten keine Rathaus-Meldungen geladen werden.</div>
              )}

              <div className="source-note">
                <a href="https://stadt.gluecksburg.de/rathaus/neuigkeiten" target="_blank" rel="noreferrer">
                  Alle Neuigkeiten bei der Stadt öffnen ↗
                </a>
              </div>
            </>
          )}

          {view === "official-notices" && (
            <>
              <section className="page-heading">
                <div className="eyebrow">Rathaus · Stadt Glücksburg</div>
                <h1>Amtliche Bekanntmachungen</h1>
                <p>Formelle Bekanntmachungen der Stadt Glücksburg mit direktem Link zum jeweiligen Dokument.</p>
              </section>

              <div className="stack">
                {officialNotices.map((item) => (
                  <a
                    className="content-row announcement-row"
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    key={item.id}
                  >
                    <span className="icon-box amber">!</span>
                    <div>
                      <span className="badge">Amtliche Bekanntmachung</span>
                      <h3>{item.title}</h3>
                      <p>{item.published_at ? formatDate(item.published_at) : "Datum laut Stadtseite"}</p>
                    </div>
                    <span>PDF ↗</span>
                  </a>
                ))}
              </div>

              {!officialNotices.length && (
                <div className="empty">Zurzeit konnten keine Bekanntmachungen geladen werden.</div>
              )}

              <div className="source-note">
                <a
                  href="https://stadt.gluecksburg.de/rathaus/amtliche-bekanntmachungen"
                  target="_blank"
                  rel="noreferrer"
                >
                  Alle amtlichen Bekanntmachungen bei der Stadt öffnen ↗
                </a>
              </div>
            </>
          )}

          {view === "impressum" && (
            <>
              <section className="page-heading">
                <div className="eyebrow">Rechtliches</div>
                <h1>Impressum</h1>
                <p>Angaben gemäß § 5 DDG.</p>
              </section>

              <section className="card padded legal-card">
                <h2>Betreiber</h2>
                <p>
                  Sebastian Schwarz<br />
                  Klein Bremsberg 20<br />
                  24960 Glücksburg
                </p>

                <h2>Kontakt</h2>
                <p>
                  E-Mail:{" "}
                  <a href="mailto:sebastianschwarz1@icloud.de">
                    sebastianschwarz1@icloud.de
                  </a>
                </p>

                <h2>Verantwortlich für den Inhalt</h2>
                <p>
                  Sebastian Schwarz<br />
                  Klein Bremsberg 20<br />
                  24960 Glücksburg
                </p>

                <h2>Hinweis</h2>
                <p className="muted">
                  GlücksburgDirekt ist ein privates, unabhängiges Informationsangebot und
                  kein offizielles Angebot der Stadt Glücksburg (Ostsee).
                </p>
              </section>
            </>
          )}

          <footer>
            <span>GlücksburgDirekt ist ein privates, unabhängiges Informationsangebot.</span>
            <span>Kein offizielles Angebot der Stadt Glücksburg (Ostsee).</span>
          </footer>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => navigate(item.id)}
          >
            <span>{item.symbol}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
