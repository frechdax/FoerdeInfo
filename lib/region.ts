export const REGION = {
  minLon: 8.72,
  minLat: 54.28,
  maxLon: 10.08,
  maxLat: 55.02,
  center: [9.47, 54.63] as [number, number],
  zoom: 8.65,
};

export function insideRegion(lat: number, lon: number) {
  return lon >= REGION.minLon && lon <= REGION.maxLon && lat >= REGION.minLat && lat <= REGION.maxLat;
}
