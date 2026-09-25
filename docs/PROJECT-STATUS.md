# Projektstatus – förde.info

Stand: **25. September 2026**

Dieses Dokument fasst die bisher umgesetzten Produktentscheidungen zusammen und unterscheidet zwischen Produktion und noch nicht ausgerollten Änderungen.

## Branding

- Produktname: **förde.info**
- Region: Flensburg, Wassersleben, Glücksburg, Langballig
- privates, unabhängiges Angebot
- kein offizielles Portal einer Stadt oder Gemeinde
- alter Repo-/Projektname bleibt technisch bestehen

## Produktion

### Regionale Startseite

- mobile-first
- keine manuelle Ortsauswahl mehr
- Wetter und Kurzfristprognose regional zusammengefasst
- DWD-Warnungen
- Förde-/Wellenbedingungen
- Aktivitätsscores
- dynamische GetYourGuide-Empfehlungen
- Badestellen mit veröffentlichter Badegewässer-Einstufung
- Wegecheck und Veranstaltungen als zentrale praktische Funktionen

### Veranstaltungen

- Freitextsuche
- Heute
- Morgen
- Wochenende
- Nächste Woche
- Ortsfilter
- laufende mehrtägige Termine werden berücksichtigt
- iCalendar
- Originalquellen
- Mischung aus Supabase-Terminen und öffentlich sichtbaren regionalen Highlights
- gespeicherte Supabase-Termine besitzen im aktuellen Code eigene Detailseiten; externe Highlights öffnen die externe Quelle

### Wegecheck

- optionaler Standort
- Adress-/Ortssuche
- Routing
- Karte
- Community-Hindernismeldungen
- zeitliche Begrenzung der Meldungen
- Voting „noch da“ / „wieder frei“
- „Beste Option gerade“
- Live-Fakten
- dynamische Affiliate-/Freizeitkarten
- 2-Stunden-Vorschau „Beste Zeit heute“

### Live-Daten-Labor

`/live-daten` ist als nicht indexierte Pilotseite produktiv. Sie dient als Experimentierfläche für:

- Parkplatz
- Besucheraufkommen
- Ladeinfrastruktur
- Verkehr
- ÖPNV
- Sharing

Die aktuelle Produktionsversion stellt noch nicht für alle Module echte Livewerte bereit.

## Umgesetzt, aber noch nicht in Produktion

Branch:

`feature/live-data-sources-strandampel-20260925`

### Ortsbezogene Live-Daten

Neue API:

`/api/live-daten?ort=<region>`

Unterstützte IDs:

- `flensburg`
- `wassersleben`
- `gluecksburg`
- `langballig`

Die API aggregiert parallel Parkplatz-/Besucher-Sensorik, Ladeinfrastruktur, Wege-Meldungen, ÖPNV und Sharing.

Jedes Modul liefert einen transparenten Status:

- `live`
- `partial`
- `unavailable`

Es gibt keine erfundenen Fallback-Zahlen.

### Strandampel

Die Badestellenanzeige wurde im Entwicklungsbranch als **Strandampel** umgesetzt.

Ampelzustände:

- Grün
- Gelb
- Rot
- neutral bei fehlender Live-Lage

Grundlage sind die aktuelle Wetter-/Warnlage, Fördebedingungen und veröffentlichte Badegewässer-Einstufung.

## Entfernte bzw. nicht mehr zentrale Funktionen

- Müllkalender wurde aus dem regionalen förde.info-Konzept entfernt.
- Die frühere regionale Ortsauswahl auf der Startseite wurde entfernt.
- Die neu eingeführten regionalen Detailseiten `/orte/[slug]` wurden wieder entfernt.
- Die regionale `/urlaub`-Übersichtsseite wurde entfernt.
- Alte Glücksburg-spezifische SEO-/Bestandsseiten existieren teilweise weiterhin und werden getrennt vom neuen regionalen Kern behandelt.

## Transparenzregeln

1. Externe Klassifikationen werden nicht als Live-Messung ausgegeben.
2. Fehlende Echtzeitdaten werden nicht erfunden.
3. Community-Meldungen werden als solche gekennzeichnet.
4. Aktivitätsscores und Strandampel sind eigene förde.info-Bewertungen.
5. DWD-Warnungen bleiben als amtliche Quelle erkennbar.
6. Affiliate-Links werden als Werbung gekennzeichnet.
7. Für Veranstaltungstermine bleibt die Originalquelle maßgeblich.

## Nächste mögliche Schritte

- Stabilität der neuen Live-Datenquellen pro Ort testen.
- Nur zuverlässig verfügbare Module später dynamisch in die Startseite integrieren.
- Strandampel nach erfolgreicher Prüfung deployen.
- Live-Daten-Labor erst nach ausreichender Datenqualität für Suchmaschinen freigeben.
- Historische Glücksburg-Seiten später darauf prüfen, ob sie weitergeführt, umgeleitet oder in die regionale Struktur überführt werden sollen.
