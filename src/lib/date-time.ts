export function getUserTimezone(timezone?: string | null) {
  if (timezone && timezone.trim()) {
    return timezone;
  }

  return "Europe/Paris";
}

export function formatDateTime(date: Date, timezone?: string) {
  const dayPart = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);

  return `${dayPart} · ${timePart}`;
}

export function formatShortDateTime(date: Date, timezone?: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || "Europe/Paris",
  }).format(date);
}

export function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
}

export function isBookingJoinAvailable({
  startTime,
  endTime,
  status,
  hasRoom,
  now = new Date(),
}: {
  startTime: Date;
  endTime: Date;
  status: string;
  hasRoom: boolean;
  now?: Date;
}) {
  const joinWindowStart = new Date(startTime.getTime() - 10 * 60 * 1000);
  const joinWindowEnd = new Date(endTime.getTime() + 15 * 60 * 1000);

  return (
    status === "CONFIRMED" &&
    hasRoom &&
    now >= joinWindowStart &&
    now <= joinWindowEnd
  );
}

