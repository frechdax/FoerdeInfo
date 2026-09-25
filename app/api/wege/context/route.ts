import { NextResponse } from "next/server";

export const revalidate = 300;

export async function GET() {
  const [weather, warnings, pegel] = await Promise.allSettled([
    fetch("https://api.open-meteo.com/v1/forecast?latitude=54.81&longitude=9.48&current=temperature_2m,precipitation,wind_speed_10m&hourly=precipitation_probability&forecast_hours=3&timezone=Europe%2FBerlin", { next: { revalidate: 300 } }).then(async r => { if (!r.ok) throw new Error(); return r.json(); }),
    fetch("https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json", { next: { revalidate: 300 } }).then(async r => { if (!r.ok) throw new Error(); const body = await r.text(); return JSON.parse(body.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "")); }),
    fetch("https://pegelonline.wsv.de/webservices/rest-api/v2/stations/9e19c411-f728-4a43-a057-39d4155c71cc/currentmeasurement.json", { next: { revalidate: 300 } }).then(async r => { if (!r.ok) throw new Error(); return r.json(); }),
  ]);
  const w = weather.status === "fulfilled" ? weather.value : null;
  const warningMap = warnings.status === "fulfilled" ? warnings.value?.warnings : null;
  const warningItems = [
    ...(Array.isArray(warningMap?.["101059000"]) ? warningMap["101059000"].map((x: Record<string, unknown>) => ({ ...x, region: "Kreis Schleswig-Flensburg" })) : []),
    ...(Array.isArray(warningMap?.["101001000"]) ? warningMap["101001000"].map((x: Record<string, unknown>) => ({ ...x, region: "Stadt Flensburg" })) : []),
  ];
  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    weather: w?.current ? { temperature: w.current.temperature_2m, wind: w.current.wind_speed_10m, rain: w.current.precipitation, rainNextHours: Math.max(0, ...(w.hourly?.precipitation_probability || [])), observedAt: w.current.time } : null,
    warningsAvailable: warnings.status === "fulfilled" && !!warningMap,
    warnings: warningItems.map((x: { headline?: string; end?: number; region: string }) => ({ headline: x.headline || "Wetterwarnung", endsAt: x.end, region: x.region })).slice(0, 4),
    pegel: pegel.status === "fulfilled" && typeof pegel.value?.value === "number" ? { value: pegel.value.value, timestamp: pegel.value.timestamp } : null,
    sources: { weather: "https://open-meteo.com/", warnings: "https://www.dwd.de/DE/wetter/warnungen_gemeinden/warnWetter_node.html", pegel: "https://pegelonline.wsv.de/", closures: "https://tbz-flensburg.de/de/verkehrsticker" },
  });
}
