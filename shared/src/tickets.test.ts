import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FILTERS,
  OFF_CAMPUS_WHERE,
  PINNABLE_WHERE,
  SEED_TICKETS,
  SYSTEM_INGEST_USER,
  UNCONFIRMED_WHERE,
  buildQuickAddTicket,
  extractFromPost,
  filterTickets,
  normalizeArea,
  onCampusRank,
  parseTimeLine,
  toTicketView,
  whereDisplayFor,
} from "./tickets.js";
import type { Ticket } from "./types.js";
import { sydneyLocalToUtcMs } from "./time.js";

describe("filterTickets", () => {
  it("returns only free tickets when freeOnly is true", () => {
    const result = filterTickets(SEED_TICKETS, {
      ...DEFAULT_FILTERS,
      freeOnly: true,
    });
    expect(result.every((ticket) => ticket.cost === 0)).toBe(true);
  });

  it("includes tickets with string zero cost when freeOnly is true", () => {
    const stringZero = {
      ...SEED_TICKETS[0],
      id: "str-zero",
      cost: "0" as unknown as number,
    };
    const result = filterTickets([stringZero], {
      ...DEFAULT_FILTERS,
      freeOnly: true,
    });
    expect(result).toHaveLength(1);
  });

  it("sorts gone tickets to the bottom", () => {
    const result = filterTickets(SEED_TICKETS, {
      ...DEFAULT_FILTERS,
      freeOnly: true,
      time: "today",
    });
    const goneIndex = result.findIndex((ticket) => ticket.id === "t5");
    expect(goneIndex).toBe(result.length - 1);
  });

  it("does not narrow by ticket area — vantage only affects walk/sort", () => {
    const fromUpper = filterTickets(
      SEED_TICKETS,
      DEFAULT_FILTERS,
      {},
      "upper",
    ).map((t) => t.id);
    const fromLower = filterTickets(
      SEED_TICKETS,
      DEFAULT_FILTERS,
      {},
      "lower",
    ).map((t) => t.id);
    expect([...fromUpper].sort()).toEqual([...fromLower].sort());
  });

  it("re-sorts the same set when the vantage changes", () => {
    const filters = { ...DEFAULT_FILTERS };
    const fromUpper = filterTickets(SEED_TICKETS, filters, {}, "upper").map(
      (t) => t.id,
    );
    const fromLower = filterTickets(SEED_TICKETS, filters, {}, "lower").map(
      (t) => t.id,
    );
    expect([...fromUpper].sort()).toEqual([...fromLower].sort());
    expect(fromUpper).not.toEqual(fromLower);
  });

  it("excludes future-weekday auto tickets from the Today filter", () => {
    const now = sydneyLocalToUtcMs(2026, 7, 6, 10, 0);
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      const autoTickets: Ticket[] = [
      {
        id: "auto-today",
        no: "1",
        name: "Tonight coffee",
        source: "Hall",
        cost: 0,
        area: "upper",
        time: "today",
        where: "location unconfirmed",
        ends: "starts Mon 9:00 pm",
        startsAtIso: new Date(sydneyLocalToUtcMs(2026, 7, 6, 21, 0)).toISOString(),
        access: "check event page",
        confirmed: "not yet confirmed",
        worth: "maybe",
        status: "available",
        blurb: "b",
        createdBy: SYSTEM_INGEST_USER,
        trust: "unverified",
        onCampus: true,
      },
      {
        id: "auto-wed",
        no: "2",
        name: "Wed dinner",
        source: "Soc",
        cost: 0,
        area: "upper",
        time: "today",
        where: "location unconfirmed",
        ends: "starts Wed 7:00 pm",
        startsAtIso: new Date(sydneyLocalToUtcMs(2026, 7, 8, 19, 0)).toISOString(),
        access: "check event page",
        confirmed: "not yet confirmed",
        worth: "maybe",
        status: "available",
        blurb: "b",
        createdBy: SYSTEM_INGEST_USER,
        trust: "unverified",
        onCampus: true,
      },
    ];

    const result = filterTickets(
      autoTickets,
      { ...DEFAULT_FILTERS, time: "today" },
      {},
      "upper",
    );
    expect(result.map((t) => t.id)).toEqual(["auto-today"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("normalizeArea", () => {
  it("maps legacy quad and library to upper", () => {
    expect(normalizeArea("quad")).toBe("upper");
    expect(normalizeArea("library")).toBe("upper");
    expect(normalizeArea("upper")).toBe("upper");
    expect(normalizeArea("lower")).toBe("lower");
  });
});

describe("extractFromPost", () => {
  it("extracts pizza, free, time, and location from a club post", () => {
    const text =
      "CS Club Sponsor Night is TONIGHT! Free pizza in Quad 1043 from 6pm to 8pm. Open to all students.";
    const result = extractFromPost(text);

    expect(result.food).toBe("Pizza");
    expect(result.cost).toBe("Free");
    expect(result.location).toMatch(/Quad 1043/i);
    expect(result.access).toBe("Open to all");
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });
});

describe("buildQuickAddTicket", () => {
  it("infers upper campus from library where text", () => {
    const ticket = buildQuickAddTicket({
      where: "Library Atrium",
      what: "bagels",
      last: "30 min",
    });
    expect(ticket.area).toBe("upper");
    expect(ticket.name).toBe("Bagels");
  });
});

describe("parseTimeLine", () => {
  it("labels start-prefixed lines as WHEN", () => {
    const line = parseTimeLine("starts Fri 12:00 pm", false);
    expect(line.label).toBe("WHEN");
    expect(line.text).toBe("Fri 12:00 pm");
  });

  it("labels end-prefixed lines as ENDS", () => {
    const line = parseTimeLine("ends 2:00pm", false);
    expect(line.label).toBe("ENDS");
    expect(line.text).toBe("2:00pm");
  });
});

describe("whereDisplayFor", () => {
  const base: Ticket = {
    id: "a1",
    no: "1",
    name: "Test",
    source: "Soc",
    cost: 0,
    area: "upper",
    time: "today",
    where: UNCONFIRMED_WHERE,
    coords: null,
    ends: "starts Mon 1:00 pm",
    access: "all",
    confirmed: "now",
    worth: "maybe",
    status: "available",
    blurb: "b",
    createdBy: SYSTEM_INGEST_USER,
    trust: "unverified",
    onCampus: true,
  };

  it("shows pinnable prompt for on-campus unresolved tickets", () => {
    expect(whereDisplayFor(base)).toBe(PINNABLE_WHERE);
  });

  it("shows off-campus label when onCampus is false", () => {
    expect(whereDisplayFor({ ...base, onCampus: false })).toBe(OFF_CAMPUS_WHERE);
  });
});

describe("onCampus ranking", () => {
  it("sorts off-campus unverified below on-campus unverified", () => {
    const onCampus: Ticket = {
      id: "on",
      no: "1",
      name: "On",
      source: "Soc",
      cost: 0,
      area: "upper",
      time: "today",
      where: UNCONFIRMED_WHERE,
      coords: null,
      ends: "starts Mon 1:00 pm",
      access: "all",
      confirmed: "now",
      worth: "maybe",
      status: "available",
      blurb: "b",
      createdBy: SYSTEM_INGEST_USER,
      trust: "unverified",
      onCampus: true,
    };
    const offCampus: Ticket = { ...onCampus, id: "off", onCampus: false, where: OFF_CAMPUS_WHERE };
    const sorted = filterTickets([offCampus, onCampus], DEFAULT_FILTERS);
    expect(sorted[0].id).toBe("on");
    expect(onCampusRank(offCampus)).toBeGreaterThan(onCampusRank(onCampus));
  });
});

describe("toTicketView", () => {
  it("uses WHEN label for auto-ingest start times", () => {
    const view = toTicketView({
      id: "auto-1",
      no: "99",
      name: "BBQ",
      source: "Soc",
      cost: 0,
      area: "upper",
      time: "today",
      where: UNCONFIRMED_WHERE,
      coords: null,
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
    expect(view.timeLabel).toBe("WHEN");
    expect(view.timeText).toBe("Wed 7:00 pm");
    expect(view.isPinnable).toBe(true);
    expect(view.showWalk).toBe(true);
  });
});
