"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { track } from "@vercel/analytics";

type View =
  | "home"
  | "street"
  | "waste"
  | "events"
  | "family"
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

function wasteIcon(type: string) {
  if (type === "Restmüll") return "🗑️";
  if (type === "Biomüll") return "🌿";
  if (type === "Papier") return "📄";
  if (type === "Gelbe Tonne") return "♻️";
  return "🗓️";
}

function weekdayName(value: string) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(
    new Date(value + "T12:00:00")
  );
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

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function compactIcsDate(value: string) {
  return value.replace(/-/g, "");
}

function compactIcsTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}${match[2]}${match[3] || "00"}`;
}

export default function HomePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [view, setView] = useState<View>("home");
  const [streets, setStreets] = useState<Street[]>([]);
  const [selectedStreet, setSelectedStreet] = useState("");
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
    if (["home", "street", "waste", "events", "family", "rathaus", "rathaus-news", "official-notices", "impressum"].includes(hash)) setView(hash);
    try {
      const saved = JSON.parse(localStorage.getItem("gluecksburg-direkt-address") || "{}");
      if (saved.streetId) setSelectedStreet(saved.streetId);

      const cachedWaste = JSON.parse(
        localStorage.getItem("gluecksburg-direkt-waste") || "{}"
      );
      if (
        cachedWaste.streetId === saved.streetId &&
        Array.isArray(cachedWaste.events)
      ) {
        setWasteEvents(
          (cachedWaste.events as WasteEvent[]).filter((entry) => entry.date >= today())
        );
      }
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
    if (!selectedStreet || !streets.length) return;
    const streetName = streets.find((street) => street.id === selectedStreet)?.name;
    if (streetName) setStreetSearch(streetName);
  }, [selectedStreet, streets]);

  useEffect(() => {
    if (!selectedStreet) return;
    try {
      localStorage.setItem(
        "gluecksburg-direkt-address",
        JSON.stringify({ streetId: selectedStreet })
      );
    } catch {}
  }, [selectedStreet]);

  useEffect(() => {
    if (!supabase || !selectedStreet) return;

    let cancelled = false;

    async function restoreWasteCalendar() {
      setLoadingWaste(true);
      const { data, error } = await supabase.functions.invoke("sync-waste", {
        body: { street_id: selectedStreet },
      });

      if (!cancelled && !error) {
        const rows = (data?.events ?? []) as WasteEvent[];
        setWasteEvents(rows);

        try {
          localStorage.setItem(
            "gluecksburg-direkt-waste",
            JSON.stringify({
              streetId: selectedStreet,
              events: rows,
              savedAt: new Date().toISOString(),
            })
          );
        } catch {}
      }

      if (!cancelled && error) {
        setWasteEvents([]);
        setNotice(
          "Für diese Straße konnte kein eindeutiger straßenweiter ASF-Abfallkalender geladen werden."
        );
      }

      if (!cancelled) setLoadingWaste(false);
    }

    restoreWasteCalendar();

    return () => {
      cancelled = true;
    };
  }, [selectedStreet, supabase]);

  function navigate(next: View) {
    track("App section opened", { section: next });
    setView(next);
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function downloadEventIcs(event: EventRow) {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GlücksburgDirekt//Veranstaltungen//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.id}@gluecksburg-direkt.vercel.app`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/, "Z")}`,
    ];

    const eventTime = event.time ? compactIcsTime(event.time) : null;

    if (eventTime) {
      lines.push(`DTSTART;TZID=Europe/Berlin:${compactIcsDate(event.date)}T${eventTime}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactIcsDate(event.date)}`);
      lines.push(
        `DTEND;VALUE=DATE:${compactIcsDate(addDays(event.end_date || event.date, 1))}`
      );
    }

    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }

    const descriptionParts = [
      event.description,
      event.organizer ? `Veranstalter: ${event.organizer}` : "",
      event.source_url ? `Weitere Informationen: ${event.source_url}` : "",
    ].filter(Boolean);

    if (descriptionParts.length) {
      lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join("\n\n"))}`);
    }

    if (event.source_url) {
      lines.push(`URL:${event.source_url}`);
    }

    lines.push("END:VEVENT", "END:VCALENDAR");

    const blob = new Blob([lines.join("\r\n") + "\r\n"], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = event.title
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    link.href = url;
    link.download = `${filename || "veranstaltung"}-${event.date}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    track("Event calendar downloaded");
  }

  async function loadWaste(targetView: View = "waste") {
    if (!supabase || !selectedStreet) {
      setNotice("Bitte zuerst eine Straße auswählen.");
      navigate("street");
      return;
    }

    setLoadingWaste(true);
    setNotice("");

    const { data, error } = await supabase.functions.invoke("sync-waste", {
      body: { street_id: selectedStreet },
    });

    if (error) {
      setWasteEvents([]);
      setNotice(
        "Für diese Straße konnte kein eindeutiger straßenweiter ASF-Abfallkalender geladen werden."
      );
    } else {
      const rows = (data?.events ?? []) as WasteEvent[];
      setWasteEvents(rows);

      try {
        localStorage.setItem(
          "gluecksburg-direkt-waste",
          JSON.stringify({
            streetId: selectedStreet,
            events: rows,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {}

      setNotice("Abfuhrtermine wurden direkt bei ASF aktualisiert.");
      track("Waste calendar loaded");
      if (targetView) navigate(targetView);
    }

    setLoadingWaste(false);
  }

  const selectedStreetName = streets.find((street) => street.id === selectedStreet)?.name;
  const addressLabel = selectedStreetName || "Noch keine Straße gewählt";

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
    { id: "home", label: "Start", symbol: "🏠" },
    { id: "waste", label: "Müllabfuhr", symbol: "🗑️" },
    { id: "events", label: "Veranstaltungen", symbol: "📅" },
    { id: "family", label: "Familie", symbol: "👪" },
    { id: "rathaus", label: "Rathaus", symbol: "🏛️" },
    { id: "impressum", label: "Impressum", symbol: "📄" },
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

          <button
            className="topbar-brand"
            aria-label="Glücksburg Direkt – Startseite"
            onClick={() => navigate("home")}
          >
            <span className="topbar-brand-mark" aria-hidden="true">⚓</span>
            <span className="topbar-brand-text">
              <strong>Glücksburg</strong>
              <small>DIREKT</small>
            </span>
          </button>
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
              <section className="welcome">
                <div>
                  <div className="eyebrow">Moin aus Glücksburg</div>
                  <h1>Alles Wichtige für deinen Alltag in Glücksburg <span className="wave">👋</span></h1>
                  <p>Dein Glücksburg – Alltag, Familie und Freizeit auf einen Blick.</p>
                </div>
              </section>

              {!selectedStreet && (
                <section className="onboard-banner">
                  <div>
                    <strong>Richte deine Adresse ein</strong>
                    <p>Wähle deine Straße, damit dein persönlicher Abfallkalender automatisch geladen wird.</p>
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
                          <span className={"waste-mini-icon " + wasteTone(entry.type)}>{wasteIcon(entry.type)}</span>
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
                <div className="eyebrow">ASF-Abfallkalender</div>
                <h1>Straße auswählen</h1>
                <p>Wähle deine Straße – den passenden ASF-Abfallkalender lädt GlücksburgDirekt automatisch.</p>
              </section>

              <section className="card padded address-picker-card">
                <div className="address-picker-head">
                  <div>
                    <span className="dashboard-kicker">Deine Abfuhradresse</span>
                    <h2>Straße</h2>
                  </div>
                  <span className="address-picker-icon" aria-hidden="true">📍</span>
                </div>

                <div className="address-picker-fields">
                  <label className="street-autocomplete">
                    Straße
                    <input
                      type="search"
                      list="gluecksburg-streets"
                      value={streetSearch}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStreetSearch(value);
                        const match = streets.find(
                          (street) =>
                            street.name.toLocaleLowerCase("de") ===
                            value.trim().toLocaleLowerCase("de")
                        );
                        setSelectedStreet(match?.id || "");
                      }}
                      placeholder="Straße eingeben …"
                      autoComplete="off"
                    />
                    <datalist id="gluecksburg-streets">
                      {streets.map((street) => (
                        <option key={street.id} value={street.name} />
                      ))}
                    </datalist>
                    <small>
                      {streetSearch && !selectedStreet
                        ? "Bitte eine Straße aus den Vorschlägen auswählen."
                        : "Tippe den Straßennamen – passende Treffer werden automatisch vorgeschlagen."}
                    </small>
                  </label>
                </div>

                <div className="address-picker-actions">
                  <div className="address-selection-preview">
                    <span>Ausgewählt</span>
                    <strong>{selectedStreetName || "Noch keine Straße ausgewählt"}</strong>
                  </div>
                  <button
                    className="button primary"
                    disabled={!selectedStreet || loadingWaste}
                    onClick={() => loadWaste("waste")}
                  >
                    {loadingWaste ? "Termine werden geladen …" : "Müllkalender anzeigen"}
                  </button>
                </div>
              </section>
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
                  disabled={!selectedStreet || loadingWaste}
                  onClick={() => loadWaste("waste")}
                >
                  {loadingWaste ? "Aktualisiere …" : "Termine aktualisieren"}
                </button>
              </div>

              {wasteEvents.length ? (
                <section className="waste-calendar">
                  <div className="waste-calendar-head">
                    <div>
                      <span className="dashboard-kicker">Deine nächsten Leerungen</span>
                      <h2>Abfuhrtermine</h2>
                    </div>
                    <span>{wasteEvents.length} Termine geladen</span>
                  </div>

                  <div className="waste-calendar-grid">
                    {wasteEvents.slice(0, 16).map((entry, index) => (
                      <article
                        className={"waste-calendar-card " + wasteTone(entry.type)}
                        key={entry.date + entry.type + index}
                      >
                        <div className="waste-date-badge">
                          <strong>{dayNumber(entry.date)}</strong>
                          <span>{monthShort(entry.date)}</span>
                        </div>
                        <div className="waste-calendar-copy">
                          <span className="waste-weekday">{weekdayName(entry.date)}</span>
                          <h3>{entry.type}</h3>
                          <small>{formatDate(entry.date)}</small>
                        </div>
                        <span className="waste-type-icon" aria-hidden="true">
                          {wasteIcon(entry.type)}
                        </span>
                      </article>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="empty">
                  <h2>Noch keine Abfuhrtermine geladen</h2>
                  <p>Wähle zuerst deine Straße oder aktualisiere den Kalender.</p>
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
                <p>Aktuelle Termine in Glücksburg – mit direktem Detail-Link und iCalendar-Download (.ics).</p>
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
                  <div className="content-row event-content-row" key={event.id}>
                    <div className="date-tile">
                      <span>{monthShort(event.date)}</span>
                      <strong>{dayNumber(event.date)}</strong>
                    </div>

                    <a
                      className="event-details-link"
                      href={event.source_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <h3>{event.title}</h3>
                      <p>
                        {event.time ? event.time + " Uhr · " : ""}
                        {event.location || "Glücksburg"}
                      </p>
                    </a>

                    <div className="event-row-actions">
                      <button
                        className="button event-ical-button"
                        onClick={() => downloadEventIcs(event)}
                        aria-label={`${event.title} als iCalendar-Datei herunterladen`}
                      >
                        <span aria-hidden="true">▣</span>
                        iCalendar
                      </button>
                      <a
                        className="event-more-link"
                        href={event.source_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Details ↗
                      </a>
                    </div>
                  </div>
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

          {view === "family" && (
            <>
              <section className="page-heading">
                <div className="eyebrow">Familie in Glücksburg</div>
                <h1>Familie</h1>
                <p>Wichtige Angebote, Hilfen und Anlaufstellen in Glücksburg kompakt zusammengefasst.</p>
              </section>

              <div className="family-info-grid">
                <article className="family-info-card">
                  <div className="family-card-head">
                    <span className="family-card-icon" aria-hidden="true">⚽</span>
                    <div>
                      <span className="dashboard-kicker">Kinder & Jugendliche</span>
                      <h2>Jugendtreff Glücksburg</h2>
                    </div>
                  </div>
                  <p>
                    Jeden Mittwoch ist der Jugendtreff geöffnet. Von <strong>14:00–17:00 Uhr</strong>
                    für Kinder und Jugendliche ab 10 Jahren, ab <strong>17:00 Uhr</strong> für
                    Jugendliche ab 14 Jahren. Vor Ort gibt es unter anderem Billard, Dart,
                    Aktionen und Platz zum Treffen mit Freunden.
                  </p>
                  <div className="family-facts">
                    <span><strong>Kontakt:</strong> Lars Bothmann, Jugendpfleger</span>
                    <span><strong>Telefon:</strong> 04631 45-1330</span>
                    <span><strong>E-Mail:</strong> lars.bothmann@gluecksburg.de</span>
                  </div>
                  <a
                    className="family-source-link"
                    href="https://stadt.gluecksburg.de/rathaus/neuigkeiten/detail/jugendtreff-gluecksburg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Infos der Stadt öffnen ↗
                  </a>
                </article>

                <article className="family-info-card">
                  <div className="family-card-head">
                    <span className="family-card-icon" aria-hidden="true">♿</span>
                    <div>
                      <span className="dashboard-kicker">Unterstützung</span>
                      <h2>Menschen mit Behinderung</h2>
                    </div>
                  </div>
                  <p>
                    Das Freiwilligen Forum Glücksburg vermittelt kostenlose ehrenamtliche Hilfe,
                    zum Beispiel Begleitungen zu Arzt oder Behörde, Unterstützung beim Einkaufen,
                    Entlastung pflegender Angehöriger, Rollstuhlbegleitung, Besuche und allgemeine
                    Lebenshilfe.
                  </p>
                  <div className="family-facts">
                    <span><strong>Kontakt:</strong> Barbara Wedegärtner, Freiwilligen Forum Glücksburg</span>
                    <span><strong>Adresse:</strong> Am Noor 2, 24960 Glücksburg</span>
                    <span><strong>Telefon:</strong> 04631 8196</span>
                    <span>Die Stadtseite nennt außerdem Angebote für Behindertensport und verweist auf KiBIS.</span>
                  </div>
                  <a
                    className="family-source-link"
                    href="https://stadt.gluecksburg.de/familie/menschen-mit-behinderung"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Alle Hilfsangebote ansehen ↗
                  </a>
                </article>

                <article className="family-info-card">
                  <div className="family-card-head">
                    <span className="family-card-icon" aria-hidden="true">✚</span>
                    <div>
                      <span className="dashboard-kicker">Versorgung vor Ort</span>
                      <h2>Gesundheit</h2>
                    </div>
                  </div>
                  <p>
                    Die städtische Übersicht bündelt Apotheken, Gesundheitszentren,
                    Physiotherapie, Tierärzte und Zahnärzte in Glücksburg und Umgebung.
                  </p>
                  <div className="family-facts">
                    <span><strong>Elisabeth Apotheke:</strong> Schinderdam 5 · 04631 4448000</span>
                    <span><strong>Schloss-Apotheke:</strong> Bahnhofstraße 3 · 04631 3462</span>
                    <span>Weitere Einträge: Reha- und Gesundheitsangebote, Physiotherapiepraxen, Zahn- und Tierärzte.</span>
                  </div>
                  <a
                    className="family-source-link"
                    href="https://stadt.gluecksburg.de/familie/gesundheit"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Gesundheitsübersicht öffnen ↗
                  </a>
                </article>

                <article className="family-info-card">
                  <div className="family-card-head">
                    <span className="family-card-icon" aria-hidden="true">🚕</span>
                    <div>
                      <span className="dashboard-kicker">Sicher nach Hause</span>
                      <h2>Disco-Taxi</h2>
                    </div>
                  </div>
                  <p>
                    Das Disco-Taxi bringt Jugendliche und junge Erwachsene bis 27 Jahre nachts
                    günstig von Flensburg zurück. Die Fahrten starten am Flensburger ZOB.
                  </p>
                  <div className="family-facts">
                    <span><strong>Wann:</strong> Freitag auf Samstag und Samstag auf Sonntag</span>
                    <span><strong>Abfahrt:</strong> 00:30 Uhr und 03:00 Uhr</span>
                    <span><strong>Preis:</strong> 7 € pro Person</span>
                    <span><strong>Anmeldung:</strong> spätestens 1 Stunde vorher unter 0461 55555</span>
                  </div>
                  <a
                    className="family-source-link"
                    href="https://stadt.gluecksburg.de/rathaus/discotaxi"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Disco-Taxi bei der Stadt ↗
                  </a>
                </article>

                <article className="family-info-card family-info-card-wide">
                  <div className="family-card-head">
                    <span className="family-card-icon" aria-hidden="true">%</span>
                    <div>
                      <span className="dashboard-kicker">Vergünstigungen</span>
                      <h2>Sozialpass</h2>
                    </div>
                  </div>
                  <p>
                    Der Sozialpass richtet sich unter anderem an Menschen mit Bürgergeld,
                    Arbeitslosengeld, Grundsicherung, Leistungen nach dem Asylbewerberleistungsgesetz
                    sowie an Personen und Familien mit geringem Einkommen. Beantragt wird er bei
                    der bequa Flensburg.
                  </p>
                  <div className="socialpass-layout">
                    <div className="family-facts">
                      <span><strong>Mitbringen:</strong> aktuellen Leistungs- oder Einkommensnachweis und gültigen Personalausweis</span>
                      <span><strong>Gültigkeit:</strong> Januar bis Dezember des jeweiligen Kalenderjahres</span>
                      <span><strong>bequa:</strong> Nikolaistraße 3, 2. Etage, 24937 Flensburg</span>
                      <span><strong>Öffnung:</strong> Mo–Fr 08:30–13:30 Uhr · 0461 1503138</span>
                    </div>
                    <div className="family-benefits">
                      <strong>Vergünstigungen in Glücksburg</strong>
                      <span>Stadtbücherei: 100 % Ermäßigung</span>
                      <span>Fördeland Therme: 50 % Ermäßigung ohne Sauna</span>
                      <span>Glücksburg Konzerte e. V.: Eintritt 1 €</span>
                      <span>Menke-Planetarium: ermäßigter Eintritt</span>
                    </div>
                  </div>
                  <a
                    className="family-source-link"
                    href="https://stadt.gluecksburg.de/familie/sozialpass"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Voraussetzungen vollständig ansehen ↗
                  </a>
                </article>
              </div>

              <div className="source-note">
                <a
                  href="https://stadt.gluecksburg.de/familie/familienzentrum-gluecksburg"
                  target="_blank"
                  rel="noreferrer"
                >
                  Quelle und weitere Familienangebote: Stadt Glücksburg ↗
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
                <h1>Impressum & Datenschutz</h1>
                <p>Angaben nach § 5 DDG sowie ergänzende rechtliche Hinweise.</p>
              </section>

              <section className="card padded legal-card">
                <h2>Angaben gemäß § 5 DDG</h2>
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

                <h2>Verantwortlich für journalistisch-redaktionelle Inhalte</h2>
                <p>
                  Verantwortlich im Sinne von § 18 Abs. 2 MStV, soweit auf einzelne Inhalte
                  anwendbar:<br />
                  Sebastian Schwarz<br />
                  Klein Bremsberg 20<br />
                  24960 Glücksburg
                </p>

                <h2>Privates und unabhängiges Informationsangebot</h2>
                <p className="muted">
                  GlücksburgDirekt ist ein privat betriebenes, unabhängiges Informationsangebot.
                  Es handelt sich nicht um eine Website, App oder sonstige Veröffentlichung der
                  Stadt Glücksburg (Ostsee), des Amtes, des Kreises Schleswig-Flensburg, der ASF
                  oder anderer auf dieser Website genannter Stellen. Eine Zusammenarbeit,
                  Beauftragung, Billigung oder amtliche Prüfung durch diese Stellen wird nicht
                  behauptet.
                </p>

                <h2>Keine amtliche Auskunft</h2>
                <p>
                  Die auf GlücksburgDirekt dargestellten Inhalte dienen der schnellen Orientierung.
                  Rechtlich verbindliche Auskünfte, amtliche Bekanntmachungen, Satzungen,
                  Bescheide, Fristen oder behördliche Veröffentlichungen werden ausschließlich
                  durch die jeweils zuständige Stelle herausgegeben. Bei Abweichungen ist stets
                  die Originalquelle maßgeblich.
                </p>

                <h2>Aktualität und Richtigkeit der Informationen</h2>
                <p>
                  Die Inhalte werden mit angemessener Sorgfalt aus öffentlichen und externen
                  Quellen zusammengestellt und teilweise automatisiert aktualisiert. Trotz
                  regelmäßiger Synchronisierung können Übertragungsfehler, zeitliche Verzögerungen,
                  kurzfristige Änderungen oder fehlerhafte Angaben der jeweiligen Quelle nicht
                  vollständig ausgeschlossen werden.
                </p>
                <ul className="legal-list">
                  <li>
                    <strong>Müllabfuhr:</strong> Abfuhrtermine werden aus Daten der ASF
                    aufbereitet. Für verbindliche Termine ist der aktuelle Abfuhrkalender der ASF
                    maßgeblich.
                  </li>
                  <li>
                    <strong>Veranstaltungen:</strong> Termine können verlegt, geändert oder
                    abgesagt werden. Maßgeblich sind die Angaben des jeweiligen Veranstalters bzw.
                    der verlinkten Originalquelle.
                  </li>
                  <li>
                    <strong>Rathaus und amtliche Bekanntmachungen:</strong> Die Darstellung auf
                    GlücksburgDirekt ersetzt keine amtliche Veröffentlichung.
                  </li>
                  <li>
                    <strong>Wetter:</strong> Wetterdaten dienen ausschließlich der allgemeinen
                    Information und sind keine amtliche Warnung oder Grundlage für
                    sicherheitskritische Entscheidungen.
                  </li>
                </ul>

                <h2>Haftung für eigene Inhalte</h2>
                <p>
                  Für eigene Inhalte gelten die allgemeinen gesetzlichen Vorschriften. Eine
                  Haftung für Schäden aus der Nutzung rein informatorischer Inhalte besteht nur
                  im Rahmen der gesetzlichen Voraussetzungen. Zwingende gesetzliche
                  Haftungstatbestände, insbesondere bei Vorsatz, grober Fahrlässigkeit sowie bei
                  Verletzung von Leben, Körper oder Gesundheit, bleiben unberührt.
                </p>

                <h2>Externe Links</h2>
                <p>
                  GlücksburgDirekt enthält Links zu Websites Dritter. Auf deren Inhalte und
                  zukünftige Änderungen besteht kein Einfluss. Für fremde Inhalte ist grundsätzlich
                  der jeweilige Anbieter verantwortlich. Bei Bekanntwerden konkreter
                  Rechtsverletzungen werden entsprechende Links nach Prüfung entfernt.
                </p>

                <h2>Urheberrecht, Marken und Quellen</h2>
                <p>
                  Eigene Texte, Gestaltung und sonstige eigene Inhalte unterliegen dem geltenden
                  Urheberrecht. Inhalte, Daten, Namen, Logos und Marken Dritter verbleiben bei den
                  jeweiligen Rechteinhabern und werden nur im Rahmen der jeweils zulässigen Nutzung
                  bzw. Quellenangabe verwendet. Eine Nennung fremder Marken oder Einrichtungen
                  bedeutet keine wirtschaftliche oder organisatorische Verbindung.
                </p>
                <p>
                  Wetterdaten:{" "}
                  <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                    Open-Meteo
                  </a>{" "}
                  (CC BY 4.0).
                </p>

                <h2>Keine Fachberatung</h2>
                <p>
                  Die Inhalte stellen keine Rechts-, Steuer-, Medizin-, Sozial-, Finanz- oder
                  sonstige individuelle Fachberatung dar. Insbesondere Informationen im Bereich
                  Gesundheit ersetzen keine Untersuchung oder Beratung durch medizinisches
                  Fachpersonal.
                </p>

                <h2>Verbraucherstreitbeilegung</h2>
                <p>
                  Soweit die Vorschriften des Verbraucherstreitbeilegungsgesetzes auf dieses
                  Angebot Anwendung finden, ist der Betreiber weder verpflichtet noch bereit, an
                  einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
                  teilzunehmen.
                </p>

                <div className="legal-divider" />

                <h2>Datenschutzhinweise</h2>
                <p>
                  Verantwortlicher für die Datenverarbeitung auf dieser Website ist der oben
                  genannte Betreiber. Die Website ist so ausgelegt, dass nur die für Betrieb und
                  angeforderte Funktionen erforderlichen Daten verarbeitet werden. Aktuell werden
                  keine Werbenetzwerke oder werbebasierten Nutzerprofile eingesetzt. Für eine
                  datensparsame Reichweiten- und Nutzungsanalyse wird Vercel Web Analytics verwendet.
                </p>

                <h3>Hosting über Vercel</h3>
                <p>
                  Die Website wird über Vercel Inc., 440 N Barranca Avenue #4133, Covina,
                  CA 91723, USA, bereitgestellt. Beim Aufruf können technisch erforderliche
                  Verbindungs- und Protokolldaten verarbeitet werden, insbesondere IP-Adresse,
                  Zeitpunkt, angeforderte Ressource, Browser- und Geräteinformationen. Die
                  Verarbeitung dient der sicheren und zuverlässigen Bereitstellung der Website
                  und erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
                </p>
                <p>
                  <a
                    href="https://vercel.com/legal/privacy-notice"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Datenschutzhinweise von Vercel ↗
                  </a>
                </p>

                <h3>Reichweitenmessung mit Vercel Web Analytics</h3>
                <p>
                  GlücksburgDirekt nutzt Vercel Web Analytics, um aggregierte Besucher-,
                  Seitenaufruf- und ausgewählte Interaktionszahlen auszuwerten, beispielsweise
                  das Öffnen eines Bereichs oder das Laden des Müllkalenders. Dabei werden keine
                  Straßennamen oder Hausnummern als Analyseereignisse übermittelt. Der Dienst
                  arbeitet ohne klassische
                  Tracking-Cookies und ist nicht darauf ausgelegt, Besucher über verschiedene
                  Websites hinweg zu verfolgen. Die Auswertung dient dazu, zu erkennen, welche
                  Bereiche der Website genutzt werden und das Angebot entsprechend zu verbessern.
                  Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt
                  in der Reichweitenmessung und Optimierung dieses lokalen Informationsangebots.
                </p>

                <h3>Datenbank und Backend über Supabase</h3>
                <p>
                  Für Datenbankabfragen und technische Backend-Funktionen wird Supabase genutzt.
                  Dabei können technisch erforderliche Verbindungsdaten wie IP-Adresse,
                  Zeitstempel und Request-Metadaten verarbeitet werden. Supabase weist für
                  europäische Nutzer auf mögliche Datenübermittlungen in die USA und nach
                  Singapur unter Verwendung geeigneter Garantien, insbesondere
                  Standardvertragsklauseln, hin. Rechtsgrundlage für die Nutzung im Rahmen dieser
                  Website ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse besteht in
                  einer sicheren und funktionsfähigen Bereitstellung des Angebots.
                </p>
                <p>
                  <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
                    Datenschutzhinweise von Supabase ↗
                  </a>
                </p>

                <h3>Gespeicherte Adresse und Müllkalender</h3>
                <p>
                  Wenn eine Straße für die Müllabfuhr ausgewählt wird, speichert der Browser diese
                  Auswahl sowie die zuletzt geladenen Abfuhrtermine lokal auf dem verwendeten
                  Gerät. Dies dient ausschließlich dazu, die gewünschte Auswahl bei einem späteren
                  Besuch wiederherzustellen. Die lokale Speicherung kann durch Löschen der Browser-
                  bzw. Website-Daten entfernt werden.
                </p>
                <p>
                  Zur Aktualisierung der Abfuhrtermine wird die technische Kennung der ausgewählten
                  Straße an das Backend übertragen. Das Backend verwendet, soweit von der ASF
                  angeboten, automatisch den allgemeinen Eintrag „Alle Hausnummern“. Eine konkrete
                  Hausnummer wird vom Nutzer nicht abgefragt. Für die technische Zuordnung des
                  abgerufenen ASF-Kalenders wird serverseitig ein kryptografischer Hash verwendet.
                  Die Daten werden nicht für Werbung oder Profilbildung genutzt.
                </p>

                <h3>Lokale Speicherung im Browser</h3>
                <p>
                  Für die ausdrücklich gewünschte Funktion „Adresse und Mülltermine merken“ nutzt
                  GlücksburgDirekt den Local Storage des Browsers. Die Speicherung dient der
                  Bereitstellung dieser Funktion. Es werden derzeit keine Analyse- oder
                  Marketing-Cookies eingesetzt.
                </p>

                <h3>Wetterdaten von Open-Meteo</h3>
                <p>
                  Für die Wetteranzeige wird die API der OpenMeteo GmbH, Hintere Schilligmatte 6,
                  6463 Bürglen (UR), Schweiz, aufgerufen. Dabei werden feste Koordinaten für
                  Glücksburg übertragen – nicht der aktuelle Standort des Nutzers. Wie bei jeder
                  direkten Internetverbindung erhält Open-Meteo technisch die IP-Adresse des
                  aufrufenden Geräts. Open-Meteo gibt an, Server-Logdateien der kostenlosen API
                  nach spätestens 90 Tagen zu löschen.
                </p>
                <p>
                  <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">
                    Datenschutz und Nutzungsbedingungen von Open-Meteo ↗
                  </a>
                </p>

                <h3>Kontakt per E-Mail</h3>
                <p>
                  Bei einer Kontaktaufnahme per E-Mail werden die übermittelten Daten
                  einschließlich Absenderadresse und Inhalt der Nachricht verarbeitet, soweit dies
                  zur Bearbeitung der Anfrage erforderlich ist. Rechtsgrundlage ist je nach Inhalt
                  Art. 6 Abs. 1 lit. b oder lit. f DSGVO. Die Daten werden gelöscht, sobald sie für
                  den jeweiligen Zweck nicht mehr erforderlich sind und keine gesetzlichen
                  Aufbewahrungspflichten entgegenstehen.
                </p>

                <h3>Externe Links</h3>
                <p>
                  Externe Anbieter werden grundsätzlich erst durch einen bewussten Klick auf einen
                  entsprechenden Link aufgerufen. Ab diesem Zeitpunkt gelten die
                  Datenschutzbestimmungen des jeweiligen Drittanbieters.
                </p>

                <h3>SSL-/TLS-Verschlüsselung</h3>
                <p>
                  Die Website wird verschlüsselt über HTTPS übertragen. Dadurch werden Daten
                  zwischen Browser und Website gegen ein einfaches Mitlesen auf dem
                  Übertragungsweg geschützt.
                </p>

                <h3>Betroffenenrechte</h3>
                <p>
                  Soweit personenbezogene Daten verarbeitet werden, bestehen nach Maßgabe der
                  gesetzlichen Voraussetzungen insbesondere Rechte auf Auskunft (Art. 15 DSGVO),
                  Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der
                  Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) und
                  Widerspruch (Art. 21 DSGVO). Eine erteilte Einwilligung kann mit Wirkung für die
                  Zukunft widerrufen werden.
                </p>

                <h3>Beschwerderecht</h3>
                <p>
                  Es besteht das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren.
                  Für Schleswig-Holstein ist zuständig:
                </p>
                <p>
                  Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein (ULD)<br />
                  Holstenstraße 98<br />
                  24103 Kiel<br />
                  Telefon: 0431 988-1200<br />
                  E-Mail:{" "}
                  <a href="mailto:mail@datenschutzzentrum.de">
                    mail@datenschutzzentrum.de
                  </a>
                  <br />
                  <a
                    href="https://www.datenschutzzentrum.de/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    www.datenschutzzentrum.de ↗
                  </a>
                </p>

                <h2>Änderungen dieser Hinweise</h2>
                <p>
                  Diese rechtlichen Hinweise werden angepasst, wenn sich Funktionen,
                  Datenverarbeitungen, verwendete Dienste oder die maßgebliche Rechtslage ändern.
                </p>

                <p className="legal-updated">Stand: 21. September 2026</p>
              </section>
            </>
          )}

          <footer className="site-footer">
            <div className="footer-seo-links" aria-label="Wichtige Bereiche">
              <a href="/muellabfuhr">Müllkalender Glücksburg</a>
              <a href="/veranstaltungen">Veranstaltungen Glücksburg</a>
              <a href="/familie">Familie in Glücksburg</a>
              <a href="/rathaus">Rathaus Glücksburg</a>
            </div>
            <div className="footer-note">
              <span>GlücksburgDirekt ist ein privates, unabhängiges Informationsangebot.</span>
              <span>Kein offizielles Angebot der Stadt Glücksburg (Ostsee).</span>
            </div>
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
