import type { MetadataRoute } from "next";
import { createPublicServerSupabase } from "@/lib/supabase-public-server";

const baseUrl = "https://www.xn--glcksburg-direkt-kzb.de";

function todayBerlin() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const supabase = createPublicServerSupabase();
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("status", "published")
    .gte("date", todayBerlin())
    .order("date")
    .limit(1000);

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/live`, lastModified, changeFrequency: "hourly", priority: 0.95 },
    { url: `${baseUrl}/veranstaltungen`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/heute-in-gluecksburg`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/wochenende-in-gluecksburg`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/freizeit-gluecksburg`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/urlaub`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/sehenswuerdigkeiten-gluecksburg`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/straende-gluecksburg`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/partner`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];

  const eventPages: MetadataRoute.Sitemap = (events ?? []).map((event) => ({
    url: `${baseUrl}/veranstaltungen/${event.id}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPages, ...eventPages];
}
