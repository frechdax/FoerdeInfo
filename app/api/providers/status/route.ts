import { NextResponse } from "next/server";
import { getProviderStatuses } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ checkedAt: new Date().toISOString(), providers: await getProviderStatuses() });
}
