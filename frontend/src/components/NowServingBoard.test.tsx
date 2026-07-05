import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toTicketView } from "@mealmap/shared";
import { NowServingBoard } from "./NowServingBoard";

describe("NowServingBoard", () => {
  it("opens detail when a rail stub is clicked", () => {
    const onSelectTicket = vi.fn();
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

    render(
      <NowServingBoard tickets={[ticket]} onSelectTicket={onSelectTicket} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Open Free Pizza/i }));
    expect(onSelectTicket).toHaveBeenCalledWith("t1");
  });
});
