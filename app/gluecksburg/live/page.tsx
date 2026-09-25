import type { Metadata } from "next";
import LiveDashboard from "../../live/LiveDashboard";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://xn--frde-5qa.info";

export const metadata: Metadata = {
  title: {
    absolute: "Glücksburg Live – Wetter, Strand-Ampel & Fördepegel",
  },
  description:
    "Glücksburg live: aktuelles Wetter, DWD-Warnungen, Strand-Ampel für Holnis und Sandwig, Fördepegel Flensburg, beste Zeit für draußen sowie Baustellen und Veränderungen.",
  keywords: [
    "Glücksburg live",
    "Wetter Glücksburg heute",
    "Glücksburg Wetter",
    "Strand Holnis",
    "Sandwig Strand",
    "Badequalität Glücksburg",
    "Fördepegel Flensburg",
    "DWD Warnungen Schleswig-Flensburg",
    "Baustellen Glücksburg",
  ],
  alternates: { canonical: "/gluecksburg/live" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/gluecksburg/live",
    siteName: "förde.info",
    title: "Glücksburg Live – Wetter, Strand-Ampel & Fördepegel",
    description:
      "Aktuelle Bedingungen für Glücksburg: Wetter, Strand-Ampel Holnis & Sandwig, Fördepegel, DWD-Warnungen und lokale Veränderungen.",
  },
  twitter: {
    card: "summary",
    title: "Glücksburg Live – Wetter, Strand-Ampel & Fördepegel",
    description:
      "Wetter, Strandbedingungen, Fördepegel, Warnungen und lokale Veränderungen in Glücksburg auf einen Blick.",
  },
};

const liveStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": siteUrl + "/gluecksburg/live#webpage",
      url: siteUrl + "/gluecksburg/live",
      name: "Glücksburg Live – Wetter, Strand-Ampel & Fördepegel",
      description:
        "Aktuelle Wetterlage, Strand-Ampel für Holnis und Sandwig, Fördepegel Flensburg, DWD-Warnungen und lokale Veränderungen in Glücksburg.",
      inLanguage: "de-DE",
      about: [
        { "@type": "Place", name: "Glücksburg (Ostsee)" },
        { "@type": "Place", name: "Flensburger Förde" },
        { "@type": "Thing", name: "Wetter in Glücksburg" },
        { "@type": "Thing", name: "Badegewässerqualität Holnis und Sandwig" },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "förde.info",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Glücksburg Live",
          item: siteUrl + "/gluecksburg/live",
        },
      ],
    },
  ],
};

export default function LivePage() {
  return (
    <>
      <LiveDashboard />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(liveStructuredData) }}
      />
    </>
  );
}
