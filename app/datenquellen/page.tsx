import Link from "next/link";

export default function DataSourcesPage() {
  return (
    <main className="info-page"><div className="info-shell">
      <div className="info-nav"><Link href="/">← BusKarte</Link><span>Datenquellen</span></div>
      <h1>Datenquellen & Kennzeichnung</h1>
      <div className="prose">
        <h2>Offizielle Fahrplandaten</h2>
        <p>BusKarte nutzt primär den von NAH.SH veröffentlichten Schleswig-Holstein-GTFS-Datensatz. Der Datensatz wird im deutschen GovData-Portal als frei nutzbar unter Creative Commons Namensnennung 4.0 (CC BY 4.0) geführt. Beim Import werden nur Buslinien und Haltestellen aus Flensburg sowie dem Kreis Schleswig-Flensburg übernommen.</p>
        <p>Als technischer Fallback kann der freie Deutschland-Nahverkehrsfeed von GTFS.de verwendet werden. Fehlende Liniengeometrien werden niemals durch erfundene gerade Verbindungen ersetzt.</p>

        <h2>Echtzeit-Prognose</h2>
        <p>BusKarte verknüpft den zum GTFS.de-Fahrplan passenden Realtime-Stream mit dem offiziellen NAH.SH-Datensatz über einen täglich erzeugten Trip-Crosswalk. Bei eindeutig zugeordneten Fahrten werden aktuelle TripUpdates und StopTimeUpdates für Verspätung, nächste Haltestelle und Fortschritt verwendet. Die Position wird anschließend entlang der echten NAH.SH-Liniengeometrie fortgeschrieben und als <strong>Echtzeit-Prognose</strong> gekennzeichnet.</p>

        <h2>GTFS-Realtime</h2>
        <p>Der freie GTFS.de-Realtime-Stream wird etwa alle zehn Sekunden aktualisiert und liefert TripUpdates und ServiceAlerts, jedoch keine allgemeinen GPS- bzw. VehiclePositions. Deshalb ist eine <strong>Echtzeit-Prognose</strong> nicht dasselbe wie Live GPS. Wenn eine Fahrt nicht eindeutig zugeordnet werden kann, fällt BusKarte für diese Fahrt auf die sichtbar gekennzeichnete Fahrplan-Schätzung zurück.</p>

        <h2>DELFI / SIRI-ET Schleswig-Holstein</h2>
        <p>Das Schleswig-Holstein-SIRI-ET-Angebot ist in GovData/Mobilithek als öffentlicher Open-Data-Datensatz katalogisiert. Der aktuelle Paketabruf der Mobilithek verlangt jedoch Authorization; der vorgesehene noauth-Abruf antwortet mit 403. Der Adapter ist vorbereitet und kann nach rechtmäßigem Zugang über Server-Environment-Variablen aktiviert werden.</p>

        <h2>Flensburg GPS</h2>
        <p>Aktiv Bus betreibt eine eigene öffentliche Live-Karte. BusKarte liest diesen Webdienst nicht automatisiert aus, weil dessen Nutzungsbedingungen eine solche Integration ohne ausdrückliche Genehmigung nicht erlauben. Der GPS-Provider wird erst aktiviert, wenn ein separat freigegebener Fahrzeugpositions-Endpunkt vorliegt.</p>

        <h2>Karten</h2>
        <p>Die Karte wird mit MapLibre GL gerendert. Der Kartenstil ist konfigurierbar; die Attribution des jeweiligen Kartenproviders wird direkt in der Karte dargestellt.</p>

        <h2>Datenqualität</h2>
        <p><strong>Live GPS</strong> bedeutet eine echte, ausdrücklich nutzbare Fahrzeugposition. <strong>Echtzeit-Prognose</strong> verwendet aktuelle Realtime-Abweichungen und Haltestellenprognosen, die Position wird aber entlang des Linienwegs berechnet. <strong>Fahrplan-Schätzung</strong> verwendet nur Sollzeiten und Shape. Fehlende Daten werden nicht durch Demo-Positionen ersetzt.</p>

        <h2>Hinweis</h2>
        <p>BusKarte ist kein offizielles Angebot der Verkehrsunternehmen oder von NAH.SH. Fahrplan- und Echtzeitinformationen können abweichen.</p>
      </div>
    </div></main>
  );
}
