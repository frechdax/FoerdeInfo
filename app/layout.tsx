import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

const siteUrl = "https://gluecksburg-direkt.vercel.app";
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GlücksburgDirekt – Müllkalender, Veranstaltungen, Familie & Rathaus",
    template: "%s | GlücksburgDirekt",
  },
  description:
    "Lokale Informationen für Glücksburg (Ostsee): Müllkalender, Veranstaltungen, Familienangebote, Rathaus-News und amtliche Bekanntmachungen auf einen Blick.",
  keywords: [
    "Glücksburg",
    "Glücksburg Ostsee",
    "Müllkalender Glücksburg",
    "Müllabfuhr Glücksburg",
    "Veranstaltungen Glücksburg",
    "Was ist los in Glücksburg",
    "Rathaus Glücksburg",
    "Familie Glücksburg",
  ],
  applicationName: "GlücksburgDirekt",
  authors: [{ name: "GlücksburgDirekt" }],
  creator: "GlücksburgDirekt",
  publisher: "GlücksburgDirekt",
  category: "Lokales",
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
  },
  twitter: {
    card: "summary",
    title: "GlücksburgDirekt",
    description:
      "Müllkalender, Veranstaltungen, Familie und Rathausinformationen für Glücksburg.",
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
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <Analytics />
      </body>
    </html>
  );
}
