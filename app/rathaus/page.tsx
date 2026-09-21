import type { Metadata } from "next";
import SeoLanding from "../seo-landing";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";

export const metadata: Metadata = {
  title: "Rathaus Glücksburg – News & amtliche Bekanntmachungen",
  description:
    "Rathausinformationen für Glücksburg (Ostsee): aktuelle Meldungen, Bürgerbüro und amtliche Bekanntmachungen mit Links zu den Originalquellen.",
  alternates: { canonical: "/rathaus" },
  openGraph: {
    title: "Rathaus Glücksburg – aktuelle Informationen",
    description: "Rathaus-News und amtliche Bekanntmachungen aus Glücksburg kompakt gebündelt.",
    url: "/rathaus",
  },
};

export const revalidate = 1800;

function newsDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value + "T12:00:00"));
}

export default async function RathausPage() {
  const supabase = createPublicServerSupabase();
  const { data } = await supabase
    .from("rathaus_news")
    .select("id,title,published_at,source_url")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(6);

  const latestNews = data ?? [];

  return (
    <SeoLanding
      eyebrow="Rathaus Glücksburg"
      title="Rathausinformationen für Glücksburg"
      intro="Aktuelle Rathausmeldungen, Informationen zum Bürgerbüro und amtliche Bekanntmachungen übersichtlich zusammengefasst."
      bullets={[
        "Aktuelles aus dem Rathaus",
        "Amtliche Bekanntmachungen",
        "Bürgerbüro und Öffnungszeiten",
        "Direkte Links zu den offiziellen Originalquellen",
      ]}
      ctaLabel="Rathausbereich öffnen"
      ctaHref="/#rathaus"
      canonicalPath="/rathaus"
    >
      <section className="seo-card">
        <h2>Aktuelles aus dem Rathaus Glücksburg</h2>
        {latestNews.length ? (
          <div className="seo-live-list">
            {latestNews.map((item) => (
              <article key={item.id} className="seo-live-row">
                <div>
                  <strong>{item.title}</strong>
                  {item.published_at ? <span>{newsDate(item.published_at)}</span> : null}
                </div>
                <a href={item.source_url} target="_blank" rel="noreferrer">Quelle ↗</a>
              </article>
            ))}
          </div>
        ) : (
          <p>Aktuell konnten keine Rathausmeldungen geladen werden.</p>
        )}
      </section>

      <section className="seo-card">
        <h2>Privater Überblick mit offiziellen Quellen</h2>
        <p>
          GlücksburgDirekt ist nicht die offizielle Website der Stadt. Die Inhalte dienen der
          Orientierung und führen für verbindliche Informationen direkt zu den Veröffentlichungen
          der Stadt Glücksburg (Ostsee).
        </p>
      </section>
    </SeoLanding>
  );
}
