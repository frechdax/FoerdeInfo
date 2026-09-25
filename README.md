# förde.info

Privates, unabhängiges Informationsangebot für Flensburg, Wassersleben (Harrislee), Glücksburg und Langballig an der Flensburger Förde.

## Seiten

- `/` und `/live`: mobile Ortswahl mit Live-Wetter von Open-Meteo, amtlichen DWD-Warnungen, Badegewässer-Einstufung und einem daraus berechneten „Was kann ich gerade machen?“-Index. Passende GetYourGuide-Links werden wetterabhängig als Werbung gekennzeichnet ausgespielt.
- `/orte/flensburg`, `/orte/wassersleben`, `/orte/gluecksburg`, `/orte/langballig`: örtliche Informationen, Badestellen und Links zu Originalquellen.
- `/veranstaltungen`: vorhandene förde.info-Termine aus Supabase sowie öffentlich sichtbare Event-Highlights der Tourismus Agentur Flensburger Förde; Einträge bieten Originalquelle und iCalendar-Aktion.
- `/urlaub`: Ausflugs- und Freizeitübersicht.
- `/gluecksburg`: ausführliche Glücksburger Ansicht. Dazu gehören `/gluecksburg/live`, `/gluecksburg/veranstaltungen` und `/gluecksburg/urlaub`.
- `/partner`: Kontakt für regionale Kooperationen.
- `/wege`: mobile Wegprüfung mit freiwilligem GPS-Start, Fuß-/Fahrradrouting, Ortsuche und zeitlich begrenzten Nachbarschaftsmeldungen.

Die Anwendung enthält keinen Müllkalender. Externe Veranstaltungskalender werden nicht vollständig gespiegelt; öffentlich sichtbare Highlights werden ergänzend eingelesen und die Originalkalender bleiben verlinkt. Badegewässer-Einstufungen sind keine aktuelle Messung der Wassertemperatur oder Besucherzahl.

## Wegecheck

`/wege` zeigt gemeldete Hindernisse nahe einer berechneten Route (40 m Korridor), nicht die tatsächliche Passierbarkeit des gesamten Wegs. Fußrouten für Kinderwagen oder Rollstuhl sind **nicht** auf Barrierefreiheit geprüft. Die Karte und Routen stammen aus OpenStreetMap, die Fuß- und Fahrradrouten vom FOSSGIS-Routingdienst. Die Geokodierung über Nominatim wird nur nach einer expliziten Suche aufgerufen. Standortfreigabe erfolgt ausschließlich nach Tippen auf den entsprechenden Button.

Die Tabellen `way_reports` und `way_report_votes` werden durch `supabase/migrations/20260925102500_way_reports.sql` angelegt. Meldungen sind öffentlich, nicht amtlich geprüft, verschwinden nach 48 Stunden aus der öffentlichen Abfrage und benötigen keinen Account. Ein stündlicher Datenbankjob löscht abgelaufene Meldungen samt Fotos und Bestätigungen. Hochgeladene Fotos werden auf eine kleine JPEG-Datei reduziert und als Teil des öffentlichen Datensatzes gespeichert. „Wieder frei“-Stimmen ergänzen den Hinweis, entfernen ihn aber nicht, da Stimmen ohne Anmeldung nicht sicher einer Person zugeordnet werden können. Die Eingabebeschränkung im API-Handler gilt nur pro Serverinstanz; für starkes Aufkommen braucht es zusätzliche Missbrauchsprävention und eine unabhängige Moderation. Die genutzten öffentlichen Routing-/Geocoding-Dienste haben Nutzungsgrenzen.

## Technik

Next.js 16 (App Router), React 19, Supabase für bestehende Glücksburger Inhalte, Open-Meteo und offizielle Badegewässerdaten des Landes Schleswig-Holstein. Der Produktions-Build läuft mit `npm run build`.

## Domain und Veröffentlichung

Die Website ist für [förde.info](https://xn--frde-5qa.info) konfiguriert (`xn--frde-5qa.info` in IDN/Punycode). Siehe [Deployment](docs/DEPLOYMENT.md).

## Quellen und Hinweise

Siehe [Datenquellen](docs/DATA-SOURCES.md) und [Architektur](docs/ARCHITECTURE.md). Für verbindliche Angaben gelten die Originalquellen. Das Projekt ist keine offizielle Veröffentlichung der genannten Städte oder Gemeinden.
