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
    default: "FlensburgDirekt – Wetter, Förde, Strände & aktuelle Tipps",
    template: "%s | FlensburgDirekt",
  },
  description:
    "Aktuelle Informationen für Flensburg mit Wassersleben und Glücksburg: Wetter, Fördepegel, Strandbedingungen, Warnungen und passende Tipps.",
  alternates: { canonical: "/" },
  keywords: [
    "Flensburg",
    "Flensburg Förde",
    "Wetter Flensburg",
    "Flensburg heute",
    "Strand Flensburg",
    "Solitüde",
    "Ostseebad Flensburg",
    "Wassersleben",
    "Glücksburg",
    "Fördepegel Flensburg",
  ],
  applicationName: "FlensburgDirekt",
  authors: [{ name: "FlensburgDirekt" }],
  creator: "FlensburgDirekt",
  publisher: "FlensburgDirekt",
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
    siteName: "FlensburgDirekt",
    title: "FlensburgDirekt – Wetter, Förde, Strände & aktuelle Tipps",
    description:
      "Wetter, Fördepegel, Strandbedingungen und aktuelle Tipps für Flensburg, Wassersleben und Glücksburg.",
  },
  twitter: {
    card: "summary",
    title: "FlensburgDirekt – Wetter, Förde, Strände & aktuelle Tipps",
    description:
      "Aktuelle lokale Informationen für Flensburg mit Wassersleben und Glücksburg.",
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FlensburgDirekt",
    url: siteUrl,
    description:
      "Privates, unabhängiges Informationsangebot für Flensburg und die Flensburger Förderegion mit Wassersleben und Glücksburg.",
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
