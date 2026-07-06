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
      area: "upper",
      time: "now",
      where: "Quadrangle",
      ends: "ends 2:00pm",
      access: "Open to all",
      confirmed: "8 min ago",
      worth: "high",
      status: "available",
      blurb: "Test blurb",
      createdBy: { userId: "seed_test", displayName: "Test Seed" },
    });

    render(<TicketCard ticket={ticket} onClick={() => {}} />);

    expect(screen.getByText("Free Pizza — Sponsor Night")).toBeInTheDocument();
    expect(screen.getByText("FREE")).toBeInTheDocument();
    expect(screen.getByText("GO NOW")).toBeInTheDocument();
  });

  it("renders FOOD? stamp and confirm prompt for possible-tier tickets", () => {
    const ticket = toTicketView({
      id: "t2",
      no: "1044",
      name: "Trivia Night!",
      source: "Antique Society",
      cost: 0,
      area: "upper",
      time: "today",
      where: "Quadrangle",
      ends: "starts Mon 5:00 pm",
      access: "Open to all",
      confirmed: "not yet confirmed",
      worth: "maybe",
      status: "available",
      blurb: "Food here isn't confirmed yet.",
      createdBy: { userId: "ingest", displayName: "MealMap Ingest" },
      trust: "unverified",
      foodStatus: "unconfirmed",
      foodLikelihood: "possible",
    });

    render(<TicketCard ticket={ticket} onClick={() => {}} />);

    expect(screen.getByText("FOOD?")).toBeInTheDocument();
    expect(
      screen.getByText("Been here? Confirm if there's food"),
    ).toBeInTheDocument();
  });
});
