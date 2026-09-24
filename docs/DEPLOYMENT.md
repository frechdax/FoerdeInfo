# Deployment, Domain & SEO

## Vercel-Projekt

Das produktive Vercel-Projekt heißt:

```text
gluecksburg-direkt
```

Deployment erfolgt über Vercel aus dem GitHub-Repository:

```text
frechdax/GlucksburgDirekt
```

Standardbranch:

```text
main
```

## Produktive Domain

Öffentliche Adresse:

**https://www.glücksburg-direkt.de**

Da die Domain einen Umlaut enthält, lautet die technische ASCII-/Punycode-Form:

```text
https://www.xn--glcksburg-direkt-kzb.de
```

Die Punycode-Form wird bewusst im Quellcode für URL-Objekte, robots.txt, Sitemap und strukturierte Daten verwendet. Für Nutzer und Dokumentation kann die lesbare Unicode-Domain verwendet werden.

Die frühere Adresse `gluecksburg-direkt.vercel.app` ist **nicht** die kanonische Produktivdomain.

## Domain-relevante Dateien

Beim Ändern der Produktivdomain müssen mindestens diese Stellen geprüft werden:

- `app/layout.tsx` – `metadataBase`, Open Graph, WebSite JSON-LD
- `app/robots.ts` – Host und Sitemap
- `app/sitemap.ts` – Basis-URL aller Sitemap-Einträge
- `app/event-structured-data.tsx` – Event-`@id` und Event-URL
- `app/api/calendar/[id]/route.ts` – iCalendar UID-Domain
- `README.md` und `docs/`

## SEO-Konfiguration

### Global

`app/layout.tsx` enthält:

- Seitentitel und Titel-Template
- globale Description
- Keywords
- Canonical
- Open Graph
- Twitter Card
- Google Site Verification
- Robots-Einstellungen
- WebSite JSON-LD

### Sitemap

`app/sitemap.ts` enthält die statischen Kernseiten und ergänzt dynamisch bis zu 1000 veröffentlichte, zukünftige Events.

### robots.txt

`app/robots.ts` erlaubt das Crawling der Website und verweist auf die produktive Sitemap.

### Event-SEO

Jede Event-Detailseite besitzt:

- eigene Metadata
- Canonical URL
- Open Graph
- Schema.org Event JSON-LD
- Originalquelle, sofern vorhanden

## Environment Variables

In Vercel sollten mindestens folgende Variablen geprüft werden:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
GOOGLE_SITE_VERIFICATION
NEXT_PUBLIC_GA_MEASUREMENT_ID
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT
NEXT_PUBLIC_ADSENSE_ENABLED
```

Empfehlung:

- Supabase-Variablen für Production und Preview setzen
- `NEXT_PUBLIC_ADSENSE_ENABLED` nur auf `true` setzen, wenn Werbung tatsächlich live gehen soll
- keine Service-Role-Keys als `NEXT_PUBLIC_*` hinterlegen

## Deployment-Checkliste

1. Änderungen nach `main` pushen oder Pull Request mergen.
2. Vercel-Deployment prüfen.
3. Produktionsdomain auf erfolgreiche Zuordnung/SSL prüfen.
4. Startseite und wichtigste Landingpages aufrufen.
5. `/robots.txt` prüfen.
6. `/sitemap.xml` prüfen.
7. Event-Detailseite und JSON-LD prüfen.
8. `/api/calendar/<event-id>` testen.
9. Müllabfuhr für mindestens eine Straße testen.
10. Consent-Einstellungen testen.
11. Falls Analytics aktiv: Events/Seitenaufrufe nach Einwilligung prüfen.
12. Falls AdSense aktiv: `/ads.txt` und Consent-Verhalten prüfen.
13. Google Search Console auf die produktive Domain/Sitemap ausrichten.

## Lokal testen

```bash
npm install
npm run build
npm run dev
```

Ein erfolgreicher `npm run build` sollte vor produktiven Änderungen Pflicht sein.

## Hinweis zur IDN-Domain

Die Darstellung mit `ü` und die Punycode-Schreibweise bezeichnen dieselbe Domain. Im Code ist die Punycode-Version robuster, weil sie ausschließlich ASCII-Zeichen enthält.

Lesbar:

```text
www.glücksburg-direkt.de
```

Technisch:

```text
www.xn--glcksburg-direkt-kzb.de
```
