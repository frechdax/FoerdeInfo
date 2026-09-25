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
        name: "förde.info",
        item: process.env.NEXT_PUBLIC_SITE_URL || "https://www.xn--glcksburg-direkt-kzb.de/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.xn--glcksburg-direkt-kzb.de"}${canonicalPath}`,
      },
    ],
  };

  return (
    <main className="seo-page">
      <div className="seo-shell">
        <header className="seo-header">
          <a className="seo-brand" href="/" aria-label="förde.info Startseite">
            <span aria-hidden="true">⚓</span>
            <strong>förde.info</strong>
          </a>
          <a className="seo-back" href="/">Zur Übersicht</a>
        </header>

        <section className={"seo-hero " + (compactOverview ? "seo-hero-compact-overview" : "")}>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{intro}</p>

          {compactOverview ? (
            <div className="seo-hero-overview" aria-label="Auf dieser Seite findest du">
              {bullets.map((bullet) => (
                <span key={bullet}>✓ {bullet}</span>
              ))}
            </div>
          ) : null}

          <a className="button primary seo-cta" href={ctaHref}>{ctaLabel}</a>
        </section>

        {!compactOverview ? (
          <section className="seo-card">
            <h2>Auf dieser Seite findest du</h2>
            <ul>
              {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          </section>
        ) : null}

        {children}

        <nav className="seo-links" aria-label="Weitere Bereiche">
          <a href="/">Alle Orte</a>
          <a href="/orte/flensburg">Flensburg</a>
          <a href="/orte/wassersleben">Wassersleben</a>
          <a href="/orte/gluecksburg">Glücksburg</a>
          <a href="/orte/langballig">Langballig</a>
          <a href="/gluecksburg">Glücksburg im Detail</a>
          <a href="/veranstaltungen">Veranstaltungen</a>
          <a href="/live">Live</a>
          <a href="/urlaub">Urlaub</a>
        </nav>

        <p className="seo-disclaimer">
          förde.info ist ein privates, unabhängiges Informationsangebot und kein offizielles Angebot der genannten Städte oder Gemeinden.
        </p>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        />
      </div>
    </main>
  );
}
