"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RadarMap from "@/components/RadarMap";
import type { StopPoint, Vehicle } from "@/lib/types";

type Payload = { updatedAt: string; vehicles: Vehicle[] };
type Area = "all" | "flensburg" | "schleswig" | "region";
type RouteEndpoint = { id: string; name: string; latitude: number; longitude: number; departure?: string; arrival?: string };
type RouteInfo = { start?: RouteEndpoint | null; end?: RouteEndpoint | null };

function ageLabel(timestamp?: string) {
  if (!timestamp) return "–";
  const s = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (s < 5) return "gerade eben";
  if (s < 60) return `vor ${s} Sek.`;
  return `vor ${Math.floor(s / 60)} Min.`;
}

function cityMatch(v: Vehicle, area: Area) {
  if (area === "all" || area === "region") return true;
  if (area === "flensburg") return v.latitude > 54.70;
  return v.latitude <= 54.70 && v.latitude > 54.38;
}

export default function BusKarteApp({ initialVehicles = [], initialUpdatedAt }: { initialVehicles?: Vehicle[]; initialUpdatedAt?: string }) {
  const [fastVehicles, setFastVehicles] = useState<Vehicle[]>(initialVehicles);
  const [realtimeVehicles, setRealtimeVehicles] = useState<Vehicle[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(initialUpdatedAt);
  const [realtimePending, setRealtimePending] = useState(true);
  const [selected, setSelected] = useState<Vehicle>();
  const [selectedRoute, setSelectedRoute] = useState<string>();
  const [routeGeometry, setRouteGeometry] = useState<{ type: "LineString"; coordinates: number[][] } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({});
  const [routeFocus, setRouteFocus] = useState(false);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<Area>("all");
  const [accuracy, setAccuracy] = useState<"all" | "gps" | "realtime" | "estimated">("all");
  const [stops, setStops] = useState<StopPoint[]>([]);
  const [streamState, setStreamState] = useState<"live" | "polling" | "offline">(initialVehicles.length ? "polling" : "offline");
  const [mobilePanel, setMobilePanel] = useState(false);

  const vehicles = useMemo(() => {
    const quality = (v: Vehicle) => v.accuracyType === "gps" ? 3 : v.accuracyType === "realtime" ? 2 : 1;
    const byTrip = new Map<string, Vehicle>();
    for (const vehicle of [...fastVehicles, ...realtimeVehicles]) {
      const key = vehicle.tripId || vehicle.id;
      const existing = byTrip.get(key);
      if (!existing || quality(vehicle) > quality(existing)) byTrip.set(key, vehicle);
    }
    return [...byTrip.values()];
  }, [fastVehicles, realtimeVehicles]);

  const applyFastPayload = useCallback((payload: Payload) => {
    setFastVehicles(payload.vehicles || []);
    setUpdatedAt((current) => !current || new Date(payload.updatedAt) > new Date(current) ? payload.updatedAt : current);
  }, []);

  const applyRealtimePayload = useCallback((payload: Payload) => {
    setRealtimeVehicles(payload.vehicles || []);
    setUpdatedAt((current) => !current || new Date(payload.updatedAt) > new Date(current) ? payload.updatedAt : current);
    setRealtimePending(false);
  }, []);

  useEffect(() => {
    fetch("/api/stops?limit=500").then((r) => r.json()).then((x) => setStops(x.stops || [])).catch(() => {});

    let cancelled = false;
    let fastTimer: ReturnType<typeof setInterval> | undefined;
    let realtimeTimer: ReturnType<typeof setInterval> | undefined;
    let realtimeInFlight = false;

    const loadFast = async () => {
      try {
        const response = await fetch("/api/vehicles/fast");
        if (!response.ok) throw new Error("Fast vehicle endpoint failed");
        const payload = await response.json();
        if (!cancelled) {
          applyFastPayload(payload);
          setStreamState("polling");
        }
      } catch {
        if (!cancelled) setStreamState((state) => state === "live" ? state : "offline");
      }
    };

    const loadRealtime = async () => {
      if (realtimeInFlight) return;
      realtimeInFlight = true;
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 55_000);
        const response = await fetch("/api/vehicles/realtime", { signal: controller.signal });
        window.clearTimeout(timer);
        if (!response.ok) throw new Error("Realtime endpoint failed");
        const payload = await response.json();
        if (!cancelled) {
          applyRealtimePayload(payload);
          setStreamState("live");
        }
      } catch {
        if (!cancelled) setRealtimePending(false);
      } finally {
        realtimeInFlight = false;
      }
    };

    loadFast();
    window.setTimeout(loadRealtime, 250);
    fastTimer = setInterval(loadFast, 20_000);
    realtimeTimer = setInterval(loadRealtime, 15_000);

    return () => {
      cancelled = true;
      if (fastTimer) clearInterval(fastTimer);
      if (realtimeTimer) clearInterval(realtimeTimer);
    };
  }, [applyFastPayload, applyRealtimePayload]);

  const selectedVehicle = useMemo(
    () => selected ? vehicles.find((v) => v.id === selected.id) || selected : undefined,
    [vehicles, selected],
  );

  useEffect(() => {
    if (!selectedRoute) { setRouteGeometry(null); setRouteInfo({}); return; }
    const tripQuery = selectedVehicle?.routeId === selectedRoute && selectedVehicle.tripId
      ? `?tripId=${encodeURIComponent(selectedVehicle.tripId)}`
      : "";
    fetch(`/api/routes/${encodeURIComponent(selectedRoute)}/shape${tripQuery}`)
      .then((r) => r.json())
      .then((x) => {
        setRouteGeometry(x.geometry || null);
        setRouteInfo({ start: x.start || null, end: x.end || null });
      })
      .catch(() => { setRouteGeometry(null); setRouteInfo({}); });
  }, [selectedRoute, selectedVehicle]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => cityMatch(v, area))
      .filter((v) => accuracy === "all" || v.accuracyType === accuracy)
      .filter((v) => !q || [v.line, v.destination, v.operator, v.nextStop].filter(Boolean).some((x) => String(x).toLowerCase().includes(q)));
  }, [vehicles, query, area, accuracy]);

  const hasGpsVehicles = useMemo(() => vehicles.some((v) => v.accuracyType === "gps"), [vehicles]);
  const hasRealtimeVehicles = useMemo(() => vehicles.some((v) => v.accuracyType === "realtime"), [vehicles]);

  const visibleVehicles = useMemo(
    () => [...filtered].sort((a, b) => {
      const quality = (v: Vehicle) => v.accuracyType === "gps" ? 3 : v.accuracyType === "realtime" ? 2 : 1;
      return quality(b) - quality(a)
        || a.line.localeCompare(b.line, "de", { numeric: true })
        || String(a.destination || "").localeCompare(String(b.destination || ""), "de");
    }),
    [filtered],
  );

  const mapVehicles = selectedVehicle ? [selectedVehicle] : filtered;

  const chooseVehicle = (v: Vehicle, focusRoute = false) => {
    setSelected(v);
    setSelectedRoute(v.routeId);
    setRouteFocus(focusRoute);
    setMobilePanel(!focusRoute);
  };

  const clearVehicle = () => {
    setSelected(undefined);
    setSelectedRoute(undefined);
    setRouteGeometry(null);
    setRouteInfo({});
    setRouteFocus(false);
    setMobilePanel(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-icon">B</span><div><strong>BusKarte</strong><span>Flensburg & Schleswig</span></div></div>
        <div className="live-cluster"><span className={`live-dot ${streamState}`} /><strong>{streamState === "offline" ? "OFFLINE" : hasGpsVehicles ? "LIVE GPS" : hasRealtimeVehicles ? "ECHTZEIT · PROGNOSE" : realtimePending ? "FAHRPLAN · ECHTZEIT LÄDT" : "AKTUELL · FAHRPLAN"}</strong><span>{ageLabel(updatedAt)}</span></div>
        <nav><Link href="/status">Status</Link><Link href="/datenquellen">Datenquellen</Link></nav>
      </header>

      <section className={`workspace ${routeFocus && selectedVehicle ? "route-focus" : ""}`}>
        <div className="map-wrap">
          <RadarMap
            vehicles={mapVehicles}
            stops={stops}
            selected={selectedVehicle}
            routeGeometry={routeGeometry}
            routeColor={selectedVehicle?.color || "#173dff"}
            routeStart={routeInfo.start}
            routeEnd={routeInfo.end}
            onSelect={(v) => chooseVehicle(v, true)}
          />
          {!routeFocus && <div className="map-title"><h1>Busse in Flensburg & Schleswig <span>{hasGpsVehicles ? "live verfolgen" : hasRealtimeVehicles ? "mit Echtzeit-Prognosen" : "nach Fahrplan geschätzt"}</span></h1></div>}
          {routeFocus && selectedVehicle && <section className="route-focus-card">
            <button className="route-focus-back" onClick={clearVehicle}>← Alle Busse</button>
            <div className="route-focus-heading">
              <span className="route-focus-line" style={{ background: selectedVehicle.color || "#173dff" }}>{selectedVehicle.line}</span>
              <div><small>Streckenverlauf</small><strong>{selectedVehicle.destination || routeInfo.end?.name || "Ziel"}</strong></div>
            </div>
            <div className="route-focus-journey">
              <div><small>Start</small><strong>{routeInfo.start?.name || "Start wird geladen …"}</strong></div>
              <span>→</span>
              <div><small>Ziel</small><strong>{routeInfo.end?.name || selectedVehicle.destination || "Ziel wird geladen …"}</strong></div>
            </div>
            <div className="route-focus-live">
              <span className={`route-quality-dot ${selectedVehicle.accuracyType}`} />
              <span>{selectedVehicle.nextStop ? `Nächster Halt: ${selectedVehicle.nextStop}` : "Aktuelle Position"}</span>
              {routeGeometry && <strong className="route-visible-note">Linie auf Karte</strong>}
            </div>
          </section>}
          {!routeFocus && <button className="mobile-sheet-button" onClick={() => setMobilePanel(true)}>Busse unterwegs <strong>{filtered.length}</strong></button>}
        </div>

        {!routeFocus && <aside className={`sidebar ${mobilePanel ? "mobile-open" : ""}`}>
          <div className="mobile-grabber" onClick={() => setMobilePanel(false)}><span /></div>
          <div className="sidebar-head"><div><span className="eyebrow">BUSKARTE</span><h2>Busse unterwegs</h2></div><div className="count-badge">{filtered.length}</div></div>
          <div className="segmented">
            {([['all','Alle'],['flensburg','Flensburg'],['schleswig','Schleswig'],['region','Region']] as const).map(([k,l]) => <button className={area===k?'active':''} key={k} onClick={() => setArea(k)}>{l}</button>)}
          </div>
          <div className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Linie oder Ort suchen …" /></div>
          <div className="chips"><button className={accuracy==='all'?'active':''} onClick={() => setAccuracy('all')}>Alle Daten</button><button className={accuracy==='gps'?'active':''} onClick={() => setAccuracy('gps')}>● Live GPS</button><button className={accuracy==='realtime'?'active':''} onClick={() => setAccuracy('realtime')}>● Echtzeit-Prognose</button><button className={accuracy==='estimated'?'active':''} onClick={() => setAccuracy('estimated')}>◐ Fahrplan</button></div>

          {selectedVehicle && <section className="vehicle-detail">
            <button className="detail-close" onClick={clearVehicle} aria-label="Busauswahl schließen">×</button>
            <div className="detail-line"><span style={{ background: selectedVehicle.color || '#173dff' }}>{selectedVehicle.line}</span><div><small>Richtung</small><strong>{selectedVehicle.destination || "Ziel unbekannt"}</strong></div></div>
            <dl><div><dt>Betreiber</dt><dd>{selectedVehicle.operator}</dd></div><div><dt>Nächste Haltestelle</dt><dd>{selectedVehicle.nextStop || "–"}</dd></div><div><dt>Verspätung</dt><dd>{selectedVehicle.delaySeconds == null ? "–" : `${selectedVehicle.delaySeconds >= 0 ? '+' : ''}${Math.round(selectedVehicle.delaySeconds/60)} Min.`}</dd></div><div><dt>Position</dt><dd className={selectedVehicle.accuracyType}>{selectedVehicle.accuracyType === 'gps' ? '● Live GPS' : selectedVehicle.accuracyType === 'realtime' ? '● Echtzeit-Prognose' : '◐ Fahrplan-Schätzung'}</dd></div><div><dt>Aktualisiert</dt><dd>{ageLabel(selectedVehicle.timestamp)}</dd></div><div><dt>Datenbasis</dt><dd>{selectedVehicle.source}</dd></div></dl>
            <button className="show-all-buses" onClick={clearVehicle}>Alle Busse anzeigen</button>
          </section>}

          <div className="line-list">
            {visibleVehicles.length ? visibleVehicles.map((v) => <button
              key={v.id}
              className={selectedVehicle?.id === v.id ? 'selected' : ''}
              onClick={() => chooseVehicle(v, false)}
              aria-label={`Bus Linie ${v.line} Richtung ${v.destination || 'unbekannt'} auswählen`}
            >
              <span className="route-chip" style={{ background: v.color || '#173dff' }}>{v.line}</span>
              <span className="route-copy">
                <strong>{v.destination || 'Ziel unbekannt'}</strong>
                <small>{v.accuracyType === 'gps' ? 'Live GPS' : v.accuracyType === 'realtime' ? 'Echtzeit-Prognose' : 'Fahrplan'}{v.nextStop ? ` · Nächster Halt: ${v.nextStop}` : ''}</small>
              </span>
              <span className="chevron">›</span>
            </button>) : <div className="empty"><div className="empty-icon">⌁</div><strong>Derzeit keine Buspositionen</strong><p>Aktuell ist laut Fahrplandaten keine darstellbare Fahrt mit Liniengeometrie aktiv oder die Datenquelle ist vorübergehend nicht verfügbar.</p><Link href="/status">Provider prüfen</Link></div>}
          </div>
          <footer><span>Keine Fake-Daten</span><Link href="/datenquellen">Quellen & Lizenzen</Link></footer>
        </aside>}
      </section>
    </main>
  );
}
