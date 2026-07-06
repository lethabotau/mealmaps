import type { Filters, Ticket, TimeWindow } from "./types.js";

export const CAMPUS_TIME_ZONE = "Australia/Sydney";

const HOUR_MS = 60 * 60 * 1000;

const DOW_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** YYYY-MM-DD for a UTC instant in Australia/Sydney. */
export function sydneyCalendarDate(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

/** 0 = Sunday … 6 = Saturday in Australia/Sydney. */
export function sydneyDayOfWeek(ms: number): number {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: "short",
  }).format(new Date(ms));
  return DOW_INDEX[short.toLowerCase().slice(0, 3)] ?? 0;
}

export function isSameSydneyCalendarDay(aMs: number, bMs: number): boolean {
  return sydneyCalendarDate(aMs) === sydneyCalendarDate(bMs);
}

function zonedParts(ms: number) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(new Date(ms));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** UTC ms for a wall-clock time on a Sydney calendar day (handles DST). */
export function sydneyLocalToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 4; i += 1) {
    const p = zonedParts(utc);
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    utc += desired - actual;
  }
  return utc;
}

function parseSydneyDateParts(isoDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function addDaysToSydneyDate(
  isoDate: string,
  deltaDays: number,
): { year: number; month: number; day: number } {
  const { year, month, day } = parseSydneyDateParts(isoDate);
  const baseMs = sydneyLocalToUtcMs(year, month, day, 12, 0);
  const shifted = sydneyCalendarDate(baseMs + deltaDays * 86400000);
  return parseSydneyDateParts(shifted);
}

/** Parse auto-ingest display lines like `starts Wed 7:00 pm`. */
export function inferStartMsFromEnds(
  ends: string,
  nowMs = Date.now(),
): number | null {
  const match = ends.match(
    /^starts\s+(\w{3})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i,
  );
  if (!match) return null;

  const dowKey = match[1].toLowerCase().slice(0, 3);
  const targetDow = DOW_INDEX[dowKey];
  if (targetDow === undefined) return null;

  let hour = Number.parseInt(match[2], 10);
  const minute = Number.parseInt(match[3], 10);
  const ampm = match[4].toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  const todayIso = sydneyCalendarDate(nowMs);
  const todayDow = sydneyDayOfWeek(nowMs);
  const delta = (targetDow - todayDow + 7) % 7;
  const target = addDaysToSydneyDate(todayIso, delta);

  return sydneyLocalToUtcMs(
    target.year,
    target.month,
    target.day,
    hour,
    minute,
  );
}

/** Best-effort event start instant for filtering (ISO preferred). */
export function resolveTicketStartMs(
  ticket: Ticket,
  nowMs = Date.now(),
): number | null {
  if (ticket.startsAtIso) {
    const ms = Date.parse(ticket.startsAtIso);
    if (!Number.isNaN(ms)) return ms;
  }
  return inferStartMsFromEnds(ticket.ends, nowMs);
}

/**
 * Buckets a known start instant into now / hour / today (Sydney calendar).
 * Future calendar days still store as "today" for legacy sort rank — filtering
 * uses {@link resolveTicketStartMs} to exclude them from the Today chip.
 */
export function timeWindowFromStartMs(
  startMs: number,
  nowMs = Date.now(),
): TimeWindow {
  const diff = startMs - nowMs;
  if (diff <= 0) return "now";
  if (diff <= HOUR_MS) return "hour";
  if (isSameSydneyCalendarDay(startMs, nowMs)) return "today";
  return "today";
}

export function ticketMatchesTimeFilter(
  ticket: Ticket,
  filter: Filters["time"],
  nowMs = Date.now(),
): boolean {
  const startMs = resolveTicketStartMs(ticket, nowMs);

  if (filter === "today") {
    if (startMs === null) return true;
    return isSameSydneyCalendarDay(startMs, nowMs);
  }

  if (filter === "now") {
    if (startMs === null) return ticket.time === "now";
    if (startMs > nowMs) return false;
    return isSameSydneyCalendarDay(startMs, nowMs);
  }

  if (filter === "hour") {
    if (startMs === null) {
      return ticket.time === "now" || ticket.time === "hour";
    }
    if (startMs <= nowMs && isSameSydneyCalendarDay(startMs, nowMs)) {
      return true;
    }
    const diff = startMs - nowMs;
    return (
      diff > 0 &&
      diff <= HOUR_MS &&
      isSameSydneyCalendarDay(startMs, nowMs)
    );
  }

  return true;
}
