import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://gluecksburg-direkt.vercel.app/sitemap.xml",
    host: "https://gluecksburg-direkt.vercel.app",
  };
}
