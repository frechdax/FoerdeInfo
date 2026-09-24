# BusRadar

Produktionsnaher Next.js-MVP für Buspositionen in Flensburg, Schleswig und dem Kreis Schleswig-Flensburg.

## Was bereits implementiert ist

- MapLibre-Livekarte mit geglätteten Fahrzeugbewegungen
- Desktop-Seitenleiste + Mobile Bottom Sheet
- Linien-/Gebiets-/Datenqualitätsfilter
- Fahrzeugdetail mit Betreiber, Ziel, nächster Haltestelle, Verspätung und Datenqualität
- GTFS-Realtime Provider für `TripUpdates` und `ServiceAlerts`
- Positionsschätzung aus GTFS-Zeiten + Shape + Realtime-Delay
- optionaler `FlensburgLiveProvider` für einen **freigegebenen** GPS-Endpunkt
- SSE-Stream `/api/live/vehicles` mit Polling-Fallback im Client; SSE ist standardmäßig deaktiviert, damit ohne Shared Cache nicht pro Browser ein Upstream-Abruf entsteht
- REST-Endpunkte für Fahrzeuge, Linien, Shapes, Haltestellen und Abfahrten
- `/status` und `/datenquellen`
- regionaler GTFS-Importer
- kein Demo-/Fake-Verkehr im Produktionszustand

## Datenlage

Der voreingestellte GTFS-RT-Feed `https://realtime.gtfs.de/realtime-free.pb` liefert TripUpdates und ServiceAlerts. Er liefert nicht generell VehiclePositions. Exakte Aktiv-Bus-Flensburg-Positionen werden deshalb nur eingebunden, wenn ein rechtmäßig nutzbarer Endpoint in `FLENSBURG_LIVE_API_URL` hinterlegt wurde. Der öffentliche Busradar selbst wird **nicht** automatisiert abgefragt, weil dessen Nutzungsbedingungen automatisierten Abruf und App-Integration ohne schriftliche Genehmigung ausdrücklich ausschließen.

## Lokal starten

```bash
cp .env.example .env.local
npm install
npm run gtfs:import
npm run dev
```

Der GTFS-Import verwendet standardmäßig den kostenfreien Deutschland-ÖPNV-Feed von GTFS.de (Creative Commons 4.0) und benötigt Netzwerkzugriff. Er speichert anschließend nur den regional relevanten Ausschnitt in `data/region.json`. `GTFS_STATIC_FALLBACK_URL` kann für eine zusätzliche rechtmäßig nutzbare Quelle gesetzt werden. Der direkte NAH.SH-GTFS-Download wird wegen seiner zusätzlichen Nutzungsbedingungen nicht als Default verwendet.

## Vercel

1. Repository nach GitHub pushen und in Vercel importieren.
2. `GTFS_RT_URL` setzen (oder Default verwenden).
3. Optional `FLENSBURG_LIVE_API_URL` und `FLENSBURG_LIVE_API_KEY` setzen.
4. `data/region.json` vor dem Deploy erzeugen und mit versionieren **oder** den Import in einen separaten Scheduled-Data-Job verschieben. Nicht bei jedem Serverless Request den 269MB-Feed laden.
5. Deployen.

## API

- `GET /api/vehicles`
- `GET /api/live/vehicles` (SSE)
- `GET /api/routes`
- `GET /api/routes/:id`
- `GET /api/routes/:id/shape`
- `GET /api/stops`
- `GET /api/stops/:id/departures`
- `GET /api/providers/status`

## GPS-Provider-Contract

`FLENSBURG_LIVE_API_URL` kann JSON als Array oder `{ "vehicles": [...] }` liefern. Pro Fahrzeug erkennt der Adapter u. a.:

`id`, `vehicleId`, `line`, `route`, `routeId`, `tripId`, `latitude|lat`, `longitude|lon|lng`, `bearing`, `speed`, `delaySeconds|delay`, `destination`, `nextStop`, `timestamp`, `color`.

Der Adapter umgeht keine Authentifizierung und extrahiert keine Schlüssel. Ohne explizit nutzbaren Endpoint bleibt er deaktiviert.
