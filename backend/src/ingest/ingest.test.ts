import { describe, expect, it } from "vitest";
import {
  buildFallbackBlurb,
  parseEventPriceToCost,
  resolveAutoBlurb,
} from "./ingest.js";
import type { SocietyEvent } from "./fetchEvents.js";

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
