function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function compactDate(value: string) {
  return value.replace(/-/g, "");
}

function addDays(value: string, days: number) {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get("title") || "").trim().slice(0, 180);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const location = (url.searchParams.get("location") || "").trim().slice(0, 180);
  const source = (url.searchParams.get("url") || "").trim().slice(0, 1000);

  if (!title || !validDate(start) || (end && !validDate(end))) {
    return new Response("Ungültige Kalenderdaten.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  let sourceUrl = "";
  if (source) {
    try {
      const parsed = new URL(source);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        sourceUrl = parsed.toString();
      }
    } catch {}
  }

  const resolvedEnd = end || start!;
  const uidBase = Buffer.from(`${title}|${start}|${sourceUrl}`).toString("base64url").slice(0, 48);
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//foerde.info//Veranstaltungen//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uidBase}@xn--frde-5qa.info`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${compactDate(start!)}`,
    `DTEND;VALUE=DATE:${compactDate(addDays(resolvedEnd, 1))}`,
    `SUMMARY:${escapeIcsText(title)}`,
  ];

  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  if (sourceUrl) {
    lines.push(`DESCRIPTION:${escapeIcsText("Details und aktuelle Angaben: " + sourceUrl)}`);
    lines.push(`URL:${sourceUrl}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  const filename = `${safeFilename(title)}-${start}.ics`;
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=300",
    },
  });
}
