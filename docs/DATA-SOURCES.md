# Datenquellen von förde.info

| Inhalt | Quelle | Aktualisierung und Grenze |
| --- | --- | --- |
| Wetter nach Ort | [Open-Meteo](https://open-meteo.com/) | Koordinaten je Ort, API-Cache fünf Minuten; Prognose, keine amtliche Warnung |
| Badestellen und Qualitäts-Einstufung | [Open Data Schleswig-Holstein](https://opendata.schleswig-holstein.de/collection/badegewasser-stammdaten/aktuell) | Amtliche Badestellenkennungen und jüngste veröffentlichte Einstufung; keine Live-Messung |
| Pegel und Warnungen in der Glücksburger Detailansicht | [PEGELONLINE](https://pegelonline.wsv.de/) und [DWD](https://www.dwd.de/) | Wie in `app/api/live/route.ts` abgefragt; regionale Gültigkeit beachten |
| Vorhandene Glücksburger Veranstaltungen | Supabase-Tabelle `events` mit Link zur Originalquelle | Nur `status = published`; Änderungen beim Veranstalter prüfen |
| Veranstaltungen anderer Orte | [Tourismus Agentur Flensburger Förde](https://www.flensburger-foerde.de/events/veranstaltungen) und örtliche Originalkalender | Links auf die Quelle; kein automatischer Import |
| Notfallapotheke in der Glücksburger Ansicht | Bestehende Supabase-Tabelle `pharmacy_duty` | Anzeige nur während des eingetragenen Dienstes; zur Bestätigung Originalquelle öffnen |

Die Seite erhebt keine Strand-Auslastungsdaten und enthält keinen Müllkalender. Für amtliche Auskünfte und aktuelle Änderungen sind die jeweiligen Originalquellen maßgeblich.
