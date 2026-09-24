import type { Metadata } from "next";
import LiveDashboard from "./LiveDashboard";

export const metadata: Metadata = {
  title: "Glücksburg Jetzt – Live-Daten | GlücksburgDirekt",
  description:
    "Aktuelles Wetter, amtliche DWD-Warnungen, Fördepegel und ein verständlicher Draußen-Check für Glücksburg.",
  keywords: ["Glücksburg Wetter", "Glücksburg live", "Fördepegel", "DWD Warnungen", "Flensburger Förde"],
  alternates: { canonical: "/live" },
};

export default function LivePage() {
  return <LiveDashboard />;
}

// deploy-attempt-2
