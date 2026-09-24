import Link from "next/link";

export default function DataSourcesPage() {
  return (
    <main className="info-page"><div className="info-shell">
      <div className="info-nav"><Link href="/">← BusRadar</Link><span>Datenquellen</span></div>
      <h1>Datenquellen & Kennzeichnung</h1>
      <div className="prose">
        <h2>Offizielle Fahrplandaten</h2>
        <p>BusRadar nutzt primär den von NAH.SH veröffentlichten Schleswig-Holstein-GTFS-Datensatz. Der Datensatz wird im deutschen GovData-Portal als frei nutzbar unter Creative Commons Namensnennung 4.0 (CC BY 4.0) geführt. Beim Import werden nur Buslinien und nur der für Flensburg, Schleswig und den Kreis Schleswig-Flensburg relevante Ausschnitt gespeichert.</p>
        <p>Als technischer Fallback kann der freie Deutschland-Nahverkehrsfeed von GTFS.de verwendet werden. Er enthält für den betrachteten Ausschnitt derzeit keine nutzbaren Shapes; deshalb werden daraus keine geradlinig erfundenen Buspositionen erzeugt.</p>
        <h2>Echtzeit</h2>
        <p>Der voreingestellte GTFS-Realtime-Stream von GTFS.de wird unter CC BY-SA 4.0 veröffentlicht und liefert TripUpdates und ServiceAlerts. BusRadar nutzt daraus Verspätungs- und Prognoseinformationen. Eine geschätzte Position wird nur erzeugt, wenn die Fahrt sicher einem statischen Trip zugeordnet werden kann und eine echte GTFS-Shape-Geometrie vorhanden ist.</p>
        <h2>Flensburg GPS</h2>
        <p>Aktiv Bus betreibt einen eigenen öffentlichen Busradar. BusRadar liest diesen Webdienst nicht automatisiert aus. Der GPS-Provider wird erst aktiviert, wenn ein separat freigegebener bzw. ausdrücklich rechtmäßig nutzbarer Fahrzeugpositions-Endpunkt vorliegt.</p>
        <h2>Karten</h2>
        <p>Die Karte wird mit MapLibre GL gerendert. Der Kartenstil ist konfigurierbar; die Attribution des jeweiligen Kartenproviders wird direkt in der Karte dargestellt.</p>
        <h2>Datenqualität</h2>
        <p><strong>Live GPS</strong> bedeutet eine echte, ausdrücklich nutzbare Fahrzeugposition. <strong>Geschätzt</strong> bedeutet eine Berechnung aus Fahrt, Fahrzeiten, Echtzeitabweichung und tatsächlicher Liniengeometrie. Fehlende Daten werden nicht durch Demo-Positionen ersetzt.</p>
        <h2>Hinweis</h2>
        <p>BusRadar ist kein offizielles Angebot der Verkehrsunternehmen oder von NAH.SH. Fahrplan- und Echtzeitinformationen können abweichen.</p>
      </div>
    </div></main>
  );
}
