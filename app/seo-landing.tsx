type SeoLandingProps = {
  eyebrow: string;
  title: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  children?: React.ReactNode;
};

export default function SeoLanding({
  eyebrow,
  title,
  intro,
  bullets,
  ctaLabel,
  ctaHref,
  children,
}: SeoLandingProps) {
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

        <section className="seo-hero">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{intro}</p>
          <a className="button primary seo-cta" href={ctaHref}>{ctaLabel}</a>
        </section>

        <section className="seo-card">
          <h2>Auf GlücksburgDirekt findest du</h2>
          <ul>
            {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
        </section>

        {children}

        <nav className="seo-links" aria-label="Weitere Bereiche">
          <a href="/muellabfuhr">Müllabfuhr</a>
          <a href="/veranstaltungen">Veranstaltungen</a>
          <a href="/familie">Familie</a>
          <a href="/rathaus">Rathaus</a>
        </nav>

        <p className="seo-disclaimer">
          GlücksburgDirekt ist ein privates, unabhängiges Informationsangebot und kein offizielles Angebot der Stadt Glücksburg (Ostsee).
        </p>
      </div>
    </main>
  );
}
