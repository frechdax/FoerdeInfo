import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import ConsentManager from "./consent-manager";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://xn--frde-5qa.info";
const googleVerification =
  process.env.GOOGLE_SITE_VERIFICATION ||
  "yhScvTLAqjL9Z2zvqCixkpq612QAJss1EbD2FxgwTzQ";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "förde.info – Flensburg, Wassersleben, Glücksburg und Langballig",
    template: "%s | förde.info",
  },
  description:
    "Wetter, Badestellen, Veranstaltungen und Freizeit für Flensburg, Wassersleben, Glücksburg und Langballig.",
  alternates: { canonical: "/" },
  keywords: [
    "Flensburger Förde",
    "Flensburg",
    "Wassersleben",
    "Langballig",
    "Glücksburg",
    "Glücksburg Ostsee",
    "Veranstaltungen Glücksburg",
    "Was ist los in Glücksburg",
    "Urlaub Glücksburg",
    "Ferienwohnung Glücksburg",
    "Hotel Glücksburg",
    "Rathaus Glücksburg",
    "Familie Glücksburg",
  ],
  applicationName: "förde.info",
  authors: [{ name: "förde.info" }],
  creator: "förde.info",
  publisher: "förde.info",
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
    siteName: "förde.info",
    title: "förde.info – Flensburg, Wassersleben, Glücksburg und Langballig",
    description:
      "Wetter, Strände, Veranstaltungen und praktische Informationen rund um die Flensburger Förde.",
  },
  twitter: {
    card: "summary",
    title: "förde.info – Flensburg und die Förde im Blick",
    description:
      "Flensburg, Wassersleben, Glücksburg und Langballig: Wetter, Strand und Freizeit.",
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "förde.info",
    url: siteUrl,
    description:
      "Privates, unabhängiges Informationsangebot für Flensburg, Wassersleben, Glücksburg und Langballig.",
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
