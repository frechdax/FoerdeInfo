import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import WegeApp from "./WegeApp";

export const metadata: Metadata = {
  title: "Wegecheck – komm ich da durch?",
  description: "Aktuelle Hindernisse auf Wegen in Flensburg, Wassersleben, Glücksburg und Langballig melden und vor dem Losgehen prüfen.",
  alternates: { canonical: "/wege" },
};

export default function WegePage() {
  return <WegeApp />;
}
