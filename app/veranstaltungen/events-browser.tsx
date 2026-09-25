"use client";

import { useMemo, useState } from "react";
import styles from "./events.module.css";

export type CalendarEvent = {
  key: string;
  title: string;
  date: string;
  endDate: string | null;
  time: string | null;
  location: string | null;
  organizer: string | null;
  region: string;
  sourceUrl: string | null;
  calendarUrl: string;
  sourceLabel: string;
};

type RangeFilter = "all" | "today" | "tomorrow" | "weekend" | "next-week";

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return isoDate(date);
}

function rangeFor(filter: RangeFilter, today: string) {
  if (filter === "today") return { start: today, end: today };
  if (filter === "tomorrow") {
    const tomorrow = addDays(today, 1);
    return { start: tomorrow, end: tomorrow };
  }

  const current = parseDate(today);
  const weekday = current.getDay();

  if (filter === "weekend") {
    const daysUntilSaturday = weekday === 0 ? -1 : weekday === 6 ? 0 : 6 - weekday;
    const saturday = addDays(today, daysUntilSaturday);
    return { start: saturday, end: addDays(saturday, 1) };
  }

  if (filter === "next-week") {
    const daysUntilNextMonday = weekday === 0 ? 1 : 8 - weekday;
    const monday = addDays(today, daysUntilNextMonday);
    return { start: monday, end: addDays(monday, 6) };
  }

  return null;
}

function overlaps(event: CalendarEvent, start: string, end: string) {
  const eventEnd = event.endDate ?? event.date;
  return event.date <= end && eventEnd >= start;
}

function dateLabel(start: string, end?: string | null) {
  const format = (value: string) =>
    new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parseDate(value));

  if (end && end !== start) return `${format(start)} – ${format(end)}`;
  return format(start);
}

const ranges: Array<{ id: RangeFilter; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "today", label: "Heute" },
  { id: "tomorrow", label: "Morgen" },
  { id: "weekend", label: "Wochenende" },
  { id: "next-week", label: "Nächste Woche" },
];

export default function EventsBrowser({
  events,
  today,
}: {
  events: CalendarEvent[];
  today: string;
}) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeFilter>("all");
  const [region, setRegion] = useState("Alle Orte");

  const locations = useMemo(
    () =>
      ["Alle Orte", ...Array.from(new Set(events.map((event) => event.region))).sort((a, b) =>
        a.localeCompare(b, "de")
      )],
    [events]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    const selectedRange = rangeFor(range, today);

    return events.filter((event) => {
      const matchesQuery =
        !needle ||
        [event.title, event.location, event.organizer, event.region, event.sourceLabel]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("de")
          .includes(needle);

      const matchesRegion = region === "Alle Orte" || event.region === region;
      const matchesRange =
        !selectedRange || overlaps(event, selectedRange.start, selectedRange.end);

      return matchesQuery && matchesRegion && matchesRange;
    });
  }, [events, query, range, region, today]);

  const reset = () => {
    setQuery("");
    setRange("all");
    setRegion("Alle Orte");
  };

  return (
    <>
      <section className={styles.filters} aria-label="Veranstaltungen filtern">
        <label className={styles.searchField}>
          <span>Veranstaltung suchen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="z. B. Markt, Musik, Kinder …"
          />
        </label>

        <div className={styles.quickFilters} aria-label="Zeitraum">
          {ranges.map((item) => (
            <button
              type="button"
              key={item.id}
              className={range === item.id ? styles.filterActive : ""}
              aria-pressed={range === item.id}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className={styles.placeFilter}>
          <span>Ort</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {locations.map((location) => (
              <option value={location} key={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.eventSection}>
        <div className={styles.sectionHead}>
          <div>
            <span className="foerde-kicker">Gefilterte Termine</span>
            <h2>Veranstaltungen</h2>
          </div>
          <span>{visible.length} {visible.length === 1 ? "Termin" : "Termine"}</span>
        </div>

        {visible.length ? (
          <div className={styles.eventGrid}>
            {visible.map((event) => (
              <article className={styles.eventCard} key={event.key}>
                <div className={styles.eventDate}>
                  <span>{dateLabel(event.date, event.endDate)}</span>
                  <small>{event.region}</small>
                </div>
                <div className={styles.eventCopy}>
                  <h3>{event.title}</h3>
                  <p>
                    {event.time ? `${String(event.time).slice(0, 5)} Uhr` : "Uhrzeit siehe Quelle"}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  <small>
                    {event.organizer ? `${event.organizer} · ` : ""}
                    {event.sourceLabel}
                  </small>
                </div>
                <div className={styles.eventActions}>
                  {event.sourceUrl ? (
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Details ↗
                    </a>
                  ) : (
                    <span className={styles.noSource}>Keine Originalseite hinterlegt</span>
                  )}
                  <a href={event.calendarUrl}>📅 iCal</a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>Keine passenden Termine gefunden.</strong>
            <p>Ändere Suche, Zeitraum oder Ort.</p>
            <button type="button" onClick={reset}>
              Filter zurücksetzen
            </button>
          </div>
        )}
      </section>
    </>
  );
}
