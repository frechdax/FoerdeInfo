import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import ConsentManager from "./consent-manager";

const siteUrl = "https://www.xn--glcksburg-direkt-kzb.de";
const googleVerification =
  process.env.GOOGLE_SITE_VERIFICATION ||
  "yhScvTLAqjL9Z2zvqCixkpq612QAJss1EbD2FxgwTzQ";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GlücksburgDirekt – Veranstaltungen, Freizeit, Urlaub und mehr",
    template: "%s | GlücksburgDirekt",
  },
  description:
    "Urlaubstipps, Veranstaltungen, Familienangebote, Rathaus-News und Müllkalender für Glücksburg (Ostsee) – lokal, kompakt und unabhängig.",
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
        <Script id="google-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
            window.gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied'
            });
          `}
        </Script>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <ConsentManager />
      </body>
    </html>
  );
}
