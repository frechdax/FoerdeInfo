# Datenquellen von förde.info

| Inhalt | Quelle | Aktualisierung und Grenze |
| --- | --- | --- |
| Wetter nach Ort | [Open-Meteo](https://open-meteo.com/) | Koordinaten je Ort, API-Cache fünf Minuten; Temperatur, gefühlte Temperatur, Niederschlag, Regenwahrscheinlichkeit, Wind, Böen, UV und Tageslicht |
| Badestellen und Qualitäts-Einstufung | [Open Data Schleswig-Holstein](https://opendata.schleswig-holstein.de/collection/badegewasser-stammdaten/aktuell) | Amtliche Badestellenkennungen und jüngste veröffentlichte Einstufung; keine Live-Messung |
| Amtliche Wetterwarnungen | [DWD](https://www.dwd.de/) | Landkreis-Warnzellen für Flensburg bzw. Schleswig-Flensburg; fließen als Sicherheitsabschlag in die regionalen Aktivitätsindizes ein |
| Pegel und Warnungen in der Glücksburger Detailansicht | [PEGELONLINE](https://pegelonline.wsv.de/) und [DWD](https://www.dwd.de/) | Wie in `app/api/live/route.ts` abgefragt; regionale Gültigkeit beachten |
| Vorhandene Glücksburger Veranstaltungen | Supabase-Tabelle `events` mit Link zur Originalquelle | Nur `status = published`; Änderungen beim Veranstalter prüfen |
| Karte, Geokodierung und Wegeführung | [OpenStreetMap](https://www.openstreetmap.org/copyright), [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) und [FOSSGIS-Routing](https://routing.openstreetmap.de/about.html) | Die OSM-Routinggraphen werden ungefähr alle zwei Tage aktualisiert; nicht barrierefrei geprüft, keine Live-Sperrungsdaten |
| Wegbeobachtungen | Eigene Supabase-Tabellen `way_reports`, `way_report_votes` | Unbestätigte Nachbarschaftsmeldungen; Abfrage alle 30 Sekunden, Sichtbarkeit höchstens 48 Stunden; Stimmen sind keine amtliche Freigabe |
| Wetter, Warnungen und Fördepegel im Wegecheck | [Open-Meteo](https://open-meteo.com/), [DWD](https://www.dwd.de/), [PEGELONLINE](https://pegelonline.wsv.de/) | Abruf bis zu alle fünf Minuten; lokale Regenprognose für die Region und Warnungen für den Landkreis sind keine Aussage über einzelne Gehwege |
| Flensburger Straßensperrungen | [TBZ-Verkehrsticker](https://tbz-flensburg.de/de/verkehrsticker) | Originalquelle verlinkt; mangels verlässlicher offener, verorteter Gehweg-API nicht als Kartenpunkte ausgegeben |
| Regionale Veranstaltungs-Highlights | [Tourismus Agentur Flensburger Förde](https://www.flensburger-foerde.de/events/veranstaltungen) und örtliche Originalkalender | Öffentlich sichtbare Highlights werden serverseitig ergänzt; kein vollständiger Spiegel fremder Kalender, Originalquellen bleiben maßgeblich |
| Notfallapotheke in der Glücksburger Ansicht | Bestehende Supabase-Tabelle `pharmacy_duty` | Anzeige nur während des eingetragenen Dienstes; zur Bestätigung Originalquelle öffnen |

Die Seite erhebt keine Strand-Auslastungsdaten und enthält keinen Müllkalender. Für amtliche Auskünfte und aktuelle Änderungen sind die jeweiligen Originalquellen maßgeblich.
