import type { MetadataRoute } from "next";

const baseUrl = "https://gluecksburg-direkt.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/muellabfuhr`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/veranstaltungen`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/familie`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/rathaus`, lastModified, changeFrequency: "daily", priority: 0.8 },
  ];
}
