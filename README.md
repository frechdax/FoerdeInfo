# GlücksburgDirekt

**GlücksburgDirekt** ist ein privates, unabhängiges Informationsangebot für Glücksburg (Ostsee). Die Anwendung bündelt lokale Informationen für Einwohner und Gäste – unter anderem Veranstaltungen, Freizeit- und Urlaubstipps, Rathausmeldungen, Wetter sowie den adressbezogenen Müllkalender.

## Live

**Produktiv:** https://www.glücksburg-direkt.de  
**Technische IDN-/Punycode-Domain:** https://www.xn--glcksburg-direkt-kzb.de

Die frühere Vercel-URL ist nicht die kanonische öffentliche Adresse. Canonical URLs, Open Graph, robots.txt, Sitemap und strukturierte Event-Daten verwenden die produktive Glücksburg-Domain.

## Funktionen

- **Veranstaltungen:** kommende Termine aus der zentralen Event-Datenbank, Detailseiten und Links zu Originalquellen
- **Heute in Glücksburg:** tagesaktuelle Veranstaltungsübersicht
- **Dieses Wochenende:** Veranstaltungen von Freitag bis Sonntag
- **Kalender-Export:** veröffentlichte Veranstaltungen als iCalendar-Datei (`.ics`)
- **Müllabfuhr:** Auswahl einer Glücksburger Straße und Abruf von Restmüll, Biomüll, Papier und Gelber Tonne über die ASF-Datenanbindung
- **Rathaus:** aktuelle Meldungen, amtliche Bekanntmachungen und Bürgerbüro-Informationen
- **Familie:** lokale Anlaufstellen und Angebote für Kinder, Jugendliche und Familien
- **Freizeit:** Ausflugsziele, Strand, Natur, Schwimmen, Wassersport und Schietwetter-Ideen
- **Urlaub:** Unterkünfte, Gastronomie, Sehenswürdigkeiten und praktische Planung
- **Sehenswürdigkeiten:** eigene SEO-Landingpage für wichtige Ziele in Glücksburg
- **Strände:** eigene Übersicht zu Strandbereichen in Glücksburg
- **Wetter:** aktuelle Wetterdaten über Open-Meteo
- **SEO:** dynamische Sitemap, robots.txt, Canonicals, Open Graph, Event-Detailseiten und Schema.org/Event
- **Consent & Analytics:** Einwilligungsverwaltung für Statistik/Marketing, Vercel Web Analytics und optional Google Analytics 4
- **Werbung:** Google AdSense ist technisch vorbereitet und standardmäßig nur bei aktivierter Konfiguration nutzbar
- **Affiliate:** Unterkunftssuche über Stay22 mit Kennzeichnung des Affiliate-Links

## Öffentliche Routen

| Route | Inhalt |
|---|---|
| `/` | Hauptanwendung |
| `/veranstaltungen` | kommende Veranstaltungen |
| `/veranstaltungen/[id]` | crawlbare Event-Detailseite |
| `/heute-in-gluecksburg` | heutige Termine |
| `/wochenende-in-gluecksburg` | Wochenendtermine |
| `/muellabfuhr` | Müllkalender-Einstieg |
| `/rathaus` | Rathausinformationen |
| `/familie` | Familienangebote |
| `/freizeit-gluecksburg` | Freizeitideen |
| `/urlaub` | Urlaub, Unterkünfte und Gastronomie |
| `/sehenswuerdigkeiten-gluecksburg` | Sehenswürdigkeiten |
| `/straende-gluecksburg` | Strände |
| `/api/calendar/[id]` | iCalendar-Export eines veröffentlichten Events |
| `/sitemap.xml` | dynamische Sitemap |
| `/robots.txt` | Robots-Konfiguration |
| `/ads.txt` | AdSense Publisher-Datei |

## Technik

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase (Datenbank + Edge Function für ASF-Abfuhrdaten)
- Vercel (Hosting + Web Analytics)
- Open-Meteo (Wetter)
- Google Analytics 4 optional nach Einwilligung
- Google AdSense optional
- Stay22 für Unterkunfts-Affiliate-Links

Node.js **22 oder neuer** wird vorausgesetzt.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Danach läuft die Anwendung standardmäßig unter `http://localhost:3000`.

Für einen Produktions-Build:

```bash
npm run build
npm start
```

## Umgebungsvariablen

Empfohlene Konfiguration:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_GA_MEASUREMENT_ID=

NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=
NEXT_PUBLIC_ADSENSE_ENABLED=false
```

Die Supabase-Verbindung besitzt aktuell Fallback-Werte im Quellcode. Für Deployment und lokale Entwicklung sollten dennoch die Environment Variables verwendet werden. Keine Service-Role-Keys oder andere private Secrets in Client-Code oder Git committen.

## Daten

Die Anwendung liest unter anderem aus folgenden Supabase-Tabellen:

- `streets`
- `events`
- `civic_info`
- `pharmacy_duty`
- `official_notices`
- `rathaus_news`

Die Mülltermine werden über die Supabase Edge Function `sync-waste` für die ausgewählte Straße geladen und lokal im Browser zwischengespeichert.

Details: [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md)

## Projektstruktur

```text
app/
  api/calendar/[id]/route.ts    # iCalendar-Export
  veranstaltungen/              # Event-Übersicht + Detailseiten
  heute-in-gluecksburg/         # Tagesübersicht
  wochenende-in-gluecksburg/    # Wochenendübersicht
  muellabfuhr/                  # SEO-Landingpage Müllabfuhr
  rathaus/                      # Rathaus-Landingpage
  familie/                      # Familien-Landingpage
  freizeit-gluecksburg/         # Freizeit-Landingpage
  urlaub/                       # Urlaub/Gastronomie/Unterkünfte
  sehenswuerdigkeiten-gluecksburg/
  straende-gluecksburg/
  layout.tsx                    # globale Metadata + Consent Default
  sitemap.ts                    # dynamische Sitemap
  robots.ts                     # Robots + Sitemap-URL
  page.tsx                      # Hauptanwendung

lib/
  supabase.ts                   # Browser-Client
  supabase-public-server.ts     # öffentlicher Server-Client
  stay22.ts                     # Unterkunfts-Affiliate-Link

docs/
  ARCHITECTURE.md
  DATA-SOURCES.md
  DEPLOYMENT.md
```

## Weitere Dokumentation

- [Architektur](docs/ARCHITECTURE.md)
- [Datenquellen & Datenmodell](docs/DATA-SOURCES.md)
- [Deployment, Domain & SEO](docs/DEPLOYMENT.md)

## Hinweise

GlücksburgDirekt ist **nicht** die offizielle Website der Stadt Glücksburg. Für verbindliche Angaben sind die jeweiligen Originalquellen maßgeblich. Externe Veranstaltungstermine, Öffnungszeiten und Abfuhrtermine können sich kurzfristig ändern.

Stand der Dokumentation: **24. September 2026**.
