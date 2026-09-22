import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://www.xn--glcksburg-direkt-kzb.de/sitemap.xml",
    host: "https://www.xn--glcksburg-direkt-kzb.de",
  };
}
