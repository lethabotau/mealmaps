import type { CampusArea, Coords } from "./types.js";

/**
 * Approximate UNSW Kensington coordinates for a handful of well-known
 * locations. Values are hand-placed approximations (no external geocoding) —
 * good enough for relative walk-time estimates, not for navigation.
 */
export interface CampusLocation {
  name: string;
  coords: Coords;
}

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  { name: "Quadrangle", coords: { lat: -33.9173, lng: 151.2312 } },
  { name: "Main Library", coords: { lat: -33.9179, lng: 151.2286 } },
  { name: "Law Library", coords: { lat: -33.9169, lng: 151.2268 } },
  { name: "Ainsworth Building", coords: { lat: -33.9188, lng: 151.2301 } },
  { name: "Scientia", coords: { lat: -33.9172, lng: 151.2258 } },
  { name: "Roundhouse", coords: { lat: -33.9167, lng: 151.2246 } },
  { name: "Mathews Building", coords: { lat: -33.9183, lng: 151.2335 } },
  { name: "Lower Campus Food Court", coords: { lat: -33.9195, lng: 151.2282 } },
  { name: "Village Green", coords: { lat: -33.9163, lng: 151.2303 } },
  { name: "Physics Theatre", coords: { lat: -33.9177, lng: 151.2319 } },
  { name: "Electrical Engineering", coords: { lat: -33.9186, lng: 151.2307 } },
  { name: "Biological Sciences", coords: { lat: -33.9200, lng: 151.2343 } },
  {
    name: "Tyree Energy Technologies Building",
    coords: { lat: -33.9196, lng: 151.2315 },
  },
  { name: "Squarehouse", coords: { lat: -33.9174, lng: 151.2252 } },
  { name: "UNSW Business School", coords: { lat: -33.9165, lng: 151.2276 } },
];

const NAME_TO_COORDS: Record<string, Coords> = Object.fromEntries(
  CAMPUS_LOCATIONS.map((location) => [location.name, location.coords]),
);

/** Exact (canonical-name) lookup. */
export function coordsFor(name: string): Coords | null {
  return NAME_TO_COORDS[name] ?? null;
}

/** Fuzzy aliases (normalized substrings) → canonical location name. */
const LOCATION_ALIASES: Record<string, string> = {
  quad: "Quadrangle",
  "quad 1043": "Quadrangle",
  quadrangle: "Quadrangle",
  "main lib": "Main Library",
  "main library": "Main Library",
  "library atrium": "Main Library",
  library: "Main Library",
  "law lib": "Law Library",
  "law library": "Law Library",
  ainsworth: "Ainsworth Building",
  j17: "Ainsworth Building",
  scientia: "Scientia",
  roundhouse: "Roundhouse",
  mathews: "Mathews Building",
  "food court": "Lower Campus Food Court",
  "lower campus": "Lower Campus Food Court",
  "lower commons": "Lower Campus Food Court",
  "village green": "Village Green",
  physics: "Physics Theatre",
  electrical: "Electrical Engineering",
  biological: "Biological Sciences",
  tyree: "Tyree Energy Technologies Building",
  tetb: "Tyree Energy Technologies Building",
  squarehouse: "Squarehouse",
  "business school": "UNSW Business School",
  business: "UNSW Business School",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Canonical names match themselves; longer keys are tried first so that
// "law library" resolves to Law Library rather than the "library" alias.
const MATCHERS: Array<{ key: string; name: string }> = [
  ...CAMPUS_LOCATIONS.map((location) => ({
    key: normalize(location.name),
    name: location.name,
  })),
  ...Object.entries(LOCATION_ALIASES).map(([key, name]) => ({
    key: normalize(key),
    name,
  })),
].sort((a, b) => b.key.length - a.key.length);

/**
 * Fuzzy-matches free-text location wording to a known campus location.
 * Returns `null` when nothing matches (caller treats that as unknown coords).
 */
export function resolveLocation(
  text: string | null | undefined,
): CampusLocation | null {
  if (!text) return null;
  const norm = normalize(text);
  if (!norm) return null;

  for (const matcher of MATCHERS) {
    if (matcher.key && norm.includes(matcher.key)) {
      const coords = coordsFor(matcher.name);
      if (coords) return { name: matcher.name, coords };
    }
  }
  return null;
}

const EARTH_RADIUS_M = 6_371_000;
const WALK_METERS_PER_MIN = 80;
const MIN_WALK_MIN = 1;
const MAX_WALK_MIN = 25;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres between two coordinates. */
export function haversineMeters(a: Coords, b: Coords): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Walk minutes between two coords: distance ÷ 80 m/min, ceil, clamped 1–25. */
export function walkMinutes(from: Coords, to: Coords): number {
  const minutes = Math.ceil(haversineMeters(from, to) / WALK_METERS_PER_MIN);
  return Math.min(MAX_WALK_MIN, Math.max(MIN_WALK_MIN, minutes));
}

/** Walk minutes, or `null` when either endpoint has unknown coordinates. */
export function computeWalk(
  from: Coords | null | undefined,
  to: Coords | null | undefined,
): number | null {
  if (!from || !to) return null;
  return walkMinutes(from, to);
}

/**
 * The user's vantage for walk computation. Upper → Quadrangle, Lower → food court.
 */
export const VANTAGE_COORDS: Record<CampusArea, Coords> = {
  upper: coordsFor("Quadrangle")!,
  lower: coordsFor("Lower Campus Food Court")!,
};

/** @deprecated Use VANTAGE_COORDS */
export const AREA_VANTAGE: Record<CampusArea | "anywhere", Coords> = {
  upper: VANTAGE_COORDS.upper,
  lower: VANTAGE_COORDS.lower,
  anywhere: VANTAGE_COORDS.upper,
};

export function areaVantage(area: CampusArea | "anywhere"): Coords {
  if (area === "anywhere") return VANTAGE_COORDS.upper;
  return VANTAGE_COORDS[area] ?? VANTAGE_COORDS.upper;
}
