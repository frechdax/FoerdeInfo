import Link from "next/link";
import { getProviderStatuses } from "@/lib/providers";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const providers = await getProviderStatuses();
  return (
    <main className="info-page">
      <div className="info-shell">
        <div className="info-nav"><Link href="/">← BusKarte</Link><span>Systemstatus</span></div>
        <h1>Daten- & Providerstatus</h1>
        <p className="muted">Hier siehst du, welche Quellen gerade tatsächlich verfügbar sind. Deaktivierte Quellen werden niemals durch erfundene Positionsdaten ersetzt.</p>
        <div className="status-grid">
          {providers.map((p) => <article className="status-card" key={p.id}>
            <div className="status-title"><span className={`state-dot ${p.state}`} /> <strong>{p.name}</strong><span className="status-pill">{p.state}</span></div>
            <p>{p.detail}</p>{p.lastUpdate && <small>Letztes Update: {new Date(p.lastUpdate).toLocaleString("de-DE")}</small>}
          </article>)}
        </div>
      </div>
    </main>
  );
}
