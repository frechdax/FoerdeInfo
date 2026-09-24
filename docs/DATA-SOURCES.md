# Datenquellen & Datenmodell

## Grundsatz

GlücksburgDirekt bündelt öffentlich zugängliche Informationen und verweist soweit möglich auf die jeweilige Originalquelle. Für verbindliche Angaben bleiben die Originalanbieter maßgeblich.

## Supabase

Die Anwendung verwendet Supabase als zentrale Datenebene.

### `streets`

Straßen für die Müllabfuhr-Auswahl.

In der Anwendung genutzte Felder:

- `id`
- `name`
- `asf_ort_number`
- `asf_street_number`

### `events`

Veranstaltungen und Termine.

Genutzte Felder:

- `id`
- `title`
- `description`
- `date`
- `end_date`
- `time`
- `location`
- `organizer`
- `source_url`
- `status`

Öffentliche Seiten filtern auf `status = published`.

### `civic_info`

Strukturierte Bürgerinformationen. Die Hauptanwendung lädt derzeit den Eintrag mit dem Schlüssel `buergerbuero`.

### `pharmacy_duty`

Apotheken-Notdienstinformationen für Glücksburg.

Verwendet werden unter anderem:

- Apotheke
- Straße / PLZ / Ort
- Dienstbeginn / Dienstende
- Distanz
- Originalquelle
- letzter Sync-Zeitpunkt

### `official_notices`

Amtliche Bekanntmachungen mit Datum, Titel und Link zur Quelle.

### `rathaus_news`

Rathausmeldungen mit Veröffentlichungsdatum, Titel und Originalquelle.

## ASF / Müllabfuhr

Quelle: **Abfallwirtschaft Schleswig-Flensburg (ASF)**.

Die Anwendung ruft nicht direkt aus dem Browser eine fremde ASF-Seite ab, sondern verwendet die Supabase Edge Function:

```text
sync-waste
```

Request:

```json
{
  "street_id": "<Supabase street id>"
}
```

Die Antwort wird in der Hauptanwendung als Liste aus `type` und `date` verarbeitet.

Aktuell dargestellte Fraktionen:

- Restmüll
- Biomüll
- Papier
- Gelbe Tonne

## Veranstaltungen

Die Veranstaltungsdaten werden zentral in der Supabase-Tabelle `events` bereitgestellt. Als öffentlich sichtbare Quellen werden je Datensatz nach Möglichkeit `source_url` und Veranstalterinformationen angezeigt.

Im Projekt werden unter anderem Verweise auf den Glücksburger Kulturkalender / kulturbytes genutzt. Die konkrete Import-/Sync-Logik liegt nicht in diesem GitHub-Repository und muss separat in Supabase bzw. dem jeweiligen Importprozess gepflegt werden.

## Rathaus

Öffentliche Informationen stammen aus Veröffentlichungen der **Stadt Glücksburg (Ostsee)**. GlücksburgDirekt kennzeichnet sich ausdrücklich als privates, unabhängiges Angebot und verlinkt zu den offiziellen Seiten.

## Wetter

Aktuelle Wetterdaten werden direkt im Browser über die API von **Open-Meteo** geladen.

Die Datenschutzhinweise der Anwendung nennen Open-Meteo als externen Wetterdienst.

## Freizeit, Urlaub und Sehenswürdigkeiten

Die redaktionellen Landingpages verlinken auf Originalangebote und offizielle Informationsseiten, darunter beispielsweise:

- Glücksburg Urlaub / Tourismus
- Schloss Glücksburg
- Menke-Planetarium
- lokale Gastronomiebetriebe

Diese Inhalte sind redaktionelle Zusammenstellungen und keine automatisch vollständig synchronisierte Branchen-Datenbank.

## Unterkünfte

Die Unterkunftssuche verwendet **Stay22**. Der Link ist als Affiliate-Link gekennzeichnet.

## Analytics und Werbung

### Vercel Web Analytics

Wird nach Statistik-Einwilligung eingebunden.

### Google Analytics 4

Kann über `NEXT_PUBLIC_GA_MEASUREMENT_ID` konfiguriert werden und wird nach Statistik-Einwilligung geladen.

### Google AdSense

Ist technisch vorbereitet. Aktivierung erfolgt über:

```text
NEXT_PUBLIC_ADSENSE_ENABLED=true
```

Der Publisher wird über `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` konfiguriert. `/ads.txt` wird dynamisch aus dieser Einstellung erzeugt.

## Datenschutz und Datenqualität

- Öffentliche Informationen können sich kurzfristig ändern.
- Termine sollten vor dem Besuch bei der Originalquelle geprüft werden.
- ASF-Angaben sollten bei Zweifeln mit dem offiziellen Abfallkalender abgeglichen werden.
- Keine privaten Supabase-Schlüssel in Client-Code verwenden.
- Die Website speichert Auswahl- und Consent-Daten lokal im Browser.
