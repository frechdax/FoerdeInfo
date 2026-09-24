# BusRadar

Produktionsnaher Next.js-MVP für Busverkehr in Flensburg, Schleswig und dem Kreis Schleswig-Flensburg.

## Implementiert

- MapLibre-Livekarte mit geglätteten Fahrzeugbewegungen
- Desktop-Seitenleiste + Mobile Bottom Sheet
- Linien-/Gebiets-/Datenqualitätsfilter
- Fahrzeugdetail mit Betreiber, Ziel, nächster Haltestelle, Verspätung und Datenqualität
- offizieller NAH.SH-GTFS-Datensatz als primäre statische Quelle (CC BY 4.0)
- GTFS.de als statischer Fallback
- GTFS-Realtime Provider für `TripUpdates` und `ServiceAlerts`
- Positionsschätzung ausschließlich entlang vorhandener GTFS-Shapes
- optionaler `FlensburgLiveProvider` für einen ausdrücklich freigegebenen GPS-Endpunkt
- REST-Endpunkte für Fahrzeuge, Linien, Shapes, Haltestellen und Abfahrten
- `/status` und `/datenquellen`
- automatisierter regionaler GTFS-Importer
- Busfilter: GTFS `route_type=3` und erweiterte Bus-Typen 700–799
- kein Demo-/Fake-Verkehr im Produktionszustand

## Datenquellen

### Statisch
Der von NAH.SH veröffentlichte Schleswig-Holstein-GTFS-Datensatz wird über GovData/Open Data Schleswig-Holstein als **CC BY 4.0** geführt. Der aktuell funktionierende Distributions-Endpunkt ist in `.env.example` hinterlegt. Ein erfolgreicher Test am 24.09.2026 lieferte für den zunächst breiteren Regionalausschnitt 1.459 Shapes. Der Importer filtert zusätzlich auf Busverkehr.

### Echtzeit
Der freie GTFS-RT-Stream von GTFS.de (`https://realtime.gtfs.de/realtime-free.pb`) liefert `TripUpdates` und `ServiceAlerts`, aber keine allgemeinen `VehiclePositions`. Er wird serverseitig abgerufen. Der Workflow prüft automatisch, wie viele aktuelle Realtime-Trip-IDs direkt zum importierten NAH.SH-Datensatz passen.

### Flensburg GPS
Der öffentliche Aktiv-Bus-Busradar wird nicht automatisiert ausgelesen. Der GPS-Adapter wird nur aktiviert, wenn ein separat freigegebener bzw. ausdrücklich rechtmäßig nutzbarer Fahrzeugpositions-Endpunkt in `FLENSBURG_LIVE_API_URL` konfiguriert ist.

## Lokal starten

```bash
cp .env.example .env.local
npm install
npm run gtfs:import
npm run realtime:check
npm run dev
```

## Vercel

Der Branch `busradar-preview` ist als isolierte Preview mit dem bestehenden Vercel-Git-Projekt verbunden. `main` bleibt unverändert. Der GitHub-Workflow aktualisiert den regionalen statischen Datensatz und committed `data/region.json`; danach baut Vercel den Branch erneut.

## API

- `GET /api/vehicles`
- `GET /api/live/vehicles`
- `GET /api/routes`
- `GET /api/routes/:id`
- `GET /api/routes/:id/shape`
- `GET /api/stops`
- `GET /api/stops/:id/departures`
- `GET /api/providers/status`
