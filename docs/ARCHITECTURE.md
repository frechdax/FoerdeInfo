# Architektur von förde.info

## Überblick

förde.info ist eine Next.js-16-App im App Router. Das Projekt ist mobile-first aufgebaut und kombiniert öffentliche externe APIs, eigene Supabase-Daten und clientseitige Entscheidungshilfen.

Die öffentliche Produktbezeichnung lautet **förde.info**. Der GitHub-Repositoryname `GlucksburgDirekt` und der Vercel-Projektname `gluecksburg-direkt` bleiben aus technischer Kontinuität bestehen.

## Zentrale Routen

| Route | Aufgabe |
| --- | --- |
| `/` | regionale Start-/Live-Übersicht |
| `/live` | verwendet dieselbe regionale Live-Ansicht |
| `/veranstaltungen` | Veranstaltungssuche und Zeitraum-/Ortsfilter |
| `/veranstaltungen/[id]` | Detailseite für gespeicherte Supabase-Termine |
| `/wege` | Wegecheck mit Karte, Routing und Nachbarschaftsmeldungen |
| `/live-daten` | nicht indexiertes Live-Daten-Labor |
| `/partner` | Kontakt-/Kooperationsseite |
| `/gluecksburg` | ältere ausführliche Glücksburg-Ansicht |
| `/gluecksburg/live` | ältere Glücksburg-Liveansicht |

Zusätzlich existieren historische/SEO-orientierte Glücksburg-Seiten wie `/heute-in-gluecksburg`, `/wochenende-in-gluecksburg`, `/freizeit-gluecksburg`, `/sehenswuerdigkeiten-gluecksburg` und `/straende-gluecksburg`.

Die früheren regionalen Seiten `/orte/[slug]` und die regionale `/urlaub`-Seite gehören nicht mehr zur aktuellen Hauptnavigation.

## Regionale Konfiguration

`lib/regions.ts` definiert:

- Flensburg
- Wassersleben
- Glücksburg
- Langballig

Je Region werden Koordinaten, Beschreibung, Veranstaltungsquelle und Kennungen amtlicher Badestellen gepflegt.

## Regionale Live-API

`app/api/foerde/route.ts` aggregiert parallel:

1. Wetter von Open-Meteo
2. Marine-/Wellenwerte von Open-Meteo Marine
3. DWD-Warnungen
4. Badegewässer-Stammdaten und veröffentlichte Einstufungen des Landes Schleswig-Holstein

Die API ist fehlertolerant: Teilquellen dürfen ausfallen, ohne dass künstliche Ersatzdaten erzeugt werden.

Die Startseite lädt `/api/foerde` und aktualisiert die Daten bei geöffneter Seite regelmäßig.

## Aktivitätsindex

Die regionale Oberfläche berechnet aus den Live-/Prognosedaten Scores für:

- Spaziergang
- Fahrrad
- Strand & Wasser
- Indoor

Einbezogen werden insbesondere:

- Temperatur / gefühlte Temperatur
- Niederschlag
- Regenwahrscheinlichkeit
- Wind
- Böen
- UV
- Tageslicht
- DWD-Warnstufe
- Wellenhöhe, sofern vorhanden

Die Scores sind eigene Orientierung von förde.info und keine amtliche Bewertung.

## Affiliate-Entscheidungslogik

`lib/affiliate.ts` enthält die Vermittlungsziele. Auf der Startseite und im Wegecheck werden Angebote nur dann priorisiert, wenn die jeweilige Live-Lage zur Aktivität passt.

Die Anwendung erhält keine eigene Live-Preis-/Verfügbarkeits-API von GetYourGuide. Preis und tatsächliche Verfügbarkeit werden erst auf der verlinkten Partnerseite geprüft.

## Veranstaltungen

`app/veranstaltungen/page.tsx` kombiniert:

- veröffentlichte Events aus Supabase
- öffentlich sichtbare Event-Highlights der Tourismus Agentur Flensburger Förde

`app/veranstaltungen/events-browser.tsx` übernimmt clientseitig:

- Freitextsuche
- Heute
- Morgen
- Wochenende
- Nächste Woche
- Ortsfilter

Mehrtagestermine werden als Zeiträume behandelt.

Gespeicherte Termine können über `/veranstaltungen/[id]` eine eigene Detailseite besitzen; externe Highlights führen direkt zur Originalquelle. Beide Varianten unterstützen iCalendar.

## Wegecheck

Der Wegecheck besteht im Wesentlichen aus:

- `app/wege/WegeApp.tsx`
- `app/api/wege/reports/route.ts`
- `app/api/wege/route/route.ts`
- `app/api/wege/geocode/route.ts`
- Supabase-Tabellen `way_reports` und `way_report_votes`

Die Anwendung nutzt Standortdaten nur nach ausdrücklicher Nutzeraktion.

Meldungen werden nach Ablauf aus der öffentlichen Abfrage entfernt. Fotos werden verkleinert gespeichert. Meldungen und Stimmen sind Community-Daten und keine amtliche Freigabe.

Der Wegecheck verwendet zusätzlich die bestehende `/api/live`-Logik für:

- „Beste Option gerade“
- Live-Fakten
- dynamische Vermittlungskarten
- „Beste Zeit heute“ als 2-Stunden-Fenster

## Live-Daten-Labor

Die produktive Route `/live-daten` ist als `noindex` markiert und dient als Experimentierfläche.

Auf dem Entwicklungsbranch `feature/live-data-sources-strandampel-20260925` existiert zusätzlich `app/api/live-daten/route.ts`. Diese Route wählt per `?ort=` eine der vier Regionen und aggregiert parallel:

- Parkplatz-/Besucher-Sensorik aus einer öffentlichen SensorThings-Infrastruktur
- Ladeinfrastruktur aus OpenStreetMap/Overpass
- aktive Wegecheck-Meldungen
- ÖPNV-Abfahrten mit vorhandenen Realtime-Daten
- Sharing-Stationen aus einem öffentlichen GBFS-Feed

Die API liefert für jedes Modul einen Status `live`, `partial` oder `unavailable`. Ein fehlender Feed wird nicht durch Beispielwerte ersetzt.

## Strandampel

Ebenfalls auf `feature/live-data-sources-strandampel-20260925` wird die Badestellenübersicht als farbliche Strandampel dargestellt.

Die Ampel kombiniert aktuelle Lage und veröffentlichte Klassifikation. Die Logik liegt in `app/page.tsx`, die Darstellung in `app/foerde-home.module.css`.

Die Ampel ist nicht amtlich und darf nicht als Live-Wasserqualitätsmessung interpretiert werden.

## SEO und Metadaten

Next.js erzeugt:

- Metadaten
- `robots.txt`
- `sitemap.xml`
- strukturierte Daten auf passenden Seiten

Kanonische Herkunft ist standardmäßig `https://xn--frde-5qa.info`. `NEXT_PUBLIC_SITE_URL` kann diese Vorgabe überschreiben.

`/live-daten` ist bewusst nicht für Suchmaschinen freigegeben, solange Datenquellen und Darstellung noch experimentell sind.

## Fehlerprinzip

Für externe Quellen gilt projektweit:

> Wenn eine Quelle nicht erreichbar ist oder keinen passenden Wert liefert, wird der Ausfall sichtbar gemacht. Es werden keine erfundenen Live-Werte erzeugt.
