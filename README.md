# förde.info

Privates, unabhängiges Informationsangebot für Flensburg, Wassersleben (Harrislee), Glücksburg und Langballig an der Flensburger Förde.

## Seiten

- `/` und `/live`: Ortswahl mit aktuellem Wetter von Open-Meteo und amtlicher Badegewässer-Einstufung des Landes Schleswig-Holstein.
- `/orte/flensburg`, `/orte/wassersleben`, `/orte/gluecksburg`, `/orte/langballig`: örtliche Informationen, Badestellen und Links zu Originalquellen.
- `/veranstaltungen`: regionale Originalkalender und vorhandene, als Glücksburg gekennzeichnete Termine aus Supabase.
- `/urlaub`: Ausflugs- und Freizeitübersicht.
- `/gluecksburg`: ausführliche Glücksburger Ansicht. Dazu gehören `/gluecksburg/live`, `/gluecksburg/veranstaltungen` und `/gluecksburg/urlaub`.
- `/partner`: Kontakt für regionale Kooperationen.

Die Anwendung enthält keinen Müllkalender. Die Veranstaltungsdaten anderer Orte werden derzeit nicht automatisch importiert. Badegewässer-Einstufungen sind keine aktuelle Messung der Wassertemperatur oder Besucherzahl.

## Technik

Next.js 16 (App Router), React 19, Supabase für bestehende Glücksburger Inhalte, Open-Meteo und offizielle Badegewässerdaten des Landes Schleswig-Holstein. Der Produktions-Build läuft mit `npm run build`.

## Domain und Veröffentlichung

Die Website ist für [förde.info](https://xn--frde-5qa.info) konfiguriert (`xn--frde-5qa.info` in IDN/Punycode). Siehe [Deployment](docs/DEPLOYMENT.md).

## Quellen und Hinweise

Siehe [Datenquellen](docs/DATA-SOURCES.md) und [Architektur](docs/ARCHITECTURE.md). Für verbindliche Angaben gelten die Originalquellen. Das Projekt ist keine offizielle Veröffentlichung der genannten Städte oder Gemeinden.
