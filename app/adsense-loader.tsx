"use client";

import Script from "next/script";

export default function AdSenseLoader() {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

  if (!client || !/^ca-pub-\d+$/.test(client)) return null;

  return (
    <Script
      id="google-adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
