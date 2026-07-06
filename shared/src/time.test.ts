import { describe, expect, it } from "vitest";
import type { Ticket } from "./types.js";
import { SYSTEM_INGEST_USER } from "./tickets.js";
import {
  CAMPUS_TIME_ZONE,
  inferStartMsFromEnds,
  isSameSydneyCalendarDay,
  isTomorrowSydney,
  formatSydneyDateTime,
  formatSydneyNowPrompt,
  resolveTicketStartMs,
  sydneyCalendarDate,
  sydneyEventDayLabel,
  sydneyLocalToUtcMs,
  ticketMatchesTimeFilter,
  timeWindowFromStartMs,
} from "./time.js";

const autoBase = (): Ticket => ({
  id: "auto-1",
  no: "1",
  name: "Test event",
  source: "Soc",
  cost: 0,
  area: "upper",
  time: "today",
  where: "location unconfirmed",
  ends: "starts Wed 7:00 pm",
  access: "check event page",
  confirmed: "not yet confirmed",
  worth: "maybe",
  status: "available",
  blurb: "b",
  createdBy: SYSTEM_INGEST_USER,
  trust: "unverified",
  onCampus: true,
});

describe("Sydney calendar helpers", () => {
  it("maps a +10:00 ISO instant to the correct Sydney calendar date", () => {
    // Mon 6 Jul 2026 21:00 Sydney = Mon 6 Jul 11:00 UTC
    const ms = Date.parse("2026-07-06T11:00:00.000Z");
    expect(sydneyCalendarDate(ms)).toBe("2026-07-06");
    expect(CAMPUS_TIME_ZONE).toBe("Australia/Sydney");
  });

  it("does not treat a UTC midnight event as the previous Sydney day", () => {
    // Tue 7 Jul 2026 09:00 Sydney = Mon 6 Jul 23:00 UTC
    const ms = Date.parse("2026-07-06T23:00:00.000Z");
    expect(sydneyCalendarDate(ms)).toBe("2026-07-07");
  });

  it("round-trips Sydney local wall time through UTC", () => {
    const ms = sydneyLocalToUtcMs(2026, 7, 6, 21, 0);
    expect(sydneyCalendarDate(ms)).toBe("2026-07-06");
    expect(isSameSydneyCalendarDay(ms, ms)).toBe(true);
  });
});

describe("timeWindowFromStartMs", () => {
  const now = sydneyLocalToUtcMs(2026, 7, 6, 10, 0); // Mon 10am Sydney

  it("returns now for a start in the past on the same Sydney day", () => {
    const start = sydneyLocalToUtcMs(2026, 7, 6, 9, 0);
    expect(timeWindowFromStartMs(start, now)).toBe("now");
  });

  it("returns hour for a start within 60 minutes later today", () => {
    const start = sydneyLocalToUtcMs(2026, 7, 6, 10, 45);
    expect(timeWindowFromStartMs(start, now)).toBe("hour");
  });

  it("returns today for a later slot on the same Sydney day", () => {
    const start = sydneyLocalToUtcMs(2026, 7, 6, 21, 0);
    expect(timeWindowFromStartMs(start, now)).toBe("today");
  });
});

describe("ticketMatchesTimeFilter — today", () => {
  // Mon 6 Jul 2026, 10:00 Sydney — server might be UTC noon same calendar day
  const now = sydneyLocalToUtcMs(2026, 7, 6, 10, 0);

  it("includes an event starting tonight 9pm Sydney", () => {
    const startIso = new Date(
      sydneyLocalToUtcMs(2026, 7, 6, 21, 0),
    ).toISOString();
    const ticket = { ...autoBase(), startsAtIso: startIso, ends: "starts Mon 9:00 pm" };
    expect(ticketMatchesTimeFilter(ticket, "today", now)).toBe(true);
  });

  it("excludes a clearly future weekday (Wednesday) from today", () => {
    const startIso = new Date(
      sydneyLocalToUtcMs(2026, 7, 8, 19, 0),
    ).toISOString();
    const ticket = {
      ...autoBase(),
      startsAtIso: startIso,
      ends: "starts Wed 7:00 pm",
    };
    expect(ticketMatchesTimeFilter(ticket, "today", now)).toBe(false);
  });

  it("excludes future weekdays inferred from legacy ends lines without ISO", () => {
    const ticket = { ...autoBase(), ends: "starts Wed 7:00 pm" };
    expect(ticketMatchesTimeFilter(ticket, "today", now)).toBe(false);
  });

  it("keeps unresolvable human tickets visible under today (inclusive)", () => {
    const ticket = {
      ...autoBase(),
      ends: "until gone",
      createdBy: { userId: "u1", displayName: "Student" },
    };
    expect(ticketMatchesTimeFilter(ticket, "today", now)).toBe(true);
  });
});

describe("ticketMatchesTimeFilter — now and hour", () => {
  const now = sydneyLocalToUtcMs(2026, 7, 6, 10, 0);

  it("now requires the event to have started today", () => {
    const started: Ticket = {
      ...autoBase(),
      startsAtIso: new Date(sydneyLocalToUtcMs(2026, 7, 6, 9, 0)).toISOString(),
      time: "now",
    };
    const upcoming: Ticket = {
      ...autoBase(),
      startsAtIso: new Date(sydneyLocalToUtcMs(2026, 7, 6, 21, 0)).toISOString(),
      time: "today",
    };
    expect(ticketMatchesTimeFilter(started, "now", now)).toBe(true);
    expect(ticketMatchesTimeFilter(upcoming, "now", now)).toBe(false);
  });

  it("hour includes ongoing and within-60-min starts today", () => {
    const ongoing = {
      ...autoBase(),
      startsAtIso: new Date(sydneyLocalToUtcMs(2026, 7, 6, 9, 30)).toISOString(),
    };
    const soon = {
      ...autoBase(),
      startsAtIso: new Date(sydneyLocalToUtcMs(2026, 7, 6, 10, 30)).toISOString(),
    };
    const laterToday = {
      ...autoBase(),
      startsAtIso: new Date(sydneyLocalToUtcMs(2026, 7, 6, 21, 0)).toISOString(),
    };
    expect(ticketMatchesTimeFilter(ongoing, "hour", now)).toBe(true);
    expect(ticketMatchesTimeFilter(soon, "hour", now)).toBe(true);
    expect(ticketMatchesTimeFilter(laterToday, "hour", now)).toBe(false);
  });
});

describe("inferStartMsFromEnds", () => {
  it("resolves weekday + clock from auto-ingest display format", () => {
    const now = sydneyLocalToUtcMs(2026, 7, 6, 10, 0);
    const ms = inferStartMsFromEnds("starts Wed 7:00 pm", now);
    expect(ms).not.toBeNull();
    expect(sydneyCalendarDate(ms!)).toBe("2026-07-08");
  });

  it("returns null for non-auto ends strings", () => {
    expect(inferStartMsFromEnds("until gone")).toBeNull();
  });
});

describe("resolveTicketStartMs", () => {
  it("prefers startsAtIso over ends parsing", () => {
    const iso = "2026-07-08T12:00:00+10:00";
    const ticket = { ...autoBase(), startsAtIso: iso, ends: "starts Mon 9:00 am" };
    expect(resolveTicketStartMs(ticket)).toBe(Date.parse(iso));
  });
});

describe("assistant clock helpers", () => {
  const monMorning = sydneyLocalToUtcMs(2026, 7, 6, 10, 45);

  it("formats Sydney wall time for the system prompt", () => {
    expect(formatSydneyDateTime(monMorning)).toBe(
      "Monday 6 July 2026, 10:45 am",
    );
    expect(formatSydneyNowPrompt(monMorning)).toBe(
      "Current date/time: Monday 6 July 2026, 10:45 am (Australia/Sydney). All event times are Sydney time.",
    );
  });

  it("labels event days in Sydney", () => {
    const tue = sydneyLocalToUtcMs(2026, 7, 7, 11, 0);
    expect(sydneyEventDayLabel(tue)).toBe("Tuesday 7 July");
  });

  it("detects tomorrow in Sydney", () => {
    const tue = sydneyLocalToUtcMs(2026, 7, 7, 11, 0);
    expect(isTomorrowSydney(tue, monMorning)).toBe(true);
    expect(isTomorrowSydney(monMorning, monMorning)).toBe(false);
  });
});
