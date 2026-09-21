"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Street = {
  id: string;
  name: string;
  asf_ort_number?: number | null;
  asf_street_number?: number | null;
};

type HouseNumber = {
  id: string;
  label: string;
};

type WasteEvent = {
  type: string;
  date: string;
};

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value + "T12:00:00"));
}

function wasteClass(type: string) {
  if (type === "Restmüll") return "waste-rest";
  if (type === "Biomüll") return "waste-bio";
  if (type === "Papier") return "waste-paper";
  if (type === "Gelbe Tonne") return "waste-yellow";
  return "";
}

export default function HomePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [streets, setStreets] = useState<Street[]>([]);
  const [selectedStreet, setSelectedStreet] = useState("");
  const [houseNumbers, setHouseNumbers] = useState<HouseNumber[]>([]);
  const [selectedHouseNumber, setSelectedHouseNumber] = useState("");
  const [wasteEvents, setWasteEvents] = useState<WasteEvent[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [familyOnly, setFamilyOnly] = useState(true);
  const [civic, setCivic] = useState<CivicInfo | null>(null);
  const [loadingStreet, setLoadingStreet] = useState(false);
  const [loadingWaste, setLoadingWaste] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) return;

    async function loadBaseData() {
      const [{ data: streetRows }, { data: eventRows }, { data: civicRows }] = await Promise.all([
        supabase
          .from("streets")
          .select("id,name,asf_ort_number,asf_street_number")
          .order("name"),
        supabase
          .from("events")
          .select("id,title,description,category,date,end_date,time,location,organizer,family_friendly,source_url")
          .eq("status", "published")
          .gte("date", new Date().toISOString().slice(0, 10))
          .order("date")
          .limit(300),
        supabase
          .from("civic_info")
          .select("title,data,source_url")
          .eq("key", "buergerbuero")
          .maybeSingle(),
      ]);

      setStreets((streetRows ?? []) as Street[]);
      setEvents((eventRows ?? []) as EventRow[]);
      setCivic((civicRows ?? null) as CivicInfo | null);
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
        setHouseNumbers((data?.house_numbers ?? []) as HouseNumber[]);
      }
      setLoadingStreet(false);
    }

    loadHouseNumbers();
  }, [selectedStreet, supabase]);

  async function loadWaste() {
    if (!supabase || !selectedStreet || !selectedHouseNumber) return;

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
    }
    setLoadingWaste(false);
  }

  const filteredEvents = events.filter((event) => !familyOnly || event.family_friendly);

  const selectedStreetName = streets.find((street) => street.id === selectedStreet)?.name;
  const selectedHouseNumberLabel = houseNumbers.find((h) => h.id === selectedHouseNumber)?.label;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <span className="eyebrow">Glücksburg · lokal & aktuell</span>
          <h1>Glücksburg Direkt</h1>
          <p>
            Müllabfuhr, Veranstaltungen und Rathausinformationen an einem Ort –
            für deinen Alltag in Glücksburg.
          </p>
        </div>
        <div className="hero-badge">Privates Informationsangebot</div>
      </section>

      {!supabase && (
        <div className="notice error">
          Supabase ist nicht konfiguriert. Bitte die Vercel-Umgebungsvariablen prüfen.
        </div>
      )}

      <section className="grid two">
        <article className="card">
          <div className="card-head">
            <div>
              <span className="kicker">Meine Adresse</span>
              <h2>Straße & Hausnummer</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Straße
              <select
                value={selectedStreet}
                onChange={(event) => setSelectedStreet(event.target.value)}
              >
                <option value="">Straße auswählen</option>
                {streets.map((street) => (
                  <option key={street.id} value={street.id}>
                    {street.name}
                  </option>
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
                  <option key={house.id} value={house.id}>
                    {house.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="primary"
              onClick={loadWaste}
              disabled={!selectedStreet || !selectedHouseNumber || loadingWaste}
            >
              {loadingWaste ? "Abfuhrtermine laden …" : "Abfuhrtermine anzeigen"}
            </button>
          </div>

          <p className="hint">
            Die Hausnummer wird nur für die aktuelle ASF-Abfrage verwendet und nicht im
            Klartext gespeichert.
          </p>
        </article>

        <article className="card">
          <div className="card-head">
            <div>
              <span className="kicker">Abfallkalender</span>
              <h2>Deine nächsten Abholungen</h2>
            </div>
          </div>

          {selectedStreetName && selectedHouseNumberLabel && (
            <p className="selection">
              {selectedStreetName} · {selectedHouseNumberLabel}
            </p>
          )}

          {wasteEvents.length ? (
            <div className="waste-list">
              {wasteEvents.slice(0, 12).map((entry, index) => (
                <div className="waste-row" key={entry.date + entry.type + index}>
                  <span className={"waste-dot " + wasteClass(entry.type)} />
                  <div>
                    <strong>{entry.type}</strong>
                    <span>{formatDate(entry.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              Wähle Straße und Hausnummer aus, um die aktuellen ASF-Termine zu laden.
            </div>
          )}
        </article>
      </section>

      {notice && <div className="notice">{notice}</div>}

      <section className="card events-card">
        <div className="card-head events-head">
          <div>
            <span className="kicker">Aktuell in Glücksburg</span>
            <h2>Veranstaltungen</h2>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={familyOnly}
              onChange={(event) => setFamilyOnly(event.target.checked)}
            />
            Nur familienfreundlich
          </label>
        </div>

        <div className="event-grid">
          {filteredEvents.slice(0, 18).map((event) => (
            <article className="event-card" key={event.id}>
              <div className="event-meta">
                <span>{formatDate(event.date)}</span>
                {event.time && <span>{event.time} Uhr</span>}
              </div>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <div className="event-footer">
                <span>{event.location || "Glücksburg"}</span>
                {event.family_friendly && <strong>Familie</strong>}
              </div>
            </article>
          ))}
        </div>

        {!filteredEvents.length && (
          <div className="empty">Aktuell wurden keine passenden Veranstaltungen gefunden.</div>
        )}
      </section>

      <section className="card civic-card">
        <div className="card-head">
          <div>
            <span className="kicker">Rathaus</span>
            <h2>{civic?.title || "Bürgerbüro Glücksburg"}</h2>
          </div>
        </div>

        <div className="civic-grid">
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
          <div>
            <strong>Kontakt</strong>
            {civic?.data?.email ? (
              <a href={"mailto:" + civic.data.email}>{civic.data.email}</a>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        <div className="actions">
          {civic?.data?.appointment_url && (
            <a className="primary link-button" href={civic.data.appointment_url} target="_blank">
              Online-Termin
            </a>
          )}
          {civic?.source_url && (
            <a className="secondary link-button" href={civic.source_url} target="_blank">
              Quelle Stadt Glücksburg
            </a>
          )}
        </div>
      </section>

      <footer>
        <p>
          GlücksburgDirekt ist ein privates, unabhängiges Informationsangebot und kein
          offizielles Angebot der Stadt Glücksburg (Ostsee).
        </p>
        <p>Quellen: ASF Schleswig-Flensburg · kulturbytes · Stadt Glücksburg</p>
      </footer>
    </main>
  );
}
