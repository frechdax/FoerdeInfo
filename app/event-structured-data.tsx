type StructuredEvent = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  end_date?: string | null;
  time?: string | null;
  location?: string | null;
  organizer?: string | null;
  source_url?: string | null;
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://xn--frde-5qa.info";

function startDate(event: StructuredEvent) {
  const match = event.time
    ? String(event.time).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    : null;
  if (!match) return event.date;

  const hour = match[1].padStart(2, "0");
  const second = match[3] || "00";
  return `${event.date}T${hour}:${match[2]}:${second}`;
}

export default function EventStructuredData({
  event,
}: {
  event: StructuredEvent;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${siteUrl}/veranstaltungen/${event.id}`,
    name: event.title,
    description: event.description || undefined,
    startDate: startDate(event),
    endDate: event.end_date || undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: event.location
      ? {
          "@type": "Place",
          name: event.location,
        }
      : undefined,
    organizer: event.organizer
      ? { "@type": "Organization", name: event.organizer }
      : undefined,
    url: `${siteUrl}/veranstaltungen/${event.id}`,
    sameAs: event.source_url || undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
