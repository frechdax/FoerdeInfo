import Link from "next/link";

export default function DataSourcesPage() {
  return (
    <main className="info-page"><div className="info-shell">
      <div className="info-nav"><Link href="/">← BusRadar</Link><span>Datenquellen</span></div>
      <h1>Datenquellen & Kennzeichnung</h1>
      <div className="prose">
        <h2>Fahrplandaten</h2><p>BusRadar nutzt standardmäßig den kostenfreien Deutschland-ÖPNV-GTFS-Feed von GTFS.de. Dieser basiert auf DELFI-/NeTEx-Daten, wird regelmäßig aktualisiert und wird von GTFS.de unter einer Creative-Commons-4.0-Lizenz angeboten. Der Import speichert anschließend nur den für Flensburg, Schleswig und den Kreis Schleswig-Flensburg relevanten Ausschnitt.</p>
        <p>Der direkt von NAH.SH bereitgestellte GTFS-Download ist bewusst nicht als Standardquelle eingetragen: Die dort veröffentlichten Nutzungsbedingungen enthalten zusätzliche Zweck- und Mindestanforderungen. BusRadar verwendet ihn daher nicht ohne gesonderte Prüfung bzw. Freigabe.</p>
        <h2>Echtzeit</h2><p>Der voreingestellte GTFS-Realtime-Stream von GTFS.de wird unter CC BY-SA 4.0 veröffentlicht und liefert TripUpdates und ServiceAlerts. Daraus können – zusammen mit importierten Fahrten und Shapes – als <strong>geschätzt</strong> markierte Positionen berechnet werden. Der freie Stream enthält keine allgemeinen VehiclePositions.</p>
        <h2>Flensburg GPS</h2><p>Aktiv Bus veröffentlicht einen eigenen Busradar. Dessen Nutzungsbedingungen erlauben automatisierten Abruf bzw. die Integration in eine eigene Anwendung nicht ohne ausdrückliche Genehmigung. Deshalb greift BusRadar nicht auf diesen Webdienst zu. Der GPS-Provider wird erst aktiviert, wenn ein separat freigegebener Endpoint oder eine schriftliche Nutzungserlaubnis vorliegt.</p>
        <h2>Karten</h2><p>Die Karte wird mit MapLibre GL gerendert. Der Tile-/Style-Provider ist konfigurierbar; die jeweilige Attribution wird direkt in der Karte dargestellt.</p>
        <h2>Hinweis</h2><p>BusRadar ist kein offizielles Angebot der Verkehrsunternehmen oder von NAH.SH. Fahrplan- und Echtzeitinformationen können abweichen.</p>
      </div>
    </div></main>
  );
}
