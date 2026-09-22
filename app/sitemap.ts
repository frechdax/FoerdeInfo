import type { MetadataRoute } from "next";

const baseUrl = "https://gluecksburg-direkt.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/muellabfuhr`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/veranstaltungen`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/heute-in-gluecksburg`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/wochenende-in-gluecksburg`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/urlaub`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/sehenswuerdigkeiten-gluecksburg`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/straende-gluecksburg`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/familie`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/rathaus`, lastModified, changeFrequency: "daily", priority: 0.8 },
  ];
}
