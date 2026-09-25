# Architektur von förde.info

## Routen

Die Next.js-App bietet eine regionale Startseite (`/`), eine gleichartige Live-Ansicht (`/live`), Ortsseiten (`/orte/[slug]`) und die regionalen Übersichten für Veranstaltungen und Urlaub. Die bisherige, ausdrücklich auf Glücksburg bezogene Ansicht bleibt unter `/gluecksburg` und den zugehörigen Unterseiten erhalten. Frühere ortsspezifische SEO-Seiten behalten ihre Ortsangabe.

Die Ortskonfiguration liegt in `lib/regions.ts`. Jeder Ort besitzt Koordinaten und amtliche Badestellenkennungen. Die API-Route `app/api/foerde/route.ts` holt Wetterprognosen parallel bei Open-Meteo sowie Badegewässer-Stammdaten und Einstufungen vom Land Schleswig-Holstein. Die Antwort wird fünf Minuten zwischengespeichert; die Seite fragt sie bei geöffnetem Fenster erneut ab. Fehlt eine Quelle, wird kein Ersatzwert erfunden.

Die ältere, umfangreichere Glücksburger Live-Ansicht bezieht ihre Daten aus `app/api/live/route.ts`. Sie ist ausdrücklich als Glücksburg-Ansicht beschriftet. Der Pegel Flensburg und DWD-Warnungen bleiben dort jeweils mit ihrer Quelle gekennzeichnet.

## Inhalte

Die vorhandenen Glücksburger Veranstaltungen und der Apotheken-Notdienst werden aus Supabase gelesen. Termine anderer Orte verlinken derzeit zu regionalen Originalkalendern; eine automatische Einbindung ist nicht eingerichtet. Die Anwendung hat keinen Müllkalender.

## Veröffentlichung und SEO

Next.js erzeugt Metadaten, `robots.txt` und `sitemap.xml` mit `https://xn--frde-5qa.info` als kanonischer Herkunft. `NEXT_PUBLIC_SITE_URL` kann diese Adresse bei Bedarf überschreiben.

Die Datenschutz-Einwilligung wird unter dem bisherigen lokalen Speicherschlüssel weitergelesen, damit vorhandene Einstellungen nicht unbemerkt verloren gehen.
