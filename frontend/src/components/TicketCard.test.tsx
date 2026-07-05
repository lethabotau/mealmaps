import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { toTicketView } from "@mealmap/shared";
import { TicketCard } from "./TicketCard";

describe("TicketCard", () => {
  it("renders ticket name and cost", () => {
    const ticket = toTicketView({
      id: "t1",
      no: "1043",
      name: "Free Pizza — Sponsor Night",
      source: "CS Club",
      cost: 0,
      area: "quad",
      time: "now",
      walk: 6,
      where: "Quad 1043",
      ends: "ends 2:00pm",
      access: "Open to all",
      confirmed: "8 min ago",
      worth: "high",
      status: "available",
      blurb: "Test blurb",
    });

    render(<TicketCard ticket={ticket} onClick={() => {}} />);

    expect(screen.getByText("Free Pizza — Sponsor Night")).toBeInTheDocument();
    expect(screen.getByText("FREE")).toBeInTheDocument();
    expect(screen.getByText("GO NOW")).toBeInTheDocument();
  });
});
