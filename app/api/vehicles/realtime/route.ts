import { NextResponse } from "next/server";
import { getRealtimeVehicles } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const maxDuration = 60;

export async function GET() {
  const vehicles = await getRealtimeVehicles();
  return NextResponse.json(
    { updatedAt: new Date().toISOString(), vehicles },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60" } },
  );
}
