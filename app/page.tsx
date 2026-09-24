import BusKarteApp from "@/components/BusKarteApp";
import { getFastVehicles } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const maxDuration = 30;

export default async function HomePage() {
  const vehicles = await getFastVehicles();
  return <BusKarteApp initialVehicles={vehicles} initialUpdatedAt={new Date().toISOString()} />;
}
