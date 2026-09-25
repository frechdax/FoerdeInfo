export type Point = { lat: number; lon: number };
export type WayMode = "walk" | "stroller" | "bike" | "wheelchair";
export type WayReport = {
  id: string;
  latitude: number;
  longitude: number;
  kind: "blocked" | "construction" | "surface" | "flooding" | "other";
  mode: WayMode | "all";
  description: string;
  photo_data: string | null;
  created_at: string;
  expires_at: string;
};

export const CENTER: Point = { lat: 54.809, lon: 9.481 };
export const BOUNDS = { minLat: 54.68, maxLat: 54.95, minLon: 9.27, maxLon: 9.87 };

export function inArea(point: Point): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon) &&
    point.lat >= BOUNDS.minLat && point.lat <= BOUNDS.maxLat &&
    point.lon >= BOUNDS.minLon && point.lon <= BOUNDS.maxLon;
}

export function pointToRouteMeters(point: Point, route: [number, number][]): number {
  if (route.length < 2) return Infinity;
  const latScale = 111_195;
  const lonScale = latScale * Math.cos(point.lat * Math.PI / 180);
  let closest = Infinity;
  for (let i = 1; i < route.length; i++) {
    const ax = (route[i - 1][0] - point.lon) * lonScale;
    const ay = (route[i - 1][1] - point.lat) * latScale;
    const bx = (route[i][0] - point.lon) * lonScale;
    const by = (route[i][1] - point.lat) * latScale;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
    closest = Math.min(closest, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return closest;
}
