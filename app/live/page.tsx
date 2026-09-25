import type { Metadata } from "next";
import LiveDashboard from "./LiveDashboard";

const siteUrl = "https://www.xn--glcksburg-direkt-kzb.de";

export const metadata: Metadata = {
  title: {
    absolute: "Flensburg Live – Wetter, Strand-Ampel & Fördepegel",
  },
  description:
    "Flensburg live: aktuelles Wetter, DWD-Warnungen, Strand-Ampel für Solitüde, Ostseebad, Wassersleben und Glücksburg sowie der Fördepegel Flensburg.",
  keywords: [
    "Flensburg live",
    "Wetter Flensburg heute",
    "Flensburg Wetter",
    "Solitüde Strand",
    "Ostseebad Flensburg",
    "Wassersleben Strand",
    "Badequalität Flensburg",
    "Fördepegel Flensburg",
    "DWD Warnungen Flensburg",
    "Glücksburg Strand",
  ],
  alternates: { canonical: "/live" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/live",
    siteName: "FlensburgDirekt",
    title: "Flensburg Live – Wetter, Strand-Ampel & Fördepegel",
    description:
      "Aktuelle Bedingungen für Flensburg und die Förderegion: Wetter, Strand-Ampel, Fördepegel und DWD-Warnungen.",
  },
  twitter: {
    card: "summary",
    title: "Flensburg Live – Wetter, Strand-Ampel & Fördepegel",
    description:
      "Wetter, Strandbedingungen, Fördepegel und Warnungen für Flensburg, Wassersleben und Glücksburg auf einen Blick.",
  },
};

const liveStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": siteUrl + "/live#webpage",
      url: siteUrl + "/live",
      name: "Flensburg Live – Wetter, Strand-Ampel & Fördepegel",
      description:
        "Aktuelle Wetterlage, Strand-Ampel für Solitüde, Ostseebad, Wassersleben und Glücksburg, Fördepegel Flensburg und DWD-Warnungen.",
      inLanguage: "de-DE",
      about: [
        { "@type": "Place", name: "Flensburg" },
        { "@type": "Place", name: "Wassersleben" },
        { "@type": "Place", name: "Glücksburg (Ostsee)" },
        { "@type": "Place", name: "Flensburger Förde" },
        { "@type": "Thing", name: "Wetter in Flensburg" },
        { "@type": "Thing", name: "Badegewässerqualität Solitüde, Ostseebad, Wassersleben und Glücksburg" },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "FlensburgDirekt",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Flensburg Live",
          item: siteUrl + "/live",
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
