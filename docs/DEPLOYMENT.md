# Deployment und Domain

## Projekt

- GitHub: `frechdax/GlucksburgDirekt`, Branch `main`
- Vercel-Projekt: `gluecksburg-direkt`
- Build: `npm run build`

## Domainwechsel

Sichtbarer Name der Website: **förde.info**. Technische Form der Ziel-Domain: `xn--frde-5qa.info`.

Voraussetzungen für den Domainwechsel:

1. `xn--frde-5qa.info` im Vercel-Projekt als Domain hinzufügen und DNS beim Registrar auf die von Vercel genannten Werte setzen.
2. Die Domainzuordnung und HTTPS prüfen.
3. Optional die Produktionsvariable `NEXT_PUBLIC_SITE_URL=https://xn--frde-5qa.info` setzen. Dieselbe Adresse ist bereits als Vorgabe im Code hinterlegt und steuert kanonische URLs, Open Graph, Sitemap, robots.txt und strukturierte Daten.
4. Die frühere Domain `www.glücksburg-direkt.de` behalten und nach der Umstellung auf die jeweils entsprechende URL der neuen Domain weiterleiten. Search Console für die neue Domain einrichten und die neue Sitemap einreichen.

Die kanonische URL im Code ist `https://xn--frde-5qa.info`. Die frühere Domain sollte nach erfolgreicher Verifizierung auf die neue Adresse weiterleiten.

## Produktionsvariablen

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GOOGLE_SITE_VERIFICATION` (für die neue Domain neu prüfen)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`
- `NEXT_PUBLIC_ADSENSE_ENABLED`
- `NEXT_PUBLIC_SITE_URL` nur, wenn die kanonische Adresse von der Vorgabe im Code abweichen soll

Keine Service-Role-Keys als `NEXT_PUBLIC_*` hinterlegen. Die bestehende Google-Site-Verifikation in `app/layout.tsx` betrifft möglicherweise nur die frühere Domain und muss für förde.info separat geprüft werden.

## Prüfung nach einem Deployment

- `/`, `/live` und alle vier `/orte/...`-Seiten laden.
- `/api/foerde` liefert Ortswetter und Badestellen; bei ausgefallenen Quellen keine erfundenen Werte.
- `/veranstaltungen`, `/urlaub`, `/gluecksburg` und der Impressumslink funktionieren.
- `/robots.txt`, `/sitemap.xml`, Canonicals und HTTPS zeigen auf die tatsächlich aktive Hauptdomain.
- Die bisherige Domain bleibt für bestehende Links erreichbar.
