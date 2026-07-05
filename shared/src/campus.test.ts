import { describe, expect, it } from "vitest";
import {
  areaVantage,
  computeWalk,
  coordsFor,
  haversineMeters,
  resolveLocation,
  walkMinutes,
} from "./campus.js";

describe("haversineMeters", () => {
  it("is zero between identical coordinates", () => {
    const q = coordsFor("Quadrangle")!;
    expect(haversineMeters(q, q)).toBeCloseTo(0, 5);
  });

  it("returns the approximate campus distance (Quadrangle → Main Library)", () => {
    const meters = haversineMeters(
      coordsFor("Quadrangle")!,
      coordsFor("Main Library")!,
    );
    // ~250m; assert a tolerant band so tiny coord tweaks don't break the test.
    expect(meters).toBeGreaterThan(180);
    expect(meters).toBeLessThan(340);
  });

  it("is symmetric", () => {
    const a = coordsFor("Roundhouse")!;
    const b = coordsFor("Mathews Building")!;
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("walkMinutes", () => {
  it("clamps to a 1-minute minimum for identical points", () => {
    const q = coordsFor("Quadrangle")!;
    expect(walkMinutes(q, q)).toBe(1);
  });

  it("clamps to a 25-minute maximum for far points", () => {
    expect(
      walkMinutes(coordsFor("Quadrangle")!, { lat: -34.02, lng: 151.31 }),
    ).toBe(25);
  });

  it("rounds up (Quadrangle → Main Library ≈ 250m ÷ 80 → 4 min)", () => {
    expect(
      walkMinutes(coordsFor("Quadrangle")!, coordsFor("Main Library")!),
    ).toBe(4);
  });
});

describe("computeWalk", () => {
  it("returns null when either endpoint is unknown", () => {
    const q = coordsFor("Quadrangle")!;
    expect(computeWalk(q, null)).toBeNull();
    expect(computeWalk(null, q)).toBeNull();
    expect(computeWalk(undefined, undefined)).toBeNull();
  });

  it("returns a positive number when both endpoints are known", () => {
    expect(computeWalk(coordsFor("Quadrangle")!, coordsFor("Roundhouse")!)).toBeGreaterThan(0);
  });
});

describe("resolveLocation (alias matching)", () => {
  it("matches a room string to the Quadrangle", () => {
    expect(resolveLocation("Quad 1043")?.name).toBe("Quadrangle");
  });

  it("matches library aliases to the Main Library", () => {
    expect(resolveLocation("main lib")?.name).toBe("Main Library");
    expect(resolveLocation("Library Atrium")?.name).toBe("Main Library");
  });

  it("prefers the more specific Law Library over the generic library alias", () => {
    expect(resolveLocation("law library, level 2")?.name).toBe("Law Library");
  });

  it("matches embedded location wording", () => {
    expect(resolveLocation("meet outside the roundhouse")?.name).toBe(
      "Roundhouse",
    );
  });

  it("returns null for unmatched or empty text", () => {
    expect(resolveLocation("some random building")).toBeNull();
    expect(resolveLocation("location unconfirmed")).toBeNull();
    expect(resolveLocation("")).toBeNull();
    expect(resolveLocation(null)).toBeNull();
  });
});

describe("areaVantage", () => {
  it("maps areas to representative coords and defaults Anywhere to Quadrangle", () => {
    expect(areaVantage("library")).toEqual(coordsFor("Main Library"));
    expect(areaVantage("lower")).toEqual(coordsFor("Lower Campus Food Court"));
    expect(areaVantage("anywhere")).toEqual(coordsFor("Quadrangle"));
  });
});
