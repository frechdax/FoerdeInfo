# Datenquellen von förde.info

## Grundsatz

förde.info unterscheidet zwischen **Live-/Realtime-Daten**, **Prognosen**, **amtlichen veröffentlichten Klassifikationen**, **Community-Meldungen** und **eigenen Berechnungen**.

Ein Wert wird nur als live dargestellt, wenn die jeweilige Quelle einen entsprechenden aktuellen Wert liefert. Fehlende Daten werden nicht geschätzt.

## Produktive Quellen

| Inhalt | Quelle | Aktualisierung / Grenze |
| --- | --- | --- |
| Wetter je Region | [Open-Meteo](https://open-meteo.com/) | Temperatur, gefühlte Temperatur, Niederschlag, Wettercode, Wind, Böen und Tageslicht; kurzfristige Prognose für Regenwahrscheinlichkeit und UV |
| Förde-/Wellenbedingungen | [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) | Wellenhöhe, Wellenperiode und Windwelle an einem Punkt in der Flensburger Förde |
| Amtliche Wetterwarnungen | [Deutscher Wetterdienst](https://www.dwd.de/) | Warnzellen für Stadt Flensburg und Kreis Schleswig-Flensburg; Warnungen fließen in eigene Aktivitätsscores ein |
| Badestellen / Badegewässer-Einstufung | [Open Data Schleswig-Holstein](https://opendata.schleswig-holstein.de/collection/badegewasser-stammdaten/aktuell) | veröffentlichte amtliche Klassifikation; **keine Live-Wasserqualitätsmessung** und keine Besucherzählung |
| Fördepegel in älterer Live-Logik | [PEGELONLINE](https://pegelonline.wsv.de/) | Pegelstation Flensburg; Messwert mit Zeitstempel |
| Gespeicherte Veranstaltungen | Supabase-Tabelle `events` | nur `status = published`; Änderungen und Absagen beim Veranstalter prüfen |
| Regionale Event-Highlights | [Tourismus Agentur Flensburger Förde](https://www.flensburger-foerde.de/events/veranstaltungen) | öffentlich sichtbare Highlights werden ergänzend serverseitig gelesen; kein vollständiger Spiegel |
| Karte | [OpenStreetMap](https://www.openstreetmap.org/copyright) | Kartengrundlage |
| Geokodierung | [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) | nur nach expliziter Suche; öffentliche Nutzungsgrenzen beachten |
| Routing | [FOSSGIS Routing](https://routing.openstreetmap.de/about.html) | Fuß-/Fahrradrouting; nicht als geprüfte Barrierefreiheitsroute behandeln |
| Wege-Meldungen | Supabase `way_reports`, `way_report_votes` | Community-Daten; nicht amtlich geprüft; zeitlich begrenzte Sichtbarkeit |
| GetYourGuide | Affiliate-Links | förde.info wählt Links situationsabhängig; Preis und Verfügbarkeit werden nicht selbst live abgefragt |

## Eigene Berechnungen

### Aktivitätsindex

Der Index für Spaziergang, Fahrrad, Strand/Wasser und Indoor ist eine eigene Berechnung von förde.info.

Eingangsgrößen sind u. a.:

- Temperatur
- gefühlte Temperatur
- Niederschlag
- Regenrisiko
- Wind
- Böen
- UV
- Tageslicht
- DWD-Warnstufe
- Wellenhöhe

Der Index ist eine Orientierung und keine amtliche Empfehlung.

### 2-Stunden-Fenster

Die erweiterte Live-Logik in `/api/live` bewertet kurzfristige Zeitfenster für Aktivitäten. Die angezeigten Scores sind abgeleitete Werte, keine Messwerte einer Behörde.

## Live-Daten-Labor – aktuelle Produktion

`/live-daten` ist derzeit eine nicht indexierte Pilotseite. In der produktiven Version sind die vorgesehenen Kategorien sichtbar, aber noch nicht alle mit echten Livequellen verbunden.

## Live-Daten-Labor – Entwicklungsbranch

Auf `feature/live-data-sources-strandampel-20260925` ist die ortsbezogene Aggregation in `/api/live-daten?ort=...` umgesetzt.

| Modul | Quelle | Status / Einschränkung |
| --- | --- | --- |
| Parkplatzbelegung | öffentliche SensorThings-Infrastruktur Schleswig-Holstein | passende Messreihen werden im Umkreis gesucht; wenn keine passende Messreihe existiert, Ausgabe `unavailable` |
| Besucherzählung | öffentliche SensorThings-Infrastruktur Schleswig-Holstein | nur reale gefundene Zähl-/Frequenzmesswerte; keine Hochrechnung |
| E-Ladesäulen | OpenStreetMap / Overpass | aktuelle erfasste Standorte/Kapazitäten; **keine verlässliche Live-Belegung frei/belegt** über diese Quelle |
| Verkehr | eigene aktive Wegecheck-Meldungen aus Supabase | live bezüglich eigener Meldungen; keine vollständige amtliche Straßenverkehrslage |
| ÖPNV | `v6.db.transport.rest` | nächste verfügbare Abfahrten mit vorhandenen Realtime-/Verspätungsdaten; Datenabdeckung abhängig von Haltestelle/Verkehrsunternehmen |
| Sharing | Donkey Republic Schleswig GBFS | Stationen und aktuell gemeldete verfügbare Fahrzeuge im Umkreis |

Die vier auswählbaren Regionen sind Flensburg, Wassersleben, Glücksburg und Langballig. Der Client aktualisiert die Pilotdaten regelmäßig.

## Strandampel – Entwicklungsbranch

Die Strandampel kombiniert:

- veröffentlichte Badegewässer-Einstufung
- lokales Wetter
- Tageslicht
- DWD-Warnstufe
- Förde-/Wellenbedingungen
- daraus berechneten Strand-Score

Farben:

- **Grün:** gute aktuelle Bedingungen und positive veröffentlichte Einstufung
- **Gelb:** eingeschränkte/unklare Lage, Warnhinweis oder nur ausreichende/fehlende Klassifikation
- **Rot:** deutliche Warnlage, sehr schlechter Strand-Score oder mangelhafte veröffentlichte Einstufung

Wichtig: Die Strandampel ist **keine amtliche Badefreigabe**, **keine Live-Wasserqualitätsmessung** und **keine Strandauslastungsmessung**.

## Nicht vorhandene Daten

förde.info behauptet derzeit insbesondere **nicht**, eine flächendeckende Live-Strandauslastung oder eine flächendeckende Echtzeit-Parkplatzbelegung für die gesamte Förderegion zu besitzen.

Wenn externe Anbieter oder Behörden keinen offenen Livefeed bereitstellen, wird dies sichtbar gekennzeichnet.
