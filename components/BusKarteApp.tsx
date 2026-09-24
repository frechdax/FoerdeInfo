"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RadarMap from "@/components/RadarMap";
import type { StopPoint, Vehicle } from "@/lib/types";

type Payload = { updatedAt: string; vehicles: Vehicle[] };
type Area = "all" | "flensburg" | "schleswig" | "region";

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

export default function BusKarteApp() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [selected, setSelected] = useState<Vehicle>();
  const [selectedRoute, setSelectedRoute] = useState<string>();
  const [routeGeometry, setRouteGeometry] = useState<{ type: "LineString"; coordinates: number[][] } | null>(null);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<Area>("all");
  const [accuracy, setAccuracy] = useState<"all" | "gps" | "estimated">("all");
  const [stops, setStops] = useState<StopPoint[]>([]);
  const [streamState, setStreamState] = useState<"live" | "polling" | "offline">("offline");
  const [mobilePanel, setMobilePanel] = useState(false);

  const applyPayload = useCallback((payload: Payload) => {
    setVehicles(payload.vehicles || []);
    setUpdatedAt(payload.updatedAt);
  }, []);

  useEffect(() => {
    fetch("/api/stops?limit=500").then((r) => r.json()).then((x) => setStops(x.stops || [])).catch(() => {});
    let fallbackTimer: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => {
      if (fallbackTimer) return;
      setStreamState("polling");
      const poll = () => fetch("/api/vehicles", { cache: "no-store" }).then((r) => r.json()).then(applyPayload).catch(() => setStreamState("offline"));
      poll(); fallbackTimer = setInterval(poll, 12_000);
    };
    const es = new EventSource("/api/live/vehicles");
    es.addEventListener("vehicles", (event) => { setStreamState("live"); applyPayload(JSON.parse((event as MessageEvent).data)); });
    es.onerror = () => { es.close(); startPolling(); };
    return () => { es.close(); if (fallbackTimer) clearInterval(fallbackTimer); };
  }, [applyPayload]);

  useEffect(() => {
    if (!selectedRoute) { setRouteGeometry(null); return; }
    const tripQuery = selected?.routeId === selectedRoute && selected.tripId ? `?tripId=${encodeURIComponent(selected.tripId)}` : "";
    fetch(`/api/routes/${encodeURIComponent(selectedRoute)}/shape${tripQuery}`).then((r) => r.json()).then((x) => setRouteGeometry(x.geometry || null)).catch(() => setRouteGeometry(null));
  }, [selectedRoute, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => cityMatch(v, area))
      .filter((v) => accuracy === "all" || v.accuracyType === accuracy)
      .filter((v) => !q || [v.line, v.destination, v.operator, v.nextStop].filter(Boolean).some((x) => String(x).toLowerCase().includes(q)));
  }, [vehicles, query, area, accuracy]);

  const hasGpsVehicles = useMemo(() => vehicles.some((v) => v.accuracyType === "gps"), [vehicles]);

  const groups = useMemo(() => {
    const map = new Map<string, { routeId: string; line: string; destination?: string; color?: string; count: number; gps: number }>();
    filtered.forEach((v) => {
      const key = v.routeId || v.line;
      const g = map.get(key) || { routeId: v.routeId, line: v.line, destination: v.destination, color: v.color, count: 0, gps: 0 };
      g.count += 1; if (v.accuracyType === "gps") g.gps += 1; map.set(key, g);
    });
    return [...map.values()].sort((a,b) => a.line.localeCompare(b.line, "de", { numeric: true }));
  }, [filtered]);

  const chooseVehicle = (v: Vehicle) => { setSelected(v); setSelectedRoute(v.routeId); setMobilePanel(true); };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-icon">B</span><div><strong>BusKarte</strong><span>Flensburg & Schleswig</span></div></div>
        <div className="live-cluster"><span className={`live-dot ${streamState}`} /><strong>{streamState === "offline" ? "OFFLINE" : hasGpsVehicles ? "LIVE GPS" : "AKTUELL · SCHÄTZUNG"}</strong><span>{ageLabel(updatedAt)}</span></div>
        <nav><Link href="/status">Status</Link><Link href="/datenquellen">Datenquellen</Link></nav>
      </header>

      <section className="workspace">
        <div className="map-wrap">
          <RadarMap vehicles={filtered} stops={stops} selected={selected} routeGeometry={routeGeometry} onSelect={chooseVehicle} />
          <div className="map-title"><h1>Busse in Flensburg & Schleswig <span>{hasGpsVehicles ? "live verfolgen" : "aktuell geschätzt"}</span></h1></div>
          <button className="mobile-sheet-button" onClick={() => setMobilePanel(true)}>Busse unterwegs <strong>{filtered.length}</strong></button>
        </div>

        <aside className={`sidebar ${mobilePanel ? "mobile-open" : ""}`}>
          <div className="mobile-grabber" onClick={() => setMobilePanel(false)}><span /></div>
          <div className="sidebar-head"><div><span className="eyebrow">BUSKARTE</span><h2>Busse unterwegs</h2></div><div className="count-badge">{filtered.length}</div></div>
          <div className="segmented">
            {([['all','Alle'],['flensburg','Flensburg'],['schleswig','Schleswig'],['region','Region']] as const).map(([k,l]) => <button className={area===k?'active':''} key={k} onClick={() => setArea(k)}>{l}</button>)}
          </div>
          <div className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Linie oder Ort suchen …" /></div>
          <div className="chips"><button className={accuracy==='all'?'active':''} onClick={() => setAccuracy('all')}>Alle Daten</button><button className={accuracy==='gps'?'active':''} onClick={() => setAccuracy('gps')}>● Live GPS</button><button className={accuracy==='estimated'?'active':''} onClick={() => setAccuracy('estimated')}>◐ Geschätzt</button></div>

          {selected && <section className="vehicle-detail">
            <button className="detail-close" onClick={() => { setSelected(undefined); setSelectedRoute(undefined); }}>×</button>
            <div className="detail-line"><span style={{ background: selected.color || '#173dff' }}>{selected.line}</span><div><small>Richtung</small><strong>{selected.destination || "Ziel unbekannt"}</strong></div></div>
            <dl><div><dt>Betreiber</dt><dd>{selected.operator}</dd></div><div><dt>Nächste Haltestelle</dt><dd>{selected.nextStop || "–"}</dd></div><div><dt>Verspätung</dt><dd>{selected.delaySeconds == null ? "–" : `${selected.delaySeconds >= 0 ? '+' : ''}${Math.round(selected.delaySeconds/60)} Min.`}</dd></div><div><dt>Position</dt><dd className={selected.accuracyType}>{selected.accuracyType === 'gps' ? '● Live GPS' : '◐ Geschätzt'}</dd></div><div><dt>Aktualisiert</dt><dd>{ageLabel(selected.timestamp)}</dd></div><div><dt>Datenbasis</dt><dd>{selected.source}</dd></div></dl>
          </section>}

          <div className="line-list">
            {groups.length ? groups.map((g) => <button key={g.routeId} className={selectedRoute===g.routeId?'selected':''} onClick={() => setSelectedRoute(selectedRoute===g.routeId ? undefined : g.routeId)}>
              <span className="route-chip" style={{ background: g.color || '#173dff' }}>{g.line}</span><span className="route-copy"><strong>{g.destination || 'Linie aktiv'}</strong><small>{g.count} {g.count===1?'Bus':'Busse'} · {g.gps ? `${g.gps} GPS` : 'geschätzt'}</small></span><span className="chevron">›</span>
            </button>) : <div className="empty"><div className="empty-icon">⌁</div><strong>Derzeit keine Buspositionen</strong><p>Aktuell ist laut Fahrplandaten keine darstellbare Fahrt mit Liniengeometrie aktiv oder die Datenquelle ist vorübergehend nicht verfügbar.</p><Link href="/status">Provider prüfen</Link></div>}
          </div>
          <footer><span>Keine Fake-Daten</span><Link href="/datenquellen">Quellen & Lizenzen</Link></footer>
        </aside>
      </section>
    </main>
  );
}
