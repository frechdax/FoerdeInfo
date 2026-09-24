import { NextResponse } from "next/server";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { getRegionData } from "@/lib/gtfs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = getRegionData();
  const tripIds = new Set(data.trips.map((t) => t.id));
  const stopIds = new Set(data.stops.map((s) => s.id));
  const routeIds = new Set(data.routes.map((r) => r.id));
  const response = await fetch(process.env.GTFS_RT_URL || "https://realtime.gtfs.de/realtime-free.pb", {
    cache:"no-store",
    headers:{"user-agent":"BusKarte realtime diagnostic/0.1"},
    signal:AbortSignal.timeout(20000)
  });
  if(!response.ok) return NextResponse.json({error:`HTTP ${response.status}`},{status:502});
  const feed=GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(await response.arrayBuffer()));
  let updates=0,tripMatches=0,routeMatches=0,stopMatches=0,updatesWithRegionalStops=0;
  const samples:any[]=[];
  for(const entity of feed.entity){
    const tu=entity.tripUpdate; const id=tu?.trip?.tripId;
    if(!tu||!id) continue;
    updates++;
    if(tripIds.has(id)) tripMatches++;
    const routeId=tu.trip.routeId||"";
    if(routeIds.has(routeId)) routeMatches++;
    let localStops=0; const sampleStops:string[]=[];
    for(const s of tu.stopTimeUpdate||[]){
      const sid=s.stopId||"";
      if(sid&&stopIds.has(sid)){stopMatches++;localStops++;}
      if(sid&&sampleStops.length<6) sampleStops.push(sid);
    }
    if(localStops){
      updatesWithRegionalStops++;
      if(samples.length<20) samples.push({tripId:id,routeId,startDate:tu.trip.startDate,localStops,stopSample:sampleStops});
    }
  }
  return NextResponse.json({updates,tripMatches,routeMatches,stopMatches,updatesWithRegionalStops,samples,checkedAt:new Date().toISOString()});
}