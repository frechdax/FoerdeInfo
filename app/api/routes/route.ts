import { NextResponse } from "next/server";
import { getRegionData } from "@/lib/gtfs/store";

export async function GET() { return NextResponse.json({ routes: getRegionData().routes }); }
