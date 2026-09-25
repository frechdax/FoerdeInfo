import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://xn--frde-5qa.info";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/live`, lastModified, changeFrequency: "hourly", priority: 0.95 },
    { url: `${baseUrl}/wege`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/gluecksburg`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/gluecksburg/live`, lastModified, changeFrequency: "hourly", priority: 0.7 },
    { url: `${baseUrl}/gluecksburg/veranstaltungen`, lastModified, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/gluecksburg/urlaub`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/veranstaltungen`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/heute-in-gluecksburg`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/wochenende-in-gluecksburg`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/freizeit-gluecksburg`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/sehenswuerdigkeiten-gluecksburg`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/straende-gluecksburg`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/partner`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];

  return staticPages;
}
