import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFallbackBlurb,
  ingestClassified,
  parseEventPriceToCost,
  resolveAutoBlurb,
} from "./ingest.js";
import type { SocietyEvent } from "./fetchEvents.js";
import type { ClassifiedEvent } from "./classifyEvents.js";
import { sydneyLocalToUtcMs } from "@mealmap/shared";
import { resetStore } from "../store/ticketStore.js";

const sampleEvent: SocietyEvent = {
  event_id: "evt-1",
  event_name: "Weekly Lunch",
  event_type: "Social",
  location: "Party/BBQ/Social",
  starts_at_iso: "2026-07-08T01:00:00.000Z",
  local_date: "2026-07-08",
  description: "",
  society_name: "Christian Union",
  price: "Free",
  source_url: "https://campus.hellorubric.com/?eid=1",
  banner_image: "",
  objectID: "obj-1",
};

describe("runIngest resilience", () => {
  it("returns an empty summary when ALGOLIA_SEARCH_KEY is unset", async () => {
    const prev = process.env.ALGOLIA_SEARCH_KEY;
    delete process.env.ALGOLIA_SEARCH_KEY;
    try {
      const { runIngest } = await import("./ingest.js");
      const summary = await runIngest();
      expect(summary).toEqual({
        fetched: 0,
        classified: 0,
        inserted: 0,
        insertedTickets: [],
      });
    } finally {
      if (prev === undefined) delete process.env.ALGOLIA_SEARCH_KEY;
      else process.env.ALGOLIA_SEARCH_KEY = prev;
    }
  });
});

describe("auto-ticket blurbs", () => {
  it("uses the classifier blurb when present", () => {
    const blurb =
      "Christian Union's Tuesday lunch — food's the whole point of this one. No room pinned yet; check the event page.";
    expect(resolveAutoBlurb(sampleEvent, blurb)).toBe(blurb);
  });

  it("falls back to a human template without classifier log lines", () => {
    const fallback = resolveAutoBlurb(sampleEvent, null);
    expect(fallback).toContain("Christian Union");
    expect(fallback).toContain("Weekly Lunch");
    expect(fallback).not.toMatch(/Food likelihood/i);
    expect(fallback).not.toMatch(/Auto-added from/i);
  });

  it("buildFallbackBlurb preserves the society name verbatim", () => {
    const blurb = buildFallbackBlurb({
      ...sampleEvent,
      society_name: "Filipino Students' Society",
    });
    expect(blurb).toContain("Filipino Students' Society");
  });
});

describe("parseEventPriceToCost (ingest)", () => {
  it("maps Free and $0-led ranges to zero for the free-only filter", () => {
    expect(parseEventPriceToCost("Free")).toBe(0);
    expect(parseEventPriceToCost("$0.00 - $6.37")).toBe(0);
    expect(parseEventPriceToCost("$6.37 / $0.00 members")).toBe(0);
  });

  it("uses the range minimum for paid tiers", () => {
    expect(parseEventPriceToCost("$22.06 - $27.29")).toBe(22);
  });
});

describe("auto ticket time windows", () => {
  const now = sydneyLocalToUtcMs(2026, 7, 6, 10, 0);

  beforeEach(() => {
    resetStore({ seed: false });
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores startsAtIso and buckets same-day future events as today, not now", () => {
    const startsAtIso = "2026-07-06T21:00:00+10:00";
    const classified: ClassifiedEvent[] = [
      {
        event: {
          ...sampleEvent,
          starts_at_iso: startsAtIso,
        },
        food_likelihood: "high",
        reason: "test",
        blurb: "Tonight's event.",
        venue_hint: null,
        on_campus: true,
      },
    ];

    const tickets = ingestClassified(classified);
    expect(tickets).toHaveLength(1);
    expect(tickets[0]?.startsAtIso).toBe(startsAtIso);
    expect(tickets[0]?.time).toBe("today");
  });

  it("does not bucket a Wednesday event as now/hour on Monday", () => {
    const startsAtIso = "2026-07-08T19:00:00+10:00";
    const classified: ClassifiedEvent[] = [
      {
        event: {
          ...sampleEvent,
          event_name: "Wed dinner",
          starts_at_iso: startsAtIso,
        },
        food_likelihood: "medium",
        reason: "test",
        blurb: "Wednesday event.",
        venue_hint: null,
        on_campus: true,
      },
    ];

    const tickets = ingestClassified(classified);
    expect(tickets[0]?.time).toBe("today");
    expect(tickets[0]?.startsAtIso).toBe(startsAtIso);
  });
});
