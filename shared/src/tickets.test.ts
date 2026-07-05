import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  SEED_TICKETS,
  buildQuickAddTicket,
  extractFromPost,
  filterTickets,
} from "./tickets.js";

describe("filterTickets", () => {
  it("returns only free tickets when budget is free", () => {
    const result = filterTickets(SEED_TICKETS, {
      ...DEFAULT_FILTERS,
      budget: "free",
    });
    expect(result.every((ticket) => ticket.cost === 0)).toBe(true);
  });

  it("sorts gone tickets to the bottom", () => {
    const result = filterTickets(SEED_TICKETS, {
      ...DEFAULT_FILTERS,
      budget: "free",
      time: "today",
      area: "anywhere",
    });
    const goneIndex = result.findIndex((ticket) => ticket.id === "t5");
    expect(goneIndex).toBe(result.length - 1);
  });

  it("narrows by Area independently of the walk vantage", () => {
    // Area filter narrows the set; vantage only affects walk/sort, not membership.
    const result = filterTickets(
      SEED_TICKETS,
      { budget: "u10", time: "today", area: "quad" },
      {},
      "library",
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((ticket) => ticket.area === "quad")).toBe(true);
  });

  it("re-sorts the same set when the vantage changes", () => {
    const filters = { budget: "u10", time: "today", area: "anywhere" } as const;
    const fromQuad = filterTickets(SEED_TICKETS, filters, {}, "quad").map(
      (t) => t.id,
    );
    const fromLower = filterTickets(SEED_TICKETS, filters, {}, "lower").map(
      (t) => t.id,
    );
    // Same members, different vantage → different walk-based ordering.
    expect([...fromQuad].sort()).toEqual([...fromLower].sort());
    expect(fromQuad).not.toEqual(fromLower);
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
  it("infers library area from where text", () => {
    const ticket = buildQuickAddTicket({
      where: "Library Atrium",
      what: "bagels",
      last: "30 min",
    });
    expect(ticket.area).toBe("library");
    expect(ticket.name).toBe("Bagels");
  });
});
