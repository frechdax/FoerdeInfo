"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./live-data.module.css";

type ModuleStatus = "live" | "partial" | "unavailable";

type LiveModule = {
  status: ModuleStatus;
  value: string;
  detail: string;
  updatedAt: string | null;
  source: string;
  sourceUrl: string;
  items?: Array<{ label: string; value: string; meta?: string }>;
};

type LiveData = {
  updatedAt: string;
  place: { id: string; name: string; latitude: number; longitude: number };
  modules: Record<string, LiveModule>;
};

const places = [
  { id: "flensburg", name: "Flensburg" },
  { id: "wassersleben", name: "Wassersleben" },
  { id: "gluecksburg", name: "Glücksburg" },
  { id: "langballig", name: "Langballig" },
];

const moduleMeta: Record<
  string,
  { icon: string; title: string; usefulness: string; tone: "high" | "good" | "possible" }
> = {
  parking: {
    icon: "🚗",
    title: "Parkplatzbelegung",
    usefulness: "sehr interessant",
    tone: "high",
  },
  visitors: {
    icon: "👥",
    title: "Besucherzählung",
    usefulness: "sehr interessant",
    tone: "high",
  },
  charging: {
    icon: "⚡",
    title: "E-Ladesäulen",
    usefulness: "sehr gut nutzbar",
    tone: "high",
  },
  traffic: {
    icon: "🚦",
    title: "Verkehr",
    usefulness: "gut nutzbar",
    tone: "good",
  },
  transit: {
    icon: "🚌",
    title: "ÖPNV",
    usefulness: "gut nutzbar",
    tone: "good",
  },
  sharing: {
    icon: "🚲",
    title: "Sharing",
    usefulness: "möglich",
    tone: "possible",
  },
};

function formatTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toneClass(tone: "high" | "good" | "possible") {
  if (tone === "high") return styles.high;
  if (tone === "good") return styles.good;
  return styles.possible;
}

function statusClass(status: ModuleStatus) {
  if (status === "live") return styles.live;
  if (status === "partial") return styles.partial;
  return styles.research;
}

function statusLabel(status: ModuleStatus) {
  if (status === "live") return "Live";
  if (status === "partial") return "Teilweise live";
  return "Keine Live-Daten";
}

export default function LiveDataDashboard() {
  const [place, setPlace] = useState("flensburg");
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/live-daten?ort=" + encodeURIComponent(place), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Live-Daten konnten nicht geladen werden.");
        setData((await response.json()) as LiveData);
      } catch (reason) {
        if ((reason as Error).name !== "AbortError") {
          setError("Live-Daten konnten für diesen Ort gerade nicht geladen werden.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [place]);

  const entries = useMemo(
    () =>
      Object.entries(moduleMeta).map(([id, meta]) => ({
        id,
        meta,
        module: data?.modules[id] ?? null,
      })),
    [data]
  );

  return (
    <>
      <section className={styles.placePicker} aria-label="Ort für Live-Daten auswählen">
        <span>Ort auswählen</span>
        <div>
          {places.map((item) => (
            <button
              type="button"
              key={item.id}
              className={place === item.id ? styles.placeActive : ""}
              aria-pressed={place === item.id}
              onClick={() => setPlace(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.statusPanel} aria-label="Status der Live-Daten">
        <div>
          <span
            className={styles.statusDot + " " + (data && !error ? styles.statusDotLive : "")}
            aria-hidden="true"
          />
          <span>
            <strong>
              {loading && !data
                ? "Live-Daten werden geladen"
                : data
                  ? "Live-Daten für " + data.place.name
                  : "Live-Daten nicht erreichbar"}
            </strong>
            <small>
              {data
                ? "Automatische Aktualisierung jede Minute · Stand " +
                  (formatTime(data.updatedAt) ?? "gerade") +
                  " Uhr"
                : "Jede Kachel zeigt nur Werte, die die jeweilige Quelle tatsächlich liefert."}
            </small>
          </span>
        </div>
        <span className={styles.experimental}>Pilotseite · nicht indexiert</span>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <section className={styles.grid} aria-label="Live-Daten">
        {entries.map(({ id, meta, module }) => (
          <article className={styles.card} key={id}>
            <div className={styles.cardTop}>
              <span className={styles.icon} aria-hidden="true">{meta.icon}</span>
              <span className={styles.usefulness + " " + toneClass(meta.tone)}>
                {meta.usefulness}
              </span>
            </div>

            <div className={styles.titleRow}>
              <div>
                <h2>{meta.title}</h2>
                <span className={styles.region}>
                  📍 {data?.place.name ?? places.find((item) => item.id === place)?.name}
                </span>
              </div>
            </div>

            <div className={styles.liveValue}>
              <small>{module ? statusLabel(module.status) : "wird geladen"}</small>
              <strong>{module?.value ?? "—"}</strong>
              {module?.updatedAt ? (
                <span>Stand {formatTime(module.updatedAt) ?? "aktuell"} Uhr</span>
              ) : null}
            </div>

            <p>{module?.detail ?? "Datenquelle wird abgefragt."}</p>

            {module?.items?.length ? (
              <div className={styles.itemList}>
                {module.items.map((item, index) => (
                  <div key={item.label + index}>
                    <span>
                      <strong>{item.label}</strong>
                      {item.meta ? <small>{item.meta}</small> : null}
                    </span>
                    <b>{item.value}</b>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={styles.dataStatus + " " + statusClass(module?.status ?? "unavailable")}>
              <span aria-hidden="true">
                {module?.status === "live" ? "●" : module?.status === "partial" ? "◐" : "○"}
              </span>
              <span>
                <strong>{module ? statusLabel(module.status) : "Wird geladen"}</strong>
                <small>{module?.source ?? "Quelle wird ermittelt"}</small>
              </span>
            </div>

            {module?.sourceUrl ? (
              <a
                className={styles.cardLink}
                href={module.sourceUrl}
                target={module.sourceUrl.startsWith("/") ? undefined : "_blank"}
                rel={module.sourceUrl.startsWith("/") ? undefined : "noopener noreferrer"}
              >
                Quelle öffnen ↗
              </a>
            ) : null}
          </article>
        ))}
      </section>
    </>
  );
}
