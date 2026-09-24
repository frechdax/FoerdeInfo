# BusRadar

Produktionsnaher Next.js-MVP für Busverkehr in Flensburg, Schleswig und dem Kreis Schleswig-Flensburg.

## Implementiert

- MapLibre-Karte mit geglätteten Fahrzeugbewegungen
- Desktop-Seitenleiste + Mobile Bottom Sheet
- Linien-/Gebiets-/Datenqualitätsfilter
- Fahrzeugdetail mit Betreiber, Ziel, nächster Haltestelle und Datenbasis
- offizieller NAH.SH-GTFS-Datensatz als primäre statische Quelle (CC BY 4.0)
- GTFS.de als statischer Fallback
- Fahrplan-Positionsschätzung ausschließlich entlang echter GTFS-Shapes
- vorbereiteter DELFI/SIRI-ET-Adapter mit optionalem Authorization-Header
- optionaler Flensburg-Live-GPS-Adapter für einen ausdrücklich freigegebenen Endpoint
- REST-Endpunkte für Fahrzeuge, Linien, Shapes, Haltestellen und Abfahrten
- /status und /datenquellen
- automatisierter täglicher regionaler GTFS-Refresh
- Busfilter auf Flensburg und Kreis Schleswig-Flensburg
- kein Demo-/Fake-Verkehr im Produktionszustand

## Aktuelle Datenlage

### Statisch
Der von NAH.SH veröffentlichte Schleswig-Holstein-GTFS-Datensatz wird über GovData/Open Data als CC BY 4.0 geführt. Der Importer filtert auf Busverkehr sowie Haltestellenkennungen für Flensburg und den Kreis Schleswig-Flensburg. Die laufende Statusseite zeigt die jeweils aktuell importierten Zahlen.

### Aktuelle Marker
Solange kein kompatibler Realtime-/GPS-Feed konfiguriert ist, werden aktive Busse aus Fahrplan + echter Shape-Geometrie als **Geschätzt** dargestellt. Die Oberfläche kennzeichnet diesen Zustand ausdrücklich als "AKTUELL · SCHÄTZUNG".

### GTFS-Realtime
Der freie GTFS.de-Realtime-Stream liefert TripUpdates und ServiceAlerts. Seine aktuellen Trip-IDs sind jedoch nicht direkt mit den IDs des offiziellen NAH.SH-GTFS kompatibel. BusRadar verwendet diese Daten deshalb standardmäßig nicht für Fahrzeugzuordnung oder Verspätungen.

### DELFI SIRI-ET Schleswig-Holstein
Das Mobilithek-Angebot 832254079439458304 ist öffentlich katalogisiert und als Open Data beschrieben. Der eigentliche aktuelle Paketabruf verlangt jedoch Authorization; der öffentliche noauth-Pfad liefert 403. Der Adapter kann nach rechtmäßigem Zugang mit SIRI_ET_SH_URL und SIRI_ET_SH_AUTHORIZATION aktiviert werden.

### Flensburg GPS
Der öffentliche Aktiv-Bus-Busradar wird nicht automatisiert ausgelesen. Der GPS-Adapter wird nur aktiviert, wenn ein separat freigegebener Fahrzeugpositions-Endpunkt konfiguriert wird.

## Lokal starten

```bash
cp .env.example .env.local
npm install
npm run dev
```

GTFS aktualisieren:

```bash
npm run gtfs:import
npm run realtime:check
```

## Vercel

Der Branch `busradar-preview` ist als isolierte Preview mit dem bestehenden Vercel-Git-Projekt verbunden. `main` bleibt unverändert. Vercel baut jeden Branch-Commit; GitHub Actions validiert TypeScript und den Produktions-Build. Der GTFS-Workflow aktualisiert den regionalen Datensatz planmäßig.

## API

- GET /api/vehicles
- GET /api/live/vehicles
- GET /api/routes
- GET /api/routes/:id
- GET /api/routes/:id/shape
- GET /api/stops
- GET /api/stops/:id/departures
- GET /api/providers/status
