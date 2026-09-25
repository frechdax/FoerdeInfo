# förde.info

**förde.info** ist ein privates, unabhängiges Informationsangebot für die Flensburger Förde mit Fokus auf **Flensburg, Wassersleben, Glücksburg und Langballig**.

Die Anwendung bündelt öffentliche Datenquellen, lokale Inhalte und eigene Entscheidungslogik zu einer mobilen Regionalübersicht: Wetter, DWD-Warnungen, Fördebedingungen, Aktivitäten, Veranstaltungen, Strandinformationen, Wegecheck und künftig weitere ortsbezogene Live-Daten.

> Der GitHub-Repositoryname `GlucksburgDirekt` und der interne Vercel-Projektname `gluecksburg-direkt` sind historische technische Bezeichner. Das Produkt und die öffentliche Website heißen **förde.info**.

## Aktueller Funktionsumfang

### Startseite und Live-Übersicht

`/` und `/live` zeigen eine gemeinsame regionale Live-Ansicht für die Flensburger Förde.

Enthalten sind:

- regional zusammengefasstes Wetter aus Open-Meteo
- Regenrisiko der nächsten Stunden, Wind, Böen und UV
- Förde-/Wellenbedingungen
- amtliche DWD-Warnungen
- eigener Aktivitätsindex für Spaziergang, Fahrrad, Strand/Wasser und Indoor
- wetterabhängige Aktivitätsempfehlungen
- gekennzeichnete GetYourGuide-Affiliate-Links
- Badestellen bzw. deren veröffentlichte amtliche Badegewässer-Einstufungen
- Links zu Wegecheck und Veranstaltungen

Die frühere manuelle Ortsauswahl auf der Startseite wurde entfernt. Die regionale Übersicht aggregiert die Daten für Flensburg, Wassersleben, Glücksburg und Langballig.

### Veranstaltungen

`/veranstaltungen` bündelt vorhandene veröffentlichte Termine aus Supabase und öffentlich sichtbare Event-Highlights der Tourismus Agentur Flensburger Förde.

Die Oberfläche bietet:

- Freitextsuche
- Filter **Heute**
- Filter **Morgen**
- Filter **Wochenende**
- Filter **Nächste Woche**
- Ortsfilter
- iCalendar-Download
- Originalquellen

Mehrtagestermine werden bei den Zeitraumfiltern berücksichtigt. Für in Supabase gespeicherte Termine existieren aktuell eigene Detailseiten unter `/veranstaltungen/[id]`; externe Highlights führen direkt zur jeweiligen externen Quelle.

### Wegecheck

`/wege` ist eine mobile Wegprüfung für Flensburg, Wassersleben, Glücksburg und Langballig.

Funktionen:

- optionaler Gerätestandort erst nach ausdrücklicher Freigabe
- Orts-/Adresssuche
- Fuß- und Fahrradrouting
- Karte auf OpenStreetMap-Basis
- zeitlich begrenzte Nachbarschaftsmeldungen zu Hindernissen
- Meldungsarten u. a. Sperrung, Baustelle, Oberfläche und Überflutung
- Bestätigung „noch da“ / „wieder frei“
- Live-Entscheidungshilfen aus `/api/live`
- „Beste Option gerade“
- kontextuelle Affiliate-/Freizeitkarten
- 2-Stunden-Vorschau „Beste Zeit heute“

Wegmeldungen sind **nicht amtlich geprüft** und ersetzen keine verbindliche Aussage zur Passierbarkeit oder Barrierefreiheit.

### Live-Daten-Labor

`/live-daten` ist eine bewusst nicht indexierte Pilotseite für zusätzliche Echtzeitinformationen.

Die aktuell produktive Version zeigt die vorgesehenen Module für:

- Parkplatzbelegung
- Besucherzählung
- E-Ladesäulen
- Verkehr
- ÖPNV
- Sharing

Die nächste Ausbaustufe befindet sich auf dem Branch `feature/live-data-sources-strandampel-20260925`. Dort ist bereits eine ortsbezogene Live-API für Flensburg, Wassersleben, Glücksburg und Langballig umgesetzt. Sie versucht reale Daten aus öffentlichen Quellen abzurufen und zeigt ausdrücklich **keinen erfundenen Ersatzwert**, wenn eine Quelle für den gewählten Ort nichts liefert.

Details: [Projektstatus](docs/PROJECT-STATUS.md) und [Datenquellen](docs/DATA-SOURCES.md).

### Strandampel – in Entwicklung

Auf `feature/live-data-sources-strandampel-20260925` wurde die bisherige Badestellenübersicht zu einer **Strandampel** weiterentwickelt.

Die Ampelfarbe kombiniert:

- aktuelle Wetterlage
- Tageslicht
- DWD-Warnstufe
- Förde-/Wellenbedingungen
- veröffentlichte amtliche Badegewässer-Einstufung

Die Ampel ist eine **eigene Orientierung von förde.info**. Sie ist keine amtliche Badefreigabe, keine Live-Messung der Wasserqualität und keine Messung der Strandauslastung.

## Region

Die zentrale Ortskonfiguration liegt in `lib/regions.ts`:

- Flensburg
- Wassersleben
- Glücksburg
- Langballig

Dort werden Koordinaten, regionale Metadaten und die Kennungen der amtlichen Badestellen gepflegt.

## Monetarisierung

Das Projekt unterstützt gekennzeichnete Affiliate-Vermittlung. Aktuell werden insbesondere GetYourGuide-Aktivitäten abhängig von der jeweiligen Wetter-/Aktivitätslage ausgewählt.

Affiliate-Inhalte sind in der Oberfläche als Werbung gekennzeichnet. Redaktionelle Hinweise und externe Originalquellen werden davon getrennt behandelt.

Google AdSense ist technisch vorbereitet und wird über die dafür vorgesehenen Umgebungsvariablen gesteuert.

## Technik

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase
- Leaflet / OpenStreetMap
- Vercel
- Node.js >= 22

Lokaler Start:

```bash
npm install
npm run dev
```

Produktions-Build:

```bash
npm run build
```

## Wichtige API-Routen

| Route | Zweck |
| --- | --- |
| `/api/foerde` | Regionales Wetter, DWD-Warnungen, Fördebedingungen und amtliche Badegewässerdaten |
| `/api/live` | Erweiterte Live-Entscheidungslogik, Scores und 2-Stunden-Fenster |
| `/api/live-daten` | Ortsbezogene Pilotaggregation zusätzlicher Echtzeitquellen; aktuell im Feature-Branch |
| `/api/wege/reports` | Aktive Nachbarschaftsmeldungen |
| `/api/wege/route` | Weg-/Routingfunktionen |
| `/api/wege/geocode` | Adress-/Ortssuche |
| `/api/calendar/[id]` | iCalendar für gespeicherte Veranstaltungen |
| `/api/calendar/external` | iCalendar für externe Veranstaltungshighlights |

## Domain und Deployment

Öffentliche Hauptdomain:

**https://förde.info**  
Technisch als IDN/Punycode: `https://xn--frde-5qa.info`

Deployment läuft über Vercel. Details stehen in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Datenqualität und Transparenz

förde.info unterscheidet bewusst zwischen:

- echten Live-/Realtime-Daten
- kurzfristigen Prognosen
- veröffentlichten amtlichen Klassifikationen
- Community-Meldungen
- eigenen Scores/Entscheidungshilfen
- redaktionellen bzw. Affiliate-Empfehlungen

Wenn eine Quelle keinen verlässlichen Wert liefert, soll **kein plausibel klingender Ersatzwert erfunden werden**.

Die Anwendung enthält **keinen Müllkalender**.

Für verbindliche Angaben, Warnungen, Terminänderungen und amtliche Informationen gelten immer die jeweiligen Originalquellen.

## Dokumentation

- [Architektur](docs/ARCHITECTURE.md)
- [Datenquellen](docs/DATA-SOURCES.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Projektstatus und umgesetzte Funktionen](docs/PROJECT-STATUS.md)
