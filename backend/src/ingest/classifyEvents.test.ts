import { describe, expect, it } from "vitest";
import {
  classifyEventsWithReport,
  formatClassificationLine,
} from "./classifyEvents.js";
import type { SocietyEvent } from "./fetchEvents.js";

function mockEvent(overrides: Partial<SocietyEvent>): SocietyEvent {
  return {
    event_id: "e1",
    event_name: "Event",
    event_type: "Social",
    location: "Party/BBQ/Social",
    starts_at_iso: "2026-07-10T02:00:00.000Z",
    local_date: "2026-07-10",
    description: "",
    society_name: "Some Society",
    price: "Free",
    source_url: "https://example.com",
    banner_image: "",
    objectID: "o1",
    ...overrides,
  };
}

describe("classifyEvents fallback (no API key)", () => {
  const prevKey = process.env.ANTHROPIC_API_KEY;

  it("drops commercial outings including food crawls and pub crawls", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const report = await classifyEventsWithReport([
      mockEvent({
        event_id: "pub",
        event_name: "CityHeroes Pub Crawl",
        price: "$25",
      }),
      mockEvent({
        event_id: "cruise",
        event_name: "Harbour Cruise Social",
        price: "$40",
      }),
      mockEvent({
        event_id: "crawl",
        event_name: "Cabramatta Food Crawl",
        society_name: "Asian Studies Association",
        price: "Free",
      }),
      mockEvent({
        event_id: "lunch-out",
        event_name: "Kokoroya Maroubra x MatchaSoc Social Lunch",
        society_name: "Matcha Society",
        price: "Free",
      }),
    ]);

    expect(report.kept).toHaveLength(0);
    expect(report.dropped.map((v) => v.event.event_id)).toEqual([
      "pub",
      "cruise",
      "crawl",
      "lunch-out",
    ]);
    process.env.ANTHROPIC_API_KEY = prevKey;
  });

  it("keeps provided-food signals like boodle fight and sausage sizzle", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const report = await classifyEventsWithReport([
      mockEvent({
        event_id: "boodle",
        event_name: "FILOSOC Boodle Fight",
        society_name: "Filipino Students' Society",
        price: "Free",
      }),
      mockEvent({
        event_id: "sizzle",
        event_name: "Sausage sizzle Village Green",
        price: "gold coin",
      }),
    ]);

    expect(report.kept.map((v) => v.event.event_id)).toEqual(["boodle", "sizzle"]);
    expect(report.dropped).toHaveLength(0);
    process.env.ANTHROPIC_API_KEY = prevKey;
  });

  it("keeps ticketed provided meals and ambiguous society dinners", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const report = await classifyEventsWithReport([
      mockEvent({
        event_id: "dinner",
        event_name: "PhilSoc Cultural Dinner Night",
        price: "$12",
      }),
      mockEvent({
        event_id: "member",
        event_name: "Member Lunch",
        price: "$5",
      }),
      mockEvent({
        event_id: "boodle",
        event_name: "FILOSOC Boodle Fight",
        society_name: "Filipino Students' Society",
        price: "$22.06 - $27.29",
      }),
      mockEvent({
        event_id: "cu",
        event_name: "Lunch; Sports and Hangs T2 W6",
        society_name: "Christian Union",
        price: "Free",
      }),
    ]);

    expect(report.kept.map((v) => v.event.event_id).sort()).toEqual([
      "boodle",
      "cu",
      "dinner",
      "member",
    ]);
    process.env.ANTHROPIC_API_KEY = prevKey;
  });

  it("drops generic social hangouts without explicit provision signals", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const report = await classifyEventsWithReport([
      mockEvent({
        event_id: "bingo",
        event_name: "Snap Bingo",
        location: "Party/BBQ/Social",
        price: "Free",
      }),
      mockEvent({
        event_id: "touhou",
        event_name: "Touhou Thursdays!",
        location: "Party/BBQ/Social",
        price: "Free",
      }),
      mockEvent({
        event_id: "isckon",
        event_name: "ISCKON W6",
        society_name: "UNSW Hindu Society",
        price: "Free",
      }),
      mockEvent({
        event_id: "coffee",
        event_name: "T2 Coffee Night",
        society_name: "UNSW Hall",
        price: "Free",
      }),
    ]);

    expect(report.kept.map((v) => v.event.event_id).sort()).toEqual(["coffee", "isckon"]);
    expect(report.dropped.map((v) => v.event.event_id).sort()).toEqual(["bingo", "touhou"]);
    expect(report.possible).toHaveLength(0);
    process.env.ANTHROPIC_API_KEY = prevKey;
  });

  it("routes plausible society socials to possible tier", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const report = await classifyEventsWithReport([
      mockEvent({
        event_id: "puzzle",
        event_name: "Puzzlesoc Social Session Term 2 2026",
        society_name: "UNSW Puzzle Society",
        location: "Party/BBQ/Social",
        price: "Free",
      }),
      mockEvent({
        event_id: "trivia",
        event_name: "Trivia Night!",
        society_name: "Antique Society",
        location: "Quiz/Trivia",
        price: "Free",
      }),
      mockEvent({
        event_id: "bjj",
        event_name: "BJJ All Levels Class",
        society_name: "UNSW Brazilian Jiu-Jitsu and Wrestling Society",
        location: "Class/Workshop",
        price: "Free",
      }),
      mockEvent({
        event_id: "chess",
        event_name: "2026 Weekly Online Tournament 27",
        society_name: "UNSW Chess Club",
        location: "Other",
        price: "Free",
      }),
    ]);

    expect(report.possible.map((v) => v.event.event_id).sort()).toEqual([
      "puzzle",
      "trivia",
    ]);
    expect(report.dropped.map((v) => v.event.event_id).sort()).toEqual(["bjj", "chess"]);
    process.env.ANTHROPIC_API_KEY = prevKey;
  });

  it("formats classification lines for reporting", () => {
    const line = formatClassificationLine({
      event: mockEvent({
        event_name: "Cabramatta Food Crawl",
        society_name: "Asian Studies Association",
        price: "Free",
      }),
      food_likelihood: "none",
      reason: "attendees buy their own",
      blurb: null,
      venue_hint: null,
      on_campus: false,
    });
    expect(line).toContain("Cabramatta Food Crawl");
    expect(line).toContain("none");
  });
});
