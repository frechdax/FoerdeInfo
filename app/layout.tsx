import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glücksburg Direkt – Alles Wichtige für deinen Alltag",
  description:
    "Dein persönlicher Überblick für Glücksburg: Straße, Müllabfuhr, Veranstaltungen und Rathaus.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
