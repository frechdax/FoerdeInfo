"use client";

import { useEffect, useRef } from "react";
import type { Map, LayerGroup } from "leaflet";
import { CENTER, type Point, type WayReport } from "@/lib/wege";
import styles from "./wege.module.css";

type Props = {
  start: Point | null;
  end: Point | null;
  reportPoint: Point | null;
  reports: WayReport[];
  route: [number, number][] | null;
  onPick: (point: Point) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
};

export default function WegeMap({ start, end, reportPoint, reports, route, onPick, onSelect, selectedId }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const layers = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const click = useRef(onPick);
  const select = useRef(onSelect);
  const lastFit = useRef("");
  click.current = onPick;
  select.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      const L = await import("leaflet");
      if (cancelled || !element.current || map.current) return;
      leaflet.current = L;
      const instance = L.map(element.current, { zoomControl: false, scrollWheelZoom: false }).setView([CENTER.lat, CENTER.lon], 11);
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>',
        maxZoom: 19,
      }).addTo(instance);
      layers.current = L.layerGroup().addTo(instance);
      instance.on("click", e => click.current({ lat: e.latlng.lat, lon: e.latlng.lng }));
      map.current = instance;
      setTimeout(() => instance.invalidateSize(), 100);
    }
    setup();
    return () => { cancelled = true; map.current?.remove(); map.current = null; layers.current = null; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const L = leaflet.current;
      const group = layers.current;
      const instance = map.current;
      if (!L || !group || !instance) return;
      group.clearLayers();
      const marker = (point: Point, color: string, label: string) => L.marker([point.lat, point.lon], {
        icon: L.divIcon({ className: styles.pin, html: `<span style="background:${color}" aria-hidden="true">${label}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] }),
        title: label === "A" ? "Start" : label === "B" ? "Ziel" : "Gemeldete Stelle",
      }).addTo(group);
      if (route?.length) L.polyline(route.map(([lon, lat]) => [lat, lon] as [number, number]), { color: "#087b77", weight: 6, opacity: .85 }).addTo(group);
      reports.forEach(r => {
        const m = marker({ lat: r.latitude, lon: r.longitude }, r.id === selectedId ? "#ab411f" : "#c76332", "!");
        m.on("click", e => { L.DomEvent.stopPropagation(e); select.current(r.id); });
      });
      if (start) marker(start, "#087b77", "A");
      if (end) marker(end, "#143c4c", "B");
      if (reportPoint) marker(reportPoint, "#9c4a20", "+");
      const fitKey = JSON.stringify({ start, end, routeLength: route?.length || 0 });
      if (fitKey !== lastFit.current) {
        lastFit.current = fitKey;
        if (route?.length) instance.fitBounds(L.latLngBounds(route.map(([lon, lat]) => [lat, lon] as [number, number])), { padding: [34, 34], maxZoom: 15 });
        else if (start && end) instance.fitBounds([[start.lat, start.lon], [end.lat, end.lon]], { padding: [40, 40], maxZoom: 15 });
        else if (start) instance.setView([start.lat, start.lon], 14);
        else if (end) instance.setView([end.lat, end.lon], 14);
      }
      window.clearInterval(timer);
    }, 80);
    return () => window.clearInterval(timer);
  }, [start, end, reportPoint, reports, route, selectedId]);

  useEffect(() => {
    const selected = reports.find(r => r.id === selectedId);
    if (selected) map.current?.panTo([selected.latitude, selected.longitude]);
  }, [selectedId, reports]);

  return <div ref={element} className={styles.map} role="application" aria-label="Karte mit Start, Ziel und gemeldeten Hindernissen" />;
}
