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

        <h2>Aktuelle Positionsschätzung</h2>
        <p>Solange keine kompatiblen Echtzeitdaten oder freigegebenen GPS-Positionen vorliegen, berechnet BusKarte aktive Busse ausschließlich aus dem offiziellen Fahrplan und vorhandenen GTFS-Shapes. Diese Marker sind sichtbar als <strong>Geschätzt</strong> gekennzeichnet und enthalten keine behauptete Echtzeitkorrektur.</p>

        <h2>GTFS-Realtime</h2>
        <p>Der freie GTFS.de-Realtime-Stream liefert TripUpdates und ServiceAlerts, aber keine allgemeinen VehiclePositions. Ein automatischer Kompatibilitätstest ergab für den aktuell verwendeten offiziellen NAH.SH-GTFS keine direkten Trip-ID-Treffer. Deshalb ordnet BusKarte diese Realtime-Daten derzeit bewusst <strong>nicht</strong> den NAH.SH-Fahrten zu.</p>

        <h2>DELFI / SIRI-ET Schleswig-Holstein</h2>
        <p>Das Schleswig-Holstein-SIRI-ET-Angebot ist in GovData/Mobilithek als öffentlicher Open-Data-Datensatz katalogisiert. Der aktuelle Paketabruf der Mobilithek verlangt jedoch Authorization; der vorgesehene noauth-Abruf antwortet mit 403. Der Adapter ist vorbereitet und kann nach rechtmäßigem Zugang über Server-Environment-Variablen aktiviert werden.</p>

        <h2>Flensburg GPS</h2>
        <p>Aktiv Bus betreibt eine eigene öffentliche Live-Karte. BusKarte liest diesen Webdienst nicht automatisiert aus, weil dessen Nutzungsbedingungen eine solche Integration ohne ausdrückliche Genehmigung nicht erlauben. Der GPS-Provider wird erst aktiviert, wenn ein separat freigegebener Fahrzeugpositions-Endpunkt vorliegt.</p>

        <h2>Karten</h2>
        <p>Die Karte wird mit MapLibre GL gerendert. Der Kartenstil ist konfigurierbar; die Attribution des jeweiligen Kartenproviders wird direkt in der Karte dargestellt.</p>

        <h2>Datenqualität</h2>
        <p><strong>Live GPS</strong> bedeutet eine echte, ausdrücklich nutzbare Fahrzeugposition. <strong>Geschätzt</strong> bedeutet eine Berechnung aus Fahrplan und tatsächlicher Liniengeometrie; sofern später kompatible Realtime-Daten vorliegen, kann diese zusätzlich korrigiert werden. Fehlende Daten werden nicht durch Demo-Positionen ersetzt.</p>

        <h2>Hinweis</h2>
        <p>BusKarte ist kein offizielles Angebot der Verkehrsunternehmen oder von NAH.SH. Fahrplan- und Echtzeitinformationen können abweichen.</p>
      </div>
    </div></main>
  );
}
