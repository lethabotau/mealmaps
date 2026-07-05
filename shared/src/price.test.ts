import { describe, expect, it } from "vitest";
import {
  costDisplayFor,
  formatPriceRangeLabel,
  isFreeCost,
  normalizeTicketCost,
  parseEventPriceToCost,
} from "./price.js";

describe("parseEventPriceToCost", () => {
  it("maps explicit Free to 0", () => {
    expect(parseEventPriceToCost("Free")).toBe(0);
    expect(parseEventPriceToCost("FREE ENTRY")).toBe(0);
  });

  it("uses the minimum dollar amount in a range", () => {
    expect(parseEventPriceToCost("$0.00 - $6.37")).toBe(0);
    expect(parseEventPriceToCost("$22.06 - $27.29")).toBe(22);
    expect(parseEventPriceToCost("$6.36 - $9.50")).toBe(6);
  });

  it("finds $0 even when it is not the first amount", () => {
    expect(parseEventPriceToCost("$6.37 / $0.00 members")).toBe(0);
    expect(parseEventPriceToCost("Non-members $6 / Members $0.00")).toBe(0);
  });

  it("returns 0 for empty or non-dollar prices", () => {
    expect(parseEventPriceToCost("")).toBe(0);
    expect(parseEventPriceToCost(null)).toBe(0);
    expect(parseEventPriceToCost("gold coin donation")).toBe(0);
  });
});

describe("isFreeCost", () => {
  it("treats numeric and string zero as free", () => {
    expect(isFreeCost(0)).toBe(true);
    expect(isFreeCost("0")).toBe(true);
    expect(isFreeCost(0.0)).toBe(true);
  });

  it("does not treat falsy non-zero values as free", () => {
    expect(isFreeCost(5)).toBe(false);
    expect(isFreeCost("5")).toBe(false);
    expect(isFreeCost(null)).toBe(true);
    expect(isFreeCost(undefined)).toBe(true);
    expect(isFreeCost("")).toBe(true);
  });
});

describe("formatPriceRangeLabel", () => {
  it("shows a span when the range floor is $0", () => {
    expect(formatPriceRangeLabel("$0.00 - $6.37")).toBe("$0–$6.37");
  });

  it("returns null for explicit Free or paid-only ranges", () => {
    expect(formatPriceRangeLabel("Free")).toBeNull();
    expect(formatPriceRangeLabel("$22.06 - $27.29")).toBeNull();
    expect(formatPriceRangeLabel("$6.36")).toBeNull();
  });
});

describe("costDisplayFor", () => {
  it("shows FREE for zero cost without a range", () => {
    expect(costDisplayFor(0, "Free").label).toBe("FREE");
  });

  it("shows the range for zero-min multi-tier pricing", () => {
    expect(costDisplayFor(0, "$0.00 - $6.37").label).toBe("$0–$6.37");
  });

  it("shows paid cost as a dollar label", () => {
    expect(costDisplayFor(22, "$22.06 - $27.29").label).toBe("$22");
  });
});

describe("normalizeTicketCost", () => {
  it("coerces string costs to integers", () => {
    expect(normalizeTicketCost("0")).toBe(0);
    expect(normalizeTicketCost("12")).toBe(12);
    expect(normalizeTicketCost("nope")).toBe(0);
  });
});
