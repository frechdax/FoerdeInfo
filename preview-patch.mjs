import fs from "node:fs";

const path = "components/RadarMap.tsx";
let source = fs.readFileSync(path, "utf8");
source = source
  .replace(
    'import maplibregl, { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";',
    'import { GeolocateControl, type GeoJSONSource, Map as MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";'
  )
  .replaceAll("new maplibregl.Map(", "new MapLibreMap(")
  .replaceAll("new maplibregl.NavigationControl(", "new NavigationControl(")
  .replaceAll("new maplibregl.GeolocateControl(", "new GeolocateControl(")
  .replaceAll("new maplibregl.Popup(", "new Popup(")
  .replaceAll("new maplibregl.Marker(", "new Marker(");
fs.writeFileSync(path, source);
