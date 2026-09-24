import type { RegionData } from "@/lib/types";

export const TRANSIT_TIME_ZONE = "Europe/Berlin";

type BerlinParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ymd: string;
  seconds: number;
};

const berlinFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TRANSIT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function berlinParts(date = new Date()): BerlinParts {
  const parts = Object.fromEntries(
    berlinFormatter.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    ymd: `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
    seconds: hour * 3600 + minute * 60 + second,
  };
}

export function gtfsSeconds(value: string) {
  const [h = 0, m = 0, s = 0] = value.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function ymdToUtcMs(ymd: string) {
  if (!/^\d{8}$/.test(ymd)) return Number.NaN;
  return Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
}

export function offsetYmd(ymd: string, days: number) {
  const ms = ymdToUtcMs(ymd);
  if (!Number.isFinite(ms)) return ymd;
  const date = new Date(ms + days * 86_400_000);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function serviceSecondsForDate(serviceDate: string, now = new Date()) {
  const current = berlinParts(now);
  const serviceMs = ymdToUtcMs(serviceDate);
  const todayMs = ymdToUtcMs(current.ymd);
  if (!Number.isFinite(serviceMs) || !Number.isFinite(todayMs)) return current.seconds;
  const daysSinceServiceStart = Math.round((todayMs - serviceMs) / 86_400_000);
  return current.seconds + daysSinceServiceStart * 86_400;
}

function weekdayKey(ymd: string): "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" {
  const day = new Date(ymdToUtcMs(ymd)).getUTCDay();
  return (["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const)[day];
}

export function isServiceActive(data: RegionData, serviceId: string, serviceDate: string) {
  const exceptions = data.calendarDates.filter((x) => x.serviceId === serviceId && x.date === serviceDate);
  if (exceptions.some((x) => x.exceptionType === 1)) return true;
  if (exceptions.some((x) => x.exceptionType === 2)) return false;

  const calendar = data.calendar.find((x) => x.serviceId === serviceId);
  if (!calendar) return false;
  if (serviceDate < calendar.startDate || serviceDate > calendar.endDate) return false;
  return Boolean(calendar[weekdayKey(serviceDate)]);
}

export function candidateServiceClocks(now = new Date()) {
  const current = berlinParts(now);
  const previous = offsetYmd(current.ymd, -1);
  return [
    { serviceDate: current.ymd, currentSeconds: current.seconds },
    { serviceDate: previous, currentSeconds: current.seconds + 86_400 },
  ];
}
