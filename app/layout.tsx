import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import { Analytics } from "@vercel/analytics/next";
import AdSenseLoader from "./adsense-loader";

const siteUrl = "https://gluecksburg-direkt.vercel.app";
const googleVerification =
  process.env.GOOGLE_SITE_VERIFICATION ||
  "yhScvTLAqjL9Z2zvqCixkpq612QAJss1EbD2FxgwTzQ";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GlücksburgDirekt – Müllkalender, Veranstaltungen, Familie & Rathaus",
    template: "%s | GlücksburgDirekt",
  },
  description:
    "Lokale Informationen für Glücksburg (Ostsee): Müllkalender, Veranstaltungen, Familienangebote, Rathaus-News und amtliche Bekanntmachungen auf einen Blick.",
  alternates: { canonical: "/" },
  keywords: [
    "Glücksburg",
    "Glücksburg Ostsee",
    "Müllkalender Glücksburg",
    "Müllabfuhr Glücksburg",
    "Veranstaltungen Glücksburg",
    "Was ist los in Glücksburg",
    "Urlaub Glücksburg",
    "Ferienwohnung Glücksburg",
    "Hotel Glücksburg",
    "Rathaus Glücksburg",
    "Familie Glücksburg",
  ],
  applicationName: "GlücksburgDirekt",
  authors: [{ name: "GlücksburgDirekt" }],
  creator: "GlücksburgDirekt",
  publisher: "GlücksburgDirekt",
  category: "Lokales",
  other: {
    "google-adsense-account": "ca-pub-8846945812828956",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "GlücksburgDirekt",
    title: "GlücksburgDirekt – Dein lokaler Überblick",
    description:
      "Müllkalender, Veranstaltungen, Familie und Rathausinformationen für Glücksburg (Ostsee).",
    images: [
      {
        url: "/images/gluecksburg-header.webp",
        width: 1400,
        height: 271,
        alt: "Schloss Glücksburg – Wahrzeichen von Glücksburg an der Ostsee",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GlücksburgDirekt",
    description:
      "Müllkalender, Veranstaltungen, Familie und Rathausinformationen für Glücksburg.",
    images: ["/images/gluecksburg-header.webp"],
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GlücksburgDirekt",
    url: siteUrl,
    description:
      "Privates, unabhängiges Informationsangebot für Glücksburg (Ostsee).",
    inLanguage: "de-DE",
  };

  return (
    <html lang="de">
      <body>
        <a className="global-castle-hero" href="/" aria-label="GlücksburgDirekt – Startseite">
          <Image
            src="/images/gluecksburg-header.webp"
            alt="Schloss Glücksburg – Wahrzeichen von Glücksburg"
            fill
            priority
            sizes="(max-width: 850px) 100vw, calc(100vw - 256px)"
            className="global-castle-hero-image"
          />
          <span className="global-castle-hero-shade" aria-hidden="true" />
          <span className="global-castle-hero-caption">
            <strong>Glücksburg</strong>
            <small>Schloss an der Flensburger Förde</small>
          </span>
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <Analytics />
        <AdSenseLoader />
      </body>
    </html>
  );
}
