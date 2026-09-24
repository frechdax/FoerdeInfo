# Architektur

Diese Datei beschreibt den technischen Stand von **GlücksburgDirekt** am 24. September 2026.

## Überblick

GlücksburgDirekt ist eine Next.js-16-Anwendung mit App Router. Die Hauptseite ist clientseitig interaktiv; SEO-Landingpages und Event-Detailseiten werden als eigene Routen bereitgestellt. Supabase dient als öffentliche Datenquelle für lokale Inhalte. Vercel hostet die Anwendung.

```text
Browser
  |
  +-- Next.js / Vercel
  |     +-- Hauptanwendung (app/page.tsx)
  |     +-- SEO-Landingpages
  |     +-- Event-Detailseiten
  |     +-- /api/calendar/[id]
  |     +-- sitemap.xml / robots.txt / ads.txt
  |
  +-- Supabase
  |     +-- PostgreSQL-Tabellen
  |     +-- Edge Function: sync-waste
  |
  +-- Open-Meteo
  +-- externe Originalquellen
  +-- Stay22
  +-- Vercel Analytics / optional GA4 / optional AdSense
```

## Frontend

### Hauptanwendung

`app/page.tsx` enthält die zentrale interaktive Oberfläche und lädt mehrere Datenbereiche parallel aus Supabase. Die Navigation arbeitet innerhalb der Anwendung mit verschiedenen Views für Start, Müll, Veranstaltungen, Urlaub, Familie und Rathaus.

Der ausgewählte Straßenbezug sowie zwischengespeicherte Mülltermine werden im Browser gespeichert, damit die Nutzung beim nächsten Besuch schneller wiederhergestellt werden kann.

### SEO-Landingpages

Die eigenständigen Routen unter `app/*/page.tsx` machen wichtige Suchintentionen direkt crawlbar. Dazu gehören insbesondere:

- Müllkalender
- Veranstaltungen
- Heute in Glücksburg
- Dieses Wochenende in Glücksburg
- Freizeit
- Urlaub
- Sehenswürdigkeiten
- Strände
- Familie
- Rathaus

Die gemeinsame Darstellung erfolgt über `app/seo-landing.tsx`.

### Event-Detailseiten

`/veranstaltungen/[id]` lädt ein veröffentlichtes Event direkt aus Supabase und erzeugt:

- individuelle Metadata
- Canonical URL
- Open-Graph-Daten
- Schema.org-`Event` als JSON-LD
- Link zur Originalquelle
- Download als iCalendar-Datei

Die Seiten werden aktuell mit `revalidate = 1800` aktualisiert.

## Datenzugriff

Es existieren zwei Supabase-Helfer:

- `lib/supabase.ts`: Client für die interaktive Browser-Anwendung
- `lib/supabase-public-server.ts`: öffentlicher Server-Client ohne persistente Session

Beide verwenden ausschließlich den öffentlichen/publishable Supabase-Key. Private Service-Role-Schlüssel gehören nicht in dieses Repository und nicht in `NEXT_PUBLIC_*`-Variablen.

## Müllabfuhr

Der Client ruft die Supabase Edge Function `sync-waste` mit der ausgewählten `street_id` auf. Die Funktion liefert die nächsten Abfuhrereignisse zurück.

Unterstützte Typen in der UI:

- Restmüll
- Biomüll
- Papier
- Gelbe Tonne

Die aktuell geprüfte Implementierung arbeitet auf Straßenebene. Die Supabase-Tabelle `streets` enthält zusätzlich die ASF-Orts- und Straßennummern, die für die Datenanbindung genutzt werden.

## Veranstaltungen

Veranstaltungen werden aus `events` gelesen. Öffentlich angezeigt werden nur Datensätze mit `status = published`.

Wichtige Felder:

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

Die Startseite, Tages- und Wochenendseiten sowie Sitemap und Event-Detailseiten verwenden diese Daten.

## iCalendar

`app/api/calendar/[id]/route.ts` erzeugt eine standardkonforme `.ics`-Antwort für veröffentlichte Events. Zeitangaben werden in der Zeitzone `Europe/Berlin` ausgegeben.

UIDs verwenden die produktive Domain in ASCII/Punycode:

```text
<event-id>@xn--glcksburg-direkt-kzb.de
```

## SEO

Die kanonische Domain ist:

```text
https://www.glücksburg-direkt.de
```

Technisch wird sie wegen des Umlauts als Punycode gespeichert:

```text
https://www.xn--glcksburg-direkt-kzb.de
```

SEO-Bausteine:

- globale Metadata in `app/layout.tsx`
- Canonicals pro Landingpage
- Open Graph
- `robots.ts`
- dynamische `sitemap.ts`
- crawlbare Event-Detailseiten
- Schema.org-`Event`
- Website JSON-LD

## Consent, Analytics und Werbung

`app/consent-manager.tsx` verwaltet getrennte Einwilligungen für Statistik und Marketing.

Statistik kann aktivieren:

- Vercel Web Analytics
- Google Analytics 4

Marketing kann – bei aktivierter Konfiguration – Google AdSense erlauben.

Google Consent Mode startet global mit verweigerten Storage-Rechten und wird nach der Nutzerauswahl aktualisiert.

## Unterkunfts-Affiliate

`lib/stay22.ts` erzeugt den Unterkunftslink für Glücksburg. Die UI weist darauf hin, dass bei einer Buchung eine Provision entstehen kann, ohne zusätzliche Kosten für den Nutzer.

## Caching / Aktualisierung

- `/heute-in-gluecksburg`: Revalidate 900 Sekunden
- `/wochenende-in-gluecksburg`: Revalidate 900 Sekunden
- `/veranstaltungen`: Revalidate 1800 Sekunden
- `/veranstaltungen/[id]`: Revalidate 1800 Sekunden
- `/rathaus`: Revalidate 1800 Sekunden
- iCalendar: `Cache-Control: public, max-age=300`

Die interaktive Hauptseite hält ausgewählte Müllinformationen zusätzlich in `localStorage`.
