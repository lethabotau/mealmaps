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
