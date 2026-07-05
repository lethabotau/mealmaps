import { describe, expect, it } from "vitest";
import type { TicketView } from "@mealmap/shared";
import { layoutDashboardTickets } from "./dashboardTickets.js";

function stub(id: string): TicketView {
  return {
    id,
    no: id,
    name: id,
    source: "Soc",
    cost: 0,
    area: "upper",
    time: "today",
    where: "Quad",
    ends: "starts Mon 1:00 pm",
    access: "all",
    confirmed: "now",
    worth: "maybe",
    status: "available",
    blurb: "b",
    createdBy: { userId: "u", displayName: "U" },
    walk: 5,
    showWalk: true,
    isPinnable: false,
    whereDisplay: "Quad",
    timeLabel: "WHEN",
    timeText: "Mon 1:00 pm",
    timeColor: "#E5431E",
    walkStubLabel: "MIN WALK",
    walkDetailText: "5 min",
    costLabel: "FREE",
    costColor: "#E5431E",
    worthLabel: "MAYBE",
    worthColor: "#B7791F",
    statusLabel: "AVAILABLE",
    statusColor: "#2D6A4F",
    endsColor: "#E5431E",
    confirmCount: 0,
    lastChecked: "now",
    effectiveStatus: "available",
    effectiveWorth: "maybe",
  };
}

describe("layoutDashboardTickets", () => {
  it("grid includes every filtered ticket, including the top 3", () => {
    const views = [stub("t1"), stub("t2"), stub("t3"), stub("t4"), stub("t5")];
    const { railPreview, gridTickets } = layoutDashboardTickets(views);

    expect(gridTickets).toHaveLength(5);
    expect(railPreview).toHaveLength(3);
    expect(gridTickets.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    expect(railPreview.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    expect(gridTickets.slice(0, 3).map((t) => t.id)).toEqual(
      railPreview.map((t) => t.id),
    );
  });

  it("keeps a ticket in the grid when rank promotion moves it onto the rail", () => {
    const paid = stub("paid");
    paid.cost = 22;
    const target = stub("target");
    const before = layoutDashboardTickets([paid, stub("a"), stub("b"), target, stub("c")]);
    const after = layoutDashboardTickets([stub("a"), stub("b"), target, stub("c")]);

    expect(before.gridTickets.some((t) => t.id === "target")).toBe(true);
    expect(before.railPreview.some((t) => t.id === "target")).toBe(false);

    expect(after.gridTickets.some((t) => t.id === "target")).toBe(true);
    expect(after.railPreview.some((t) => t.id === "target")).toBe(true);
  });

  it("removes a ticket from both rail and grid only when it is absent from views", () => {
    const views = [stub("free-a"), stub("free-b")];
    const { railPreview, gridTickets } = layoutDashboardTickets(views);

    expect(gridTickets).toHaveLength(2);
    expect(railPreview).toHaveLength(2);
    expect(gridTickets.map((t) => t.id)).toEqual(["free-a", "free-b"]);
  });
});
