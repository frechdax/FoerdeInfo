import { NextResponse } from "next/server";
import { getFastVehicles } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const maxDuration = 30;

export async function GET() {
  const vehicles = await getFastVehicles();
  return NextResponse.json(
    { updatedAt: new Date().toISOString(), vehicles },
    { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=20" } },
  );
}
