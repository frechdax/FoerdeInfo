"use client";

import { useEffect, useRef, useState } from "react";
import { GeolocateControl, type GeoJSONSource, Map as MapLibreMap, Marker, NavigationControl, Popup, type StyleSpecification } from "maplibre-gl";
import type { StopPoint, Vehicle } from "@/lib/types";
import { REGION } from "@/lib/region";

const DEFAULT_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export default function RadarMap({ vehicles, stops, selected, routeGeometry, onSelect }: { vehicles: Vehicle[]; stops: StopPoint[]; selected?: Vehicle; routeGeometry: { type: "LineString"; coordinates: number[][] } | null; onSelect: (v: Vehicle) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [mapError, setMapError] = useState<string>();
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || DEFAULT_MAP_STYLE,
        center: REGION.center,
        zoom: REGION.zoom,
        maxBounds: [[8.3,54.05],[10.55,55.25]],
        attributionControl: { compact: true },
      });
    } catch {
      setMapError("Die Karte konnte auf diesem Gerät nicht initialisiert werden.");
      return;
    }

    const loadTimeout = window.setTimeout(() => {
      if (!map.loaded()) setMapError("Kartenmaterial konnte nicht geladen werden.");
    }, 8000);
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showAccuracyCircle: true }), "bottom-right");
    map.on("load", () => {
      window.clearTimeout(loadTimeout);
      setMapError(undefined);
      map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "stops", type: "circle", source: "stops", minzoom: 11.3, paint: { "circle-radius": ["interpolate",["linear"],["zoom"],11,2.5,15,5], "circle-color": "#ffffff", "circle-stroke-width": 1.5, "circle-stroke-color": "#244154" } });
      map.addSource("selected-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "selected-route-halo", type: "line", source: "selected-route", paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": .85 } });
      map.addLayer({ id: "selected-route", type: "line", source: "selected-route", paint: { "line-color": "#153df3", "line-width": 5 } });
      map.on("mouseenter", "stops", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "stops", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "stops", async (event) => {
        const feature = event.features?.[0];
        const id = String(feature?.properties?.id || "");
        const name = String(feature?.properties?.name || "Haltestelle");
        if (!id || feature?.geometry?.type !== "Point") return;
        const coords = feature.geometry.coordinates as [number, number];
        const node = document.createElement("div");
        node.className = "stop-popup";
        const title = document.createElement("strong");
        title.textContent = name;
        const body = document.createElement("div");
        body.textContent = "Abfahrten werden geladen …";
        node.append(title, body);
        const popup = new Popup({ offset: 10, closeButton: true }).setLngLat(coords).setDOMContent(node).addTo(map);
        try {
          const response = await fetch(`/api/stops/${encodeURIComponent(id)}/departures`, { cache: "no-store" });
          const payload = await response.json();
          body.textContent = "";
          const departures = (payload.departures || []).slice(0, 5);
          if (!departures.length) { body.textContent = "Keine Abfahrten in den nächsten 2 Stunden."; return; }
          departures.forEach((d: any) => {
            const row = document.createElement("div");
            row.className = "departure-row";
            const left = document.createElement("span");
            left.textContent = `${d.line} → ${d.destination || "Ziel"}`;
            const right = document.createElement("strong");
            right.textContent = `${d.inMinutes} Min.`;
            row.append(left, right); body.appendChild(row);
          });
        } catch {
          if (popup.isOpen()) body.textContent = "Abfahrten derzeit nicht verfügbar.";
        }
      });
    });
    mapRef.current = map;
    return () => {
      window.clearTimeout(loadTimeout);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const update = () => {
      const source = map.getSource("stops") as GeoJSONSource | undefined;
      source?.setData({ type: "FeatureCollection", features: stops.map((s) => ({ type: "Feature", properties: { id:s.id,name:s.name }, geometry: { type:"Point", coordinates:[s.lon,s.lat] } })) });
    };
    if (map.isStyleLoaded()) update(); else map.once("load", update);
  }, [stops]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const update = () => {
      const source = map.getSource("selected-route") as GeoJSONSource | undefined;
      source?.setData(routeGeometry ? { type:"Feature", properties:{}, geometry: routeGeometry } : { type:"FeatureCollection", features:[] });
    };
    if (map.isStyleLoaded()) update(); else map.once("load", update);
  }, [routeGeometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const liveIds = new Set(vehicles.map((v) => v.id));
    for (const [id, marker] of markersRef.current) if (!liveIds.has(id)) { marker.remove(); markersRef.current.delete(id); }

    for (const v of vehicles) {
      const age = Date.now() - new Date(v.timestamp).getTime();
      if (age > 120_000) continue;
      let marker = markersRef.current.get(v.id);
      if (!marker) {
        const el = document.createElement("button");
        el.className = `bus-marker ${v.accuracyType}`;
        el.type = "button";
        const glyph = document.createElement("span");
        glyph.className = "bus-glyph";
        glyph.textContent = "▰";
        const label = document.createElement("strong");
        label.textContent = v.line;
        el.append(glyph, label);
        marker = new Marker({ element: el, anchor: "center", rotationAlignment: "map" }).setLngLat([v.longitude, v.latitude]).addTo(map);
        markersRef.current.set(v.id, marker);
      } else {
        const old = marker.getLngLat();
        const started = performance.now();
        const animate = (t: number) => {
          const duration = v.accuracyType === "realtime" ? 9000 : v.accuracyType === "gps" ? 4000 : 700;
          const p = Math.min(1, (t-started)/duration);
          const eased = 1-Math.pow(1-p,3);
          marker!.setLngLat([old.lng+(v.longitude-old.lng)*eased, old.lat+(v.latitude-old.lat)*eased]);
          if (p<1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
      const el = marker.getElement();
      el.onclick = () => onSelectRef.current(v);
      const label = el.querySelector("strong"); if (label) label.textContent = v.line;
      el.style.setProperty("--bearing", `${v.bearing || 0}deg`);
      el.classList.toggle("stale", age > 60_000);
      el.classList.toggle("selected", selected?.id === v.id);
      el.classList.toggle("gps", v.accuracyType === "gps");
      el.classList.toggle("realtime", v.accuracyType === "realtime");
      el.classList.toggle("estimated", v.accuracyType === "estimated");
      el.style.setProperty("--route-color", v.color || "#173dff");
    }
  }, [vehicles, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && selected) map.easeTo({ center:[selected.longitude,selected.latitude], zoom:Math.max(map.getZoom(),12.7), duration:800 });
  }, [selected]);

  return (
    <>
      <div className="map" ref={containerRef} />
      {mapError && <div className="map-error"><strong>Karte nicht verfügbar</strong><span>{mapError}</span></div>}
    </>
  );
}
