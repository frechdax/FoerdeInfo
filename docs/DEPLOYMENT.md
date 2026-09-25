# Deployment und Domain von förde.info

## Projektbezeichnungen

Öffentlicher Produktname:

**förde.info**

Technische Bestandsnamen:

- GitHub-Repository: `frechdax/GlucksburgDirekt`
- Vercel-Projekt: `gluecksburg-direkt`
- Produktionsbranch: `main`

Diese technischen Namen sind historisch und bedeuten nicht, dass das Produkt weiterhin „GlücksburgDirekt“ heißt.

## Domain

Hauptdomain:

- sichtbar: `https://förde.info`
- IDN/Punycode: `https://xn--frde-5qa.info`
- zusätzlich: `https://www.xn--frde-5qa.info`

Die kanonische URL im Code verwendet standardmäßig `https://xn--frde-5qa.info`.

`NEXT_PUBLIC_SITE_URL` kann die kanonische Herkunft überschreiben.

## Build

Voraussetzungen:

- Node.js >= 22
- Next.js 16
- installierte npm-Abhängigkeiten

Build:

```bash
npm install
npm run build
```

Vercel ist per Git-Integration mit dem Repository verbunden.

- Pushes auf Feature-Branches können Preview-Deployments erzeugen.
- Änderungen auf `main` lösen den Production-Workflow aus.
- Ein Preview ist **nicht** automatisch Produktion.
- Bei Vercel-Buildlimits kann ein Git-Commit vorhanden sein, obwohl noch kein neuer Production-Build gelaufen ist.

## Produktionsvariablen

Erwartete öffentliche Konfiguration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` optional
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`
- `NEXT_PUBLIC_ADSENSE_ENABLED`
- `GOOGLE_SITE_VERIFICATION`

Keine Supabase-Service-Role-Keys oder andere Geheimnisse unter `NEXT_PUBLIC_*` speichern.

## Prüfung nach einem Deployment

### Kernseiten

Prüfen:

- `/`
- `/live`
- `/veranstaltungen`
- `/wege`
- `/live-daten`
- `/partner`
- `/gluecksburg`

Die früheren Seiten `/orte/[slug]` und `/urlaub` gehören nicht mehr zum aktuellen regionalen Hauptaufbau.

### APIs

Prüfen:

- `/api/foerde`
- `/api/live`
- `/api/wege/reports`
- `/api/calendar/[id]`
- `/api/calendar/external`

Nach Merge des Branches `feature/live-data-sources-strandampel-20260925` zusätzlich:

- `/api/live-daten?ort=flensburg`
- `/api/live-daten?ort=wassersleben`
- `/api/live-daten?ort=gluecksburg`
- `/api/live-daten?ort=langballig`

### Funktionale Checks

- Wetterdaten besitzen plausible Zeitstempel.
- DWD-Warnungen werden nicht als eigene amtliche Bewertung umformuliert.
- Bei Quellenausfall erscheinen keine erfundenen Live-Werte.
- Aktivitätsscores sind als eigene Orientierung erkennbar.
- Affiliate-Links sind als Werbung gekennzeichnet.
- Veranstaltungen lassen sich suchen und nach Zeitraum/Ort filtern.
- iCalendar-Links funktionieren.
- Wegecheck lädt Karte, Routing und aktive Meldungen.
- Nach Merge der Strandampel: Grün/Gelb/Rot wird als förde.info-Orientierung erklärt.
- `/live-daten` bleibt solange `noindex`, bis Datenabdeckung und Produktentscheidung abgeschlossen sind.

## SEO

Prüfen:

- `/robots.txt`
- `/sitemap.xml`
- Canonicals
- Open-Graph-URLs
- strukturierte Daten
- HTTPS und Domain-Aliase

Die Sitemap soll nur Routen enthalten, die tatsächlich öffentlich geführt werden sollen.

## Rollout-Status

Stand 25. September 2026:

- regionale förde.info-Startseite: Produktion
- Veranstaltungen mit Suche/Filtern: Produktion
- Wegecheck: Produktion
- Live-Daten-Labor als Pilotseite: Produktion
- ortsbezogene echte Live-Datenaggregation: Entwicklungsbranch `feature/live-data-sources-strandampel-20260925`
- Strandampel: Entwicklungsbranch `feature/live-data-sources-strandampel-20260925`
