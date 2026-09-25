"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { track } from "@vercel/analytics";
import { stay22AccommodationUrl, stay22AffiliateEnabled } from "@/lib/stay22";
import LiveDashboard from "@/app/live/LiveDashboard";

type View =
  | "home"
  | "events"
  | "urlaub"
  | "urlaub-unterkunft"
  | "urlaub-essen"
  | "urlaub-freizeit"
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

type PharmacyDuty = {
  pharmacy_name: string;
  street: string;
  postal_code: string;
  city: string;
  duty_start: string;
  duty_end: string;
  distance_km?: number | null;
  source_url: string;
  last_synced_at: string;
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

function formatDutyDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(",", "");
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

function trackUsageEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;

  let statisticsAllowed = false;
  try {
    const stored = JSON.parse(
      localStorage.getItem("gluecksburg-direkt-consent-v1") || "null"
    ) as { statistics?: boolean } | null;
    statisticsAllowed = stored?.statistics === true;
  } catch {}

  if (!statisticsAllowed) return;

  track(name, properties);

  const gtag = (
    window as Window & {
      gtag?: (...args: unknown[]) => void;
    }
  ).gtag;

  if (!gtag) return;

  const eventName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  gtag("event", eventName, properties || {});
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

const vacationRestaurants = [
  {
    name: "Glückselig Strandrestaurant",
    detail: "Mediterrane Strandküche · direkt am Wasser",
    address: "Schwennaustraße 41",
    href: "https://www.glueck-in-sicht.de/restaurants/glueckselig-strandrestaurant",
    icon: "🌊",
  },
  {
    name: "Gudlak Restaurant & Bar",
    detail: "Euro-asiatische Fusionsküche · Fördeblick",
    address: "Fördestraße 2–4",
    href: "https://www.glueck-in-sicht.de/restaurants",
    icon: "🍽️",
  },
  {
    name: "Quellental Café & Restaurant",
    detail: "Regionale Küche, Fisch & Café · am Yachthafen",
    address: "Im Quellental 1",
    href: "https://www.quellental-gluecksburg.de/",
    icon: "⚓",
  },
  {
    name: "Ristorante San Remo",
    detail: "Italienische Küche · Strandlage in Holnis",
    address: "Drei 5",
    href: "https://sanremo-gluecksburg.de/",
    icon: "🍝",
  },
  {
    name: "Restaurant Scheune",
    detail: "Restaurant mitten in Glücksburg",
    address: "Schinderdam 7",
    href: "https://www.scheunegluecksburg.de/",
    icon: "🥘",
  },
  {
    name: "Restaurant Felix",
    detail: "Restaurant im Strandhotel Glücksburg",
    address: "Kirstenstraße 6",
    href: "https://www.strandhotelgluecksburg.de/restaurant-felix",
    icon: "✨",
  },
  {
    name: "Schlosskeller Glücksburg",
    detail: "Restaurant direkt am Wasserschloss",
    address: "Am Schloss 2",
    href: "https://www.schloss-gluecksburg.de/urlaub-genuss/ferienwohnungen-und-gastronomie",
    icon: "🏰",
  },
  {
    name: "Restaurant Pico",
    detail: "Restaurant am Postplatz im Ortszentrum",
    address: "Postplatz 3",
    href: "https://www.pico-restaurant.de/",
    icon: "🍴",
  },
] as const;

const vacationLeisureLocal = [
  {
    name: "Strände & Strandspielplätze",
    detail: "Sandburgen, Baden und Spielplätze direkt an der Förde. Strand Drei in Holnis eignet sich besonders gut für kleine Kinder, weil das Wasser dort sehr flach ausläuft.",
    meta: "Sandwig · Holnis · Schwennau",
    href: "https://www.gluecksburg-urlaub.de/entdecken/straende",
    icon: "🏖️",
    tag: "Draußen",
  },
  {
    name: "Waldspielplatz Friedeholz",
    detail: "Großzügiger Waldspielplatz mit Holzspielgeräten und viel Schatten – besonders angenehm an warmen Tagen.",
    meta: "Glücksburg",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
    icon: "🌳",
    tag: "Kostenlos",
  },
  {
    name: "Adventure Fjordgolf Holnis",
    detail: "Minigolf direkt an der Strandpromenade mit liebevoll gestalteten Bahnen rund um Glücksburg und die Flensburger Förde.",
    meta: "An der Promenade 18 · Holnis",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
    icon: "⛳",
    tag: "Familie",
  },
  {
    name: "Klimapark artefact",
    detail: "Mitmach-Stationen zu Klima, Energie und Zukunft. Drei Themenrouten machen Technik und Nachhaltigkeit spielerisch erlebbar.",
    meta: "Bremsbergallee 35",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
    icon: "🌍",
    tag: "Entdecken",
  },
  {
    name: "Skatepark Glücksburg",
    detail: "Rampen, Obstacles und Bowl für Skateboard und Scooter – geeignet für unterschiedliche Alters- und Könnensstufen.",
    meta: "Flensburger Straße",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
    icon: "🛹",
    tag: "Action",
  },
  {
    name: "Fördeland-Therme",
    detail: "Kinderwelt, flaches Kinderbecken, Leuchtturmrutsche, Familienrutsche und Außenbereich – ideal auch bei Schietwetter.",
    meta: "Sandwigstraße 1A",
    href: "https://www.gluecksburg-urlaub.de/aktiv-erleben/schwimmbaeder-wellness",
    icon: "🏊",
    tag: "Schietwetter",
  },
] as const;

const vacationLeisureTrips = [
  {
    name: "Mr. Scandis Funpark",
    detail: "Indoor- und Outdoor-Spielepark mit Klettern, Rutschen, Go-Kart, Hüpfburg und eigenem Bereich für kleine Kinder.",
    meta: "Handewitt · Skandinavien Damm 2",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
    icon: "🎠",
    tag: "Ausflug",
  },
  {
    name: "Phänomenta",
    detail: "Interaktive Science-Ausstellung mit vielen Experimenten; für 3- bis 6-Jährige gibt es eine eigene Zwergenphänomenta.",
    meta: "Flensburg · Norderstraße 157–163",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
    icon: "🔬",
    tag: "Schietwetter",
  },
  {
    name: "Danfoss Universe",
    detail: "Erlebnispark in Dänemark rund um Technik und Naturwissenschaften – mit Experimenten, Workshops und vielen Mitmachangeboten.",
    meta: "Nordborg · Dänemark",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
    icon: "🚀",
    tag: "Tagesausflug",
  },
  {
    name: "LEGOLAND Billund",
    detail: "Themenwelten, Fahrgeschäfte und Miniland für einen größeren Familien-Tagesausflug nach Dänemark.",
    meta: "Billund · Dänemark",
    href: "https://www.gluecksburg-urlaub.de/entdecken/fuer-familien",
    icon: "🧱",
    tag: "Tagesausflug",
  },
] as const;

const vacationLeisureMore = [
  {
    name: "Wassersport",
    detail: "Segeln, Surfen, Kiten, SUP und weitere Angebote auf der Innen- und Außenförde.",
    href: "https://www.gluecksburg-urlaub.de/aktiv-erleben/wassersport",
    icon: "🏄",
  },
  {
    name: "Schwimmen & Wellness",
    detail: "Badelandschaften und Wellness-Angebote in und um Glücksburg entdecken.",
    href: "https://www.gluecksburg-urlaub.de/aktiv-erleben/schwimmbaeder-wellness",
    icon: "💦",
  },
  {
    name: "Schifffahrten",
    detail: "Die Flensburger Förde vom Wasser aus erleben oder mit dem Schiff Richtung Dänemark starten.",
    href: "https://www.gluecksburg-urlaub.de/aktiv-erleben/schifffahrten",
    icon: "⛴️",
  },
] as const;

export default function HomePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [view, setView] = useState<View>("home");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pharmacyDuty, setPharmacyDuty] = useState<PharmacyDuty | null>(null);
  const [notice, setNotice] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [eventDateFilter, setEventDateFilter] = useState<EventDateFilter>("all");
  const [eventMonthFilter, setEventMonthFilter] = useState("all");
  const [weather, setWeather] = useState<WeatherNow | null>(null);

  useEffect(() => {
    const validViews: View[] = [
      "home",
      "events",
      "urlaub",
      "urlaub-unterkunft",
      "urlaub-essen",
      "urlaub-freizeit",
      "impressum",
    ];

    function syncViewFromHash() {
      const hash = window.location.hash.replace("#", "") as View;
      if (validViews.includes(hash)) {
        setView(hash);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    syncViewFromHash();
    window.addEventListener("hashchange", syncViewFromHash);


    return () => window.removeEventListener("hashchange", syncViewFromHash);
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
      const [{ data: eventRows }, { data: pharmacyRows }] = await Promise.all([
        supabase
          .from("events")
          .select("id,title,description,category,date,end_date,time,location,organizer,family_friendly,source_url")
          .eq("status", "published")
          .gte("date", today())
          .order("date")
          .limit(300),
        supabase
          .from("pharmacy_duty")
          .select("pharmacy_name,street,postal_code,city,duty_start,duty_end,distance_km,source_url,last_synced_at")
          .eq("key", "gluecksburg")
          .maybeSingle(),
      ]);

      setEvents((eventRows ?? []) as EventRow[]);

      const currentPharmacy = (pharmacyRows ?? null) as PharmacyDuty | null;
      const now = Date.now();
      const dutyIsCurrent =
        currentPharmacy &&
        new Date(currentPharmacy.duty_start).getTime() <= now &&
        now < new Date(currentPharmacy.duty_end).getTime();

      setPharmacyDuty(dutyIsCurrent ? currentPharmacy : null);
    }

    loadBaseData();
  }, [supabase]);

  function navigate(next: View) {
    trackUsageEvent("App section opened", { section: next });
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
    trackUsageEvent("Event calendar downloaded");
  }

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

  const currentEvents = events.slice(0, 4);

  const navItems: Array<{ id: View; label: string; symbol: string; href: string }> = [
    { id: "home", label: "Start", symbol: "🏠", href: "/" },
    { id: "impressum", label: "Impressum", symbol: "📄", href: "/#impressum" },
  ];

  const vacationSubItems: Array<{ id: View; label: string; symbol: string }> = [
    { id: "urlaub-unterkunft", label: "Unterkünfte", symbol: "🏡" },
    { id: "urlaub-essen", label: "Essen & Trinken", symbol: "🍽️" },
    { id: "urlaub-freizeit", label: "Freizeit", symbol: "🎯" },
  ];

  const currentLabel =
    vacationSubItems.find((item) => item.id === view)?.label ||
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
            Flensburg
            <span className="brand-direct">DIREKT</span>
          </span>
        </button>

        <div className="sidebar-location">⌖ FLENSBURG · WASSERSLEBEN · GLÜCKSBURG</div>

        <nav>
          {navItems.map((item) => (
            <div key={item.id}>
              <a
                className={
                  "nav-item " +
                  (view === item.id ||
                  (item.id === "urlaub" &&
                    (view === "urlaub-unterkunft" || view === "urlaub-essen" || view === "urlaub-freizeit"))
                    ? "active"
                    : "")
                }
                href={item.href}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(item.id);
                }}
              >
                {icon(item.symbol)}
                <span>{item.label}</span>
                {view === item.id && <span className="nav-dot" />}
              </a>

              {item.id === "urlaub" && (
                <div className="nav-submenu">
                  {vacationSubItems.map((subitem) => (
                    <button
                      key={subitem.id}
                      className={"nav-subitem " + (view === subitem.id ? "active" : "")}
                      onClick={() => navigate(subitem.id)}
                    >
                      <span className="nav-subline" />
                      <span>{subitem.symbol} {subitem.label}</span>
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
            <span>Flensburg Direkt</span>
            <span>›</span>
            <strong>{currentLabel}</strong>
          </div>

          <div className="header-live-cluster">
            <button
              className="topbar-brand"
              aria-label="Flensburg Direkt – Startseite"
              onClick={() => navigate("home")}
            >
              <span className="topbar-brand-mark" aria-hidden="true">⚓</span>
              <span className="topbar-brand-text">
                <strong>Flensburg</strong>
                <small>DIREKT</small>
              </span>
            </button>

            {pharmacyDuty ? (
              <a
                className="header-pharmacy"
                href="https://www.aponet.de/notdienstsuche/24937-Flensburg"
                target="_blank"
                rel="noreferrer"
                aria-label={`Notfallapotheke: ${pharmacyDuty.pharmacy_name}`}
              >
                <span className="header-pharmacy-icon" aria-hidden="true">💊</span>
                <span className="header-pharmacy-copy">
                  <small>Notfallapotheke · jetzt im Dienst</small>
                  <strong>{pharmacyDuty.pharmacy_name}</strong>
                  <em>bis {formatDutyDateTime(pharmacyDuty.duty_end)} Uhr</em>
                </span>
              </a>
            ) : (
              <div className="header-pharmacy header-pharmacy--loading">
                <span className="header-pharmacy-icon" aria-hidden="true">💊</span>
                <span className="header-pharmacy-copy">
                  <small>Notfallapotheke</small>
                  <strong>Aktueller Dienst wird geprüft</strong>
                </span>
              </div>
            )}
          </div>
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
            <LiveDashboard embedded />
          )}

          {view === "events" && (
            <>
              <section className="page-heading">
                <h1>Veranstaltungen</h1>
                <p>Aktuelle Termine in der Förderegion – Flensburg steht künftig im Mittelpunkt.</p>
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
                        {event.location || "Flensburg"}
                      </p>
                    </a>

                    <div className="event-row-actions">
                      <a
                        className="event-action-button event-calendar-button"
                        href={`/api/calendar/${event.id}`}
                        onClick={() => trackUsageEvent("Event calendar opened")}
                        aria-label={`${event.title} in der Kalender-App öffnen`}
                      >
                        <span className="event-action-icon" aria-hidden="true">+</span>
                        <span>Kalender</span>
                      </a>
                      {event.source_url ? (
                        <a
                          className="event-action-button event-details-button"
                          href={event.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>Mehr erfahren</span>
                          <span className="event-action-arrow" aria-hidden="true">↗</span>
                        </a>
                      ) : null}
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

          {(view === "urlaub" || view === "urlaub-unterkunft" || view === "urlaub-essen" || view === "urlaub-freizeit") && (
            <>
              <section className="page-heading">
                <div className="eyebrow">Urlaub in Glücksburg</div>
                <h1>
                  {view === "urlaub-unterkunft"
                    ? "Unterkünfte in Glücksburg"
                    : view === "urlaub-essen"
                      ? "Essen & Trinken in Glücksburg"
                      : view === "urlaub-freizeit"
                        ? "Freizeit in Glücksburg"
                        : "Glücksburg entdecken"}
                </h1>
                <p>
                  {view === "urlaub-unterkunft"
                    ? "Ferienwohnungen und Hotels für deinen Aufenthalt an der Flensburger Förde."
                    : view === "urlaub-essen"
                      ? "Restaurants, Cafés und gastronomische Angebote in Glücksburg auf einen Blick."
                      : view === "urlaub-freizeit"
                        ? "Freizeitideen, Veranstaltungen und familienfreundliche Angebote für deinen Aufenthalt in Glücksburg."
                        : "Unterkünfte, Veranstaltungen und Ideen für deinen Aufenthalt an der Flensburger Förde – kompakt an einem Ort."}
                </p>
              </section>

              <nav className="vacation-tabs" aria-label="Urlaub Unterbereiche">
                <button
                  className={view === "urlaub" ? "active" : ""}
                  onClick={() => navigate("urlaub")}
                >
                  Übersicht
                </button>
                {vacationSubItems.map((subitem) => (
                  <button
                    key={subitem.id}
                    className={view === subitem.id ? "active" : ""}
                    onClick={() => navigate(subitem.id)}
                  >
                    <span aria-hidden="true">{subitem.symbol}</span>
                    {subitem.label}
                  </button>
                ))}
              </nav>

              {view !== "urlaub-essen" && view !== "urlaub-freizeit" && (
                <section className="travel-feature-card">
                  <div className="travel-feature-icon" aria-hidden="true">🏡</div>
                  <div className="travel-feature-copy">
                    <span className="dashboard-kicker">Übernachten</span>
                    <h2>Ferienwohnungen & Hotels in Glücksburg</h2>
                    <p>
                      Vom Hotel an der Förde bis zur Ferienwohnung: Entdecke verfügbare
                      Unterkünfte für deinen Aufenthalt in Glücksburg.
                    </p>
                    <a
                      className="button primary travel-primary-action"
                      href={stay22AccommodationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Unterkünfte ansehen ↗
                    </a>
                    {stay22AffiliateEnabled ? (
                      <small>
                        Affiliate-Link über Stay22. Bei einer Buchung kann GlücksburgDirekt eine
                        Provision erhalten. Für dich entstehen dadurch keine zusätzlichen Kosten.
                      </small>
                    ) : (
                      <small>Externer Link zu Booking.com. Derzeit kein Affiliate-Link.</small>
                    )}
                  </div>
                </section>
              )}

              {view !== "urlaub-unterkunft" && view !== "urlaub-freizeit" && (
                <section className="restaurant-section">
                  <div className="restaurant-section-heading">
                    <div>
                      <span className="dashboard-kicker">Essen & genießen</span>
                      <h2>Restaurants in Glücksburg</h2>
                      <p>
                        Vom Strandrestaurant bis zum Essen am Schloss – eine Auswahl aktueller
                        Restaurants für deinen Aufenthalt in Glücksburg.
                      </p>
                    </div>
                    <span className="restaurant-heading-icon" aria-hidden="true">🍽️</span>
                  </div>

                  <div className="restaurant-list">
                    {vacationRestaurants.map((restaurant) => (
                      <a
                        className="restaurant-list-item"
                        href={restaurant.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={restaurant.name}
                      >
                        <span className="restaurant-list-icon" aria-hidden="true">
                          {restaurant.icon}
                        </span>
                        <span className="restaurant-list-copy">
                          <strong>{restaurant.name}</strong>
                          <span>{restaurant.detail}</span>
                          <small>{restaurant.address} · 24960 Glücksburg</small>
                        </span>
                        <span className="restaurant-list-arrow" aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>

                  <p className="restaurant-source-note">
                    Auswahl nach der Glücksburger Gastrokarte 2026. Öffnungszeiten und
                    Reservierung bitte direkt beim jeweiligen Restaurant prüfen.
                  </p>
                  <div className="restaurant-owner-note">
                    <div>
                      <strong>Dein Restaurant fehlt?</strong>
                      <p>
                        Du betreibst ein Restaurant, Café oder einen gastronomischen Betrieb in
                        Glücksburg und bist hier noch nicht aufgeführt? Melde dich gern bei mir,
                        damit ich den Eintrag prüfen und ergänzen kann.
                      </p>
                      <p className="restaurant-owner-email">
                        E-Mail:{" "}
                        <a href="mailto:sebastianschwarz1@icloud.de">
                          sebastianschwarz1@icloud.de
                        </a>
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {view === "urlaub" && (
                <>
                  <div className="travel-grid">
                    <article className="travel-card">
                      <span className="travel-card-icon" aria-hidden="true">📅</span>
                      <div>
                        <span className="dashboard-kicker">Erleben</span>
                        <h2>Was ist los in Glücksburg?</h2>
                        <p>
                          Konzerte, Familienangebote, Märkte und weitere aktuelle Termine
                          während deines Aufenthalts.
                        </p>
                      </div>
                      <button className="text-button" onClick={() => navigate("events")}>
                        Veranstaltungen ansehen →
                      </button>
                    </article>

                    

                  </div>

                  <p className="travel-note">
                    GlücksburgDirekt vermittelt keine Unterkünfte und ist nicht Vertragspartner
                    einer Buchung. Es gelten die Bedingungen des jeweiligen externen Anbieters.
                  </p>
                </>
              )}

              {view === "urlaub-freizeit" && (
                <div className="leisure-page" data-section="freizeit" data-deploy="2026-09-22">
                  <section className="leisure-intro-card">
                    <div>
                      <span className="dashboard-kicker">Familien & Freizeit</span>
                      <h2>Was können wir heute unternehmen?</h2>
                      <p>
                        Ideen für Sonne, Schietwetter und Tagesausflüge – direkt aus Glücksburg
                        und der näheren Umgebung.
                      </p>
                    </div>
                    <span className="leisure-intro-icon" aria-hidden="true">🎯</span>
                  </section>

                  <section className="leisure-section">
                    <div className="leisure-section-head">
                      <div>
                        <span className="dashboard-kicker">Nah dran</span>
                        <h2>Direkt in Glücksburg</h2>
                      </div>
                      <span>{vacationLeisureLocal.length} Tipps</span>
                    </div>
                    <div className="leisure-grid">
                      {vacationLeisureLocal.map((item) => (
                        <a
                          className="leisure-card"
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          key={item.name}
                        >
                          <div className="leisure-card-top">
                            <span className="leisure-card-icon" aria-hidden="true">{item.icon}</span>
                            <span className="leisure-tag">{item.tag}</span>
                          </div>
                          <div className="leisure-card-copy">
                            <h3>{item.name}</h3>
                            <p>{item.detail}</p>
                          </div>
                          <div className="leisure-card-meta">
                            <span>⌖ {item.meta}</span>
                            <span aria-hidden="true">↗</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>

                  <section className="leisure-section">
                    <div className="leisure-section-head">
                      <div>
                        <span className="dashboard-kicker">Etwas weiter</span>
                        <h2>Ausflüge in die Umgebung</h2>
                      </div>
                      <span>{vacationLeisureTrips.length} Ideen</span>
                    </div>
                    <div className="leisure-grid leisure-grid-trips">
                      {vacationLeisureTrips.map((item) => (
                        <a
                          className="leisure-card"
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          key={item.name}
                        >
                          <div className="leisure-card-top">
                            <span className="leisure-card-icon" aria-hidden="true">{item.icon}</span>
                            <span className="leisure-tag">{item.tag}</span>
                          </div>
                          <div className="leisure-card-copy">
                            <h3>{item.name}</h3>
                            <p>{item.detail}</p>
                          </div>
                          <div className="leisure-card-meta">
                            <span>⌖ {item.meta}</span>
                            <span aria-hidden="true">↗</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>

                  <section className="leisure-section">
                    <div className="leisure-section-head">
                      <div>
                        <span className="dashboard-kicker">Noch mehr erleben</span>
                        <h2>Weitere Freizeitideen</h2>
                      </div>
                    </div>
                    <div className="leisure-more-grid">
                      {vacationLeisureMore.map((item) => (
                        <a
                          className="leisure-more-card"
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          key={item.name}
                        >
                          <span className="leisure-more-icon" aria-hidden="true">{item.icon}</span>
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.detail}</small>
                          </span>
                          <span aria-hidden="true">↗</span>
                        </a>
                      ))}
                    </div>
                  </section>

                  <div className="leisure-source">
                    <span>Quelle und weitere Tipps:</span>
                    <a
                      href="https://www.gluecksburg-urlaub.de/entdecken/fuer-familien"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Familienurlaub bei glücksburg-urlaub.de ↗
                    </a>
                  </div>
                </div>
              )}
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
                  angeforderte Funktionen erforderlichen Daten verarbeitet werden. Für eine
                  Reichweiten- und Nutzungsanalyse werden Vercel Web Analytics und Google
                  Analytics 4 eingesetzt. Beide Analysedienste werden erst nach deiner Zustimmung
                  zur Kategorie „Statistik“ geladen. Google AdSense ist technisch vorbereitet, die
                  Auslieferung von
                  Werbeanzeigen ist derzeit jedoch noch deaktiviert. Vor einer Aktivierung werden
                  die hierfür erforderlichen Einwilligungs- und Datenschutzmechanismen umgesetzt.
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
                  GlücksburgDirekt nutzt Vercel Web Analytics zur Auswertung von Seitenaufrufen,
                  Besucherzahlen, Referrern, Geräte- und Browserinformationen sowie ausgewählten
                  Interaktionen, beispielsweise dem Öffnen eines Bereichs oder dem Laden des
                  Müllkalenders. Straßennamen oder andere Adressangaben werden nicht als
                  Analyseereignisse an Vercel übermittelt.
                </p>
                <p>
                  Vercel Web Analytics wird auf GlücksburgDirekt erst geladen, wenn du im
                  Datenschutz-Banner der Kategorie „Statistik“ zugestimmt hast. Die Einwilligung
                  kann jederzeit über die Schaltfläche „Datenschutz“ geändert oder widerrufen
                  werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Vercel beschreibt Web
                  Analytics als datenschutzfreundliche First-Party-Analyse ohne klassische
                  Tracking-Cookies.
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

                <h3>Google Analytics 4</h3>
                <p>
                  GlücksburgDirekt nutzt Google Analytics 4 von Google zur Auswertung der Nutzung
                  dieser Website. Dabei können insbesondere aufgerufene Seiten, technische
                  Geräte- und Browserinformationen, ungefähre Standortinformationen sowie
                  Nutzungs- und Interaktionsdaten verarbeitet werden. Google Analytics 4 kann
                  hierfür Cookies oder vergleichbare Technologien einsetzen.
                </p>
                <p>
                  Google Analytics 4 wird erst geladen, wenn du im Datenschutz-Banner der
                  Kategorie „Statistik“ zugestimmt hast. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a
                  DSGVO. Deine Einwilligung kannst du jederzeit über die Datenschutz-Einstellungen
                  mit Wirkung für die Zukunft ändern oder widerrufen. Straßennamen oder andere
                  von dir im Müllkalender ausgewählte Adressangaben werden nicht gezielt als
                  Analyseparameter an Google Analytics übermittelt.
                </p>
                <p>
                  <a
                    href="https://policies.google.com/privacy?hl=de"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Datenschutzerklärung von Google ↗
                  </a>
                </p>

                <h3>Google AdSense und Werbeanzeigen</h3>
                <p>
                  Anbieter des Dienstes ist Google. Der AdSense-Code ist auf GlücksburgDirekt
                  technisch vorbereitet, derzeit aber deaktiviert; solange die Werbeeinbindung
                  nicht aktiviert ist, werden über GlücksburgDirekt keine
                  AdSense-Anzeigenanfragen ausgelöst.
                </p>
                <p>
                  Nach einer Aktivierung kann Google im Zusammenhang mit der Anzeigenbereitstellung
                  Informationen wie IP-Adresse, Browser- und Geräteinformationen, aufgerufene
                  Seiten sowie Werbe- und Gerätekennungen verarbeiten. Google und gegebenenfalls
                  weitere Anzeigentechnologie-Anbieter können Cookies oder vergleichbare
                  Speichertechnologien einsetzen. Personalisierte Werbung kann insbesondere auf
                  früheren Aktivitäten, Interessen oder anderen von Google verwendeten Signalen
                  beruhen. Auch bei nicht personalisierten Anzeigen können Cookies oder andere
                  Kennungen beispielsweise für Frequency Capping und aggregierte Anzeigenberichte
                  eingesetzt werden.
                </p>
                <p>
                  Für Nutzer im Europäischen Wirtschaftsraum, im Vereinigten Königreich und in der
                  Schweiz wird vor einer entsprechenden Anzeigenbereitstellung eine von Google
                  zertifizierte Consent-Management-Plattform (CMP) eingesetzt, soweit dies nach den
                  anwendbaren Vorgaben erforderlich ist. Dort können Nutzer ihre Einwilligung
                  erteilen, ablehnen oder ihre Auswahl verwalten. Einwilligungspflichtige
                  Verarbeitungen erfolgen erst nach der entsprechenden Auswahl. Rechtsgrundlage
                  ist in diesen Fällen Art. 6 Abs. 1 lit. a DSGVO; eine Einwilligung kann jederzeit
                  mit Wirkung für die Zukunft widerrufen werden.
                </p>
                <p>
                  Im Rahmen der Google-Publisher-Produkte handeln der Betreiber von
                  GlücksburgDirekt und Google hinsichtlich bestimmter Verarbeitungen jeweils als
                  eigenständig Verantwortliche. Weitere Informationen zur Datenverarbeitung durch
                  Google und zu Werbeeinstellungen finden sich hier:
                </p>
                <ul className="legal-list">
                  <li>
                    <a
                      href="https://policies.google.com/privacy?hl=de"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Datenschutzerklärung von Google ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://policies.google.com/technologies/partner-sites?hl=de"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Datennutzung durch Google auf Websites von Partnern ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://adssettings.google.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Einstellungen für personalisierte Werbung bei Google ↗
                    </a>
                  </li>
                </ul>

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
                  Für die ausdrücklich gewünschte Funktion „Adresse und Mülltermine merken“ sowie
                  zum Speichern deiner Datenschutz-Auswahl nutzt GlücksburgDirekt den Local Storage
                  des Browsers. Diese technisch erforderlichen Speicherungen dienen der
                  Bereitstellung der gewünschten Funktionen. Vercel Web Analytics wird erst nach
                  Zustimmung zur Kategorie „Statistik“ geladen. Google AdSense ist derzeit
                  deaktiviert und wird auch nach einer späteren Aktivierung nur nach entsprechender
                  Einwilligung geladen.
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

                <h3>Affiliate-Links über Stay22</h3>
                <p>
                  Im Bereich Unterkünfte verwendet GlücksburgDirekt Affiliate-Links des Anbieters
                  Stay22. Der Aufruf von Stay22 erfolgt erst, wenn ein entsprechend gekennzeichneter
                  Unterkunftslink bewusst angeklickt wird. Stay22 leitet anschließend zu einem
                  passenden externen Buchungsanbieter weiter. Dabei können technisch erforderliche
                  Verbindungsdaten, insbesondere IP-Adresse, Browser- und Geräteinformationen,
                  Zeitpunkt, Zielort sowie Informationen zum angeklickten Link verarbeitet werden.
                </p>
                <p>
                  <a href="https://www.stay22.com/privacy" target="_blank" rel="noreferrer">
                    Datenschutzhinweise von Stay22 ↗
                  </a>
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

                <p className="legal-updated">Stand: 22. September 2026 · ergänzt um Datenschutz-Einstellungen, Stay22, Google AdSense und Vercel Web Analytics</p>
              </section>
            </>
          )}

          <footer className="site-footer">
            <div className="footer-note">
              <span>GlücksburgDirekt ist ein privates, unabhängiges Informationsangebot.</span>
              <span>Kein offizielles Angebot der Stadt Glücksburg (Ostsee).</span>
              <button
                type="button"
                className="footer-link"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("gluecksburg:open-consent"))
                }
              >
                Datenschutz-Einstellungen
              </button>
            </div>
          </footer>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={view === item.id ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              navigate(item.id);
            }}
          >
            <span>{item.symbol}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
