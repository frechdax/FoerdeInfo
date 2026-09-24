type SeoLandingProps = {
  eyebrow: string;
  title: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  canonicalPath: string;
  compactOverview?: boolean;
  children?: React.ReactNode;
};

export default function SeoLanding({
  eyebrow,
  title,
  intro,
  bullets,
  ctaLabel,
  ctaHref,
  canonicalPath,
  compactOverview = false,
  children,
}: SeoLandingProps) {
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "GlücksburgDirekt",
        item: "https://www.xn--glcksburg-direkt-kzb.de/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: `https://www.xn--glcksburg-direkt-kzb.de${canonicalPath}`,
      },
    ],
  };

  return (
    <main className="seo-page">
      <div className="seo-shell">
        <header className="seo-header">
          <a className="seo-brand" href="/" aria-label="GlücksburgDirekt Startseite">
            <span aria-hidden="true">⚓</span>
            <strong>GlücksburgDirekt</strong>
          </a>
          <a className="seo-back" href="/">Zur Übersicht</a>
        </header>

        <section className={"seo-hero " + (compactOverview ? "seo-hero-compact-overview" : "")}>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{intro}</p>

          {compactOverview ? (
            <div className="seo-hero-overview" aria-label="Auf GlücksburgDirekt findest du">
              {bullets.map((bullet) => (
                <span key={bullet}>✓ {bullet}</span>
              ))}
            </div>
          ) : null}

          <a className="button primary seo-cta" href={ctaHref}>{ctaLabel}</a>
        </section>

        {!compactOverview ? (
          <section className="seo-card">
            <h2>Auf GlücksburgDirekt findest du</h2>
            <ul>
              {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          </section>
        ) : null}

        {children}

        <nav className="seo-links" aria-label="Weitere Bereiche">
          <a href="/muellabfuhr">Müllabfuhr</a>
          <a href="/veranstaltungen">Veranstaltungen</a>
          <a href="/heute-in-gluecksburg">Heute</a>
          <a href="/wochenende-in-gluecksburg">Wochenende</a>
          <a href="/freizeit-gluecksburg">Freizeit</a>
          <a href="/urlaub">Urlaub</a>
          <a href="/sehenswuerdigkeiten-gluecksburg">Sehenswürdigkeiten</a>
          <a href="/straende-gluecksburg">Strände</a>
          <a href="/familie">Familie</a>
          <a href="/rathaus">Rathaus</a>
        </nav>

        <p className="seo-disclaimer">
          GlücksburgDirekt ist ein privates, unabhängiges Informationsangebot und kein offizielles Angebot der Stadt Glücksburg (Ostsee).
        </p>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        />
      </div>
    </main>
  );
}
