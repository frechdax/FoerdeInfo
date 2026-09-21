import { createPublicServerSupabase } from "@/lib/supabase-public-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function compactIcsDate(value: string) {
  return value.replace(/-/g, "");
}

function compactIcsTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}${match[2]}${match[3] || "00"}`;
}

function addDays(value: string, days: number) {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function safeFilename(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "veranstaltung"
  );
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = createPublicServerSupabase();

  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id,title,description,date,end_date,time,location,organizer,source_url,status"
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !event) {
    return new Response("Veranstaltung nicht gefunden.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GlücksburgDirekt//Veranstaltungen//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@gluecksburg-direkt.vercel.app`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z")}`,
  ];

  const eventTime = event.time ? compactIcsTime(event.time) : null;

  if (eventTime) {
    lines.push(
      `DTSTART;TZID=Europe/Berlin:${compactIcsDate(event.date)}T${eventTime}`
    );
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactIcsDate(event.date)}`);
    lines.push(
      `DTEND;VALUE=DATE:${compactIcsDate(
        addDays(event.end_date || event.date, 1)
      )}`
    );
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  const descriptionParts = [
    event.description,
    event.organizer ? `Veranstalter: ${event.organizer}` : "",
    event.source_url ? `Weitere Informationen: ${event.source_url}` : "",
  ].filter(Boolean);

  if (descriptionParts.length) {
    lines.push(
      `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n\n"))}`
    );
  }

  if (event.source_url) {
    lines.push(`URL:${event.source_url}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  const filename = `${safeFilename(event.title)}-${event.date}.ics`;

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=300",
    },
  });
}
