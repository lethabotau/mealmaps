import type {
  Allergen,
  AssistantTicketContext,
  CampusArea,
  CreateTicketInput,
  DietaryProfile,
  DietTag,
  ExtractedPost,
  ExtractField,
  ExtractResult,
  FieldConfidence,
  Filters,
  LegacyCampusArea,
  TimeNormalized,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
  TicketStatus,
  TicketView,
  TimeWindow,
  UserIdentity,
  WorthLevel,
} from "./types.js";
import { SEED_AUTHORS } from "./seedUsers.js";
import { areaVantage, computeWalk, coordsFor } from "./campus.js";
import { costDisplayFor, isFreeCost } from "./price.js";

/**
 * Fixed identity for auto-ingested tickets. Shared so backend can stamp it and
 * frontend can detect auto-origin without a magic-string drift.
 */
export const SYSTEM_INGEST_USER: UserIdentity = {
  userId: "system-ingest",
  displayName: "MealMap Auto",
};

export const WORTH_COLORS: Record<WorthLevel, string> = {
  high: "#3C7A45",
  maybe: "#B7791F",
  low: "#C0341D",
};

export const WORTH_LABELS: Record<WorthLevel, string> = {
  high: "GO NOW",
  maybe: "MAYBE",
  low: "SKIP",
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  available: "#3C7A45",
  maybe: "#B7791F",
  gone: "#C0341D",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  available: "AVAILABLE",
  maybe: "HOLD?",
  gone: "GONE",
};

export const DEFAULT_FILTERS: Filters = {
  freeOnly: false,
  time: "today",
  safeForMe: false,
};

export const DIET_TAG_LABELS: Record<DietTag, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  halal: "Halal",
  kosher: "Kosher",
  "gluten-free": "Gluten-free",
  "dairy-free": "Dairy-free",
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  nuts: "Nuts",
  peanuts: "Peanuts",
  dairy: "Dairy",
  gluten: "Gluten",
  egg: "Egg",
  soy: "Soy",
  shellfish: "Shellfish",
  sesame: "Sesame",
};

export const DEFAULT_DIETARY_PROFILE: DietaryProfile = {
  avoidAllergens: [],
  wantTags: [],
};

/** True when a ticket is known (via confirmed dietary info) to conflict with the profile. */
export function dietaryConflicts(ticket: Ticket, profile: DietaryProfile): boolean {
  if (!ticket.dietary) return false;
  const { allergens, tags } = ticket.dietary;
  if (profile.avoidAllergens.some((allergen) => allergens.includes(allergen))) {
    return true;
  }
  if (
    profile.wantTags.length > 0 &&
    !profile.wantTags.every((tag) => tags.includes(tag))
  ) {
    return true;
  }
  return false;
}

/**
 * Badge for a ticket's dietary info — shown to every viewer, not just those
 * with a profile set. "conflict" means the ticket has known allergens (an
 * always-visible "contains X" warning). Unknown dietary info is always
 * flagged as "unconfirmed", never hidden or treated as safe.
 */
export function dietaryBadgeFor(ticket: Ticket): "conflict" | "unconfirmed" | "clear" {
  if (!ticket.dietary) return "unconfirmed";
  if (ticket.dietary.allergens.length > 0) return "conflict";
  return "clear";
}

/** Map stored ticket area (incl. legacy quad/library) to upper/lower show zones. */
export function normalizeArea(
  area: CampusArea | LegacyCampusArea,
): CampusArea {
  if (area === "lower") return "lower";
  return "upper";
}

/** Stored on auto tickets when the venue is unknown but on-campus. */
export const UNCONFIRMED_WHERE = "location unconfirmed";

/** Display line for off-campus auto tickets. */
export const OFF_CAMPUS_WHERE = "off-campus event";

/** Actionable where-line for on-campus tickets awaiting a crowd pin. */
export const PINNABLE_WHERE = "📍 Been here? Pin the location";

export function isOnCampus(ticket: Ticket): boolean {
  return ticket.onCampus !== false;
}

/** Off-campus unverified tickets rank below on-campus within the same band. */
export function onCampusRank(ticket: Ticket): number {
  return isOnCampus(ticket) ? 0 : 1;
}

export function isPinnableTicket(ticket: Ticket): boolean {
  return isOnCampus(ticket) && ticket.coords == null;
}

export function whereDisplayFor(ticket: Ticket): string {
  if (!isOnCampus(ticket)) return OFF_CAMPUS_WHERE;
  if (ticket.coords != null) return ticket.where;
  if (
    ticket.where === UNCONFIRMED_WHERE ||
    ticket.where === PINNABLE_WHERE
  ) {
    return PINNABLE_WHERE;
  }
  return ticket.where;
}

/** Pick WHEN vs ENDS label from the stored time line prefix. */
export function parseTimeLine(
  raw: string,
  gone: boolean,
): { label: "WHEN" | "ENDS"; text: string; color: string } {
  if (gone) {
    return { label: "ENDS", text: "gone", color: STATUS_COLORS.gone };
  }
  const lower = raw.toLowerCase();
  if (lower.startsWith("starts ")) {
    return { label: "WHEN", text: raw.slice(7), color: "#E5431E" };
  }
  if (lower.startsWith("ends ")) {
    return { label: "ENDS", text: raw.slice(5), color: "#E5431E" };
  }
  return { label: "ENDS", text: raw, color: "#E5431E" };
}

export function walkStubLabelFor(
  showWalk: boolean,
  walk: number | null,
): string {
  if (!showWalk) return "OFF CAMPUS";
  return walk === null ? "LOCATION?" : "MIN WALK";
}

export function walkDetailTextFor(
  showWalk: boolean,
  walk: number | null,
  isPinnable: boolean,
): string {
  if (!showWalk) return "off-campus — no walk";
  if (walk === null) {
    return isPinnable
      ? "walk unknown — pin the location"
      : "walk unknown — location unconfirmed";
  }
  return `${walk} min`;
}

export function worthRank(w: WorthLevel): number {
  if (w === "high") return 0;
  if (w === "maybe") return 1;
  return 2;
}

const FRESHNESS_FULL_MS = 15 * 60 * 1000;
const FRESHNESS_FLOOR_MS = 90 * 60 * 1000;
const FRESHNESS_FLOOR = 0.3;

/**
 * 1 (just confirmed) decaying linearly to a 0.3 floor by 90 minutes old.
 * Unknown age (`confirmedAt` absent) is treated as fully fresh — decay only
 * applies once we actually know how old a confirmation is.
 */
export function freshnessScore(ticket: Ticket, nowMs: number = Date.now()): number {
  if (!ticket.confirmedAt) return 1;
  const ageMs = nowMs - Date.parse(ticket.confirmedAt);
  if (!Number.isFinite(ageMs) || ageMs <= FRESHNESS_FULL_MS) return 1;
  if (ageMs >= FRESHNESS_FLOOR_MS) return FRESHNESS_FLOOR;
  const span = FRESHNESS_FLOOR_MS - FRESHNESS_FULL_MS;
  const progress = (ageMs - FRESHNESS_FULL_MS) / span;
  return 1 - progress * (1 - FRESHNESS_FLOOR);
}

/**
 * `worth` after time-decay: a stale, imminent ("now"/"hour") ticket that was
 * rated "high" slides to "maybe" as its confirmation ages — it never
 * upgrades, and "low"/"today" tickets are left alone (nothing to decay into,
 * or not imminent enough for staleness to matter).
 */
export function decayedWorth(ticket: Ticket, nowMs: number = Date.now()): WorthLevel {
  if (ticket.worth !== "high") return ticket.worth;
  if (ticket.time === "today") return ticket.worth;
  return freshnessScore(ticket, nowMs) < 0.5 ? "maybe" : ticket.worth;
}

const MINUTE_MS = 60 * 1000;

/** "last confirmed X min ago" from `confirmedAt`, or undefined if unknown. */
export function freshnessLabelFor(
  ticket: Ticket,
  nowMs: number = Date.now(),
): string | undefined {
  if (!ticket.confirmedAt) return undefined;
  const ageMs = nowMs - Date.parse(ticket.confirmedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) return undefined;
  const minutes = Math.round(ageMs / MINUTE_MS);
  if (minutes < 1) return "last confirmed just now";
  if (minutes === 1) return "last confirmed 1 min ago";
  return `last confirmed ${minutes} min ago`;
}

/**
 * Trust tier for ranking: confirmed (or absent = human) sorts above unverified
 * (auto-ingested) tickets.
 */
export function trustRank(ticket: Ticket): number {
  return ticket.trust === "unverified" ? 1 : 0;
}

/** Time proximity for ranking: sooner food sorts first (now < hour < today). */
export function timeRank(t: TimeWindow): number {
  if (t === "now") return 0;
  if (t === "hour") return 1;
  return 2;
}

export function effectiveStatus(
  ticket: Ticket,
  overrides: TicketOverrides = {},
): TicketStatus {
  return overrides[ticket.id] ?? ticket.status;
}

/**
 * Reduce live tickets to the slim, answer-relevant shape the assistant model
 * sees as grounding context. Applies crowd overrides so "gone" is reflected.
 */
export function ticketsForAssistant(
  tickets: Ticket[],
  overrides: TicketOverrides = {},
  vantage: CampusArea = "upper",
): AssistantTicketContext[] {
  return tickets.map((ticket) => {
    const showWalk = isOnCampus(ticket);
    const walk = showWalk
      ? computeWalk(areaVantage(vantage), ticket.coords)
      : null;

    return {
      id: ticket.id,
      name: ticket.name,
      source: ticket.source,
      cost: ticket.cost,
      area: ticket.area,
      walk,
      where: whereDisplayFor(ticket),
      ends: ticket.ends,
      access: ticket.access,
      worth: ticket.worth,
      status: effectiveStatus(ticket, overrides),
    };
  });
}

export function filterTickets(
  tickets: Ticket[],
  filters: Filters,
  overrides: TicketOverrides = {},
  vantage: CampusArea = "upper",
  dietaryProfile?: DietaryProfile,
): Ticket[] {
  const list = tickets.filter((ticket) => {
    if (filters.freeOnly && !isFreeCost(ticket.cost)) return false;
    if (filters.time === "now" && ticket.time !== "now") return false;
    if (
      filters.time === "hour" &&
      !(ticket.time === "now" || ticket.time === "hour")
    ) {
      return false;
    }
    if (
      filters.safeForMe &&
      dietaryProfile &&
      dietaryConflicts(ticket, dietaryProfile)
    ) {
      return false;
    }
    return true;
  });

  // Walk is relative to the user's vantage ("I'm near:").
  const vantageCoords = areaVantage(vantage);
  // Unknown-walk (unresolved coords) ranks below any known walk (clamp max 25).
  const walkKey = (ticket: Ticket) =>
    computeWalk(vantageCoords, ticket.coords) ?? 26;

  return list.sort((a, b) => {
    const trustDiff = trustRank(a) - trustRank(b);
    if (trustDiff !== 0) return trustDiff;

    const aGone = effectiveStatus(a, overrides) === "gone" ? 1 : 0;
    const bGone = effectiveStatus(b, overrides) === "gone" ? 1 : 0;
    if (aGone !== bGone) return aGone - bGone;

    const worthDiff = worthRank(decayedWorth(a)) - worthRank(decayedWorth(b));
    if (worthDiff !== 0) return worthDiff;

    const timeDiff = timeRank(a.time) - timeRank(b.time);
    if (timeDiff !== 0) return timeDiff;

    const campusDiff = onCampusRank(a) - onCampusRank(b);
    if (campusDiff !== 0) return campusDiff;

    const walkDiff = walkKey(a) - walkKey(b);
    if (walkDiff !== 0) return walkDiff;

    // Last-resort tiebreak: fresher confirmations sort first.
    return freshnessScore(b) - freshnessScore(a);
  });
}

export function toTicketView(
  ticket: Ticket,
  overrides: TicketOverrides = {},
  confirm: Record<string, TicketConfirmMeta> = {},
  vantage: CampusArea = "upper",
): TicketView {
  const status = effectiveStatus(ticket, overrides);
  const gone = status === "gone";
  const meta = confirm[ticket.id];
  const timeLine = parseTimeLine(ticket.ends, gone);
  const showWalk = isOnCampus(ticket);
  const isPinnable = isPinnableTicket(ticket);
  const whereDisplay = whereDisplayFor(ticket);
  const walk = showWalk
    ? computeWalk(areaVantage(vantage), ticket.coords)
    : null;
  const cost = costDisplayFor(ticket.cost, ticket.sourcePrice);
  const worth = decayedWorth(ticket);

  return {
    ...ticket,
    walk,
    showWalk,
    isPinnable,
    whereDisplay,
    timeLabel: timeLine.label,
    timeText: timeLine.text,
    timeColor: timeLine.color,
    walkStubLabel: walkStubLabelFor(showWalk, walk),
    walkDetailText: walkDetailTextFor(showWalk, walk, isPinnable),
    effectiveStatus: status,
    ends: gone ? "gone" : ticket.ends,
    endsColor: timeLine.color,
    costLabel: cost.label,
    costColor: cost.color,
    worthLabel: WORTH_LABELS[worth],
    worthColor: WORTH_COLORS[worth],
    effectiveWorth: worth,
    statusLabel: STATUS_LABELS[status],
    statusColor: STATUS_COLORS[status],
    confirmCount: meta?.count ?? 3,
    lastChecked: meta?.last ?? "4 min ago",
    freshnessLabel: freshnessLabelFor(ticket),
  };
}

export function inferAreaFromWhere(where: string): CampusArea {
  const lower = where.toLowerCase();
  if (lower.includes("lower")) return "lower";
  return "upper";
}

export function buildQuickAddTicket(input: {
  where: string;
  what: string;
  last: string;
  dietTags?: DietTag[];
  allergens?: Allergen[];
}): CreateTicketInput {
  const dietTags = input.dietTags ?? [];
  const allergens = input.allergens ?? [];
  const hasDietaryInput = dietTags.length > 0 || allergens.length > 0;

  return {
    name: (input.what || "Food").replace(/\b\w/g, (c) => c.toUpperCase()),
    source: "Student report",
    cost: 0,
    area: inferAreaFromWhere(input.where),
    time: "now",
    where: input.where || "On campus",
    ends: input.last || "until gone",
    access: "Open to all",
    worth: "maybe",
    status: "available",
    blurb:
      "Reported by a fellow student just now. Details are fresh but unverified — report back when you get there!",
    dietary: hasDietaryInput
      ? { tags: dietTags, allergens, confidence: 100 }
      : undefined,
  };
}

export function buildTicketFromExtracted(extracted: ExtractedPost): CreateTicketInput {
  const cost =
    typeof extracted.costCents === "number"
      ? Math.round(extracted.costCents / 100)
      : extracted.cost === "Free"
        ? 0
        : parseInt(extracted.cost.replace(/\D/g, ""), 10) || 0;

  return {
    name:
      extracted.food !== "—"
        ? `${extracted.food} — from post`
        : "Event food — from post",
    source: "Pasted post",
    cost,
    area: "upper",
    time: extracted.timeWindow ?? "now",
    where: extracted.location !== "—" ? extracted.location : "See post",
    ends:
      extracted.time !== "—"
        ? `ends ${extracted.time.split("–").pop()}`
        : "see post",
    access: extracted.access !== "—" ? extracted.access : "See post",
    worth: extracted.confidence >= 80 ? "high" : "maybe",
    status: "available",
    blurb: `Auto-read from a pasted event post. Confidence ${extracted.confidence}%. Double-check details when you arrive.`,
    dietary: extracted.dietary,
  };
}

/** Canonical order of extracted fields. */
export const EXTRACT_FIELDS: ExtractField[] = [
  "food",
  "cost",
  "time",
  "location",
  "access",
];

/** Display labels for extracted fields. */
export const EXTRACT_FIELD_LABELS: Record<ExtractField, string> = {
  food: "FOOD",
  cost: "COST",
  time: "TIME",
  location: "LOCATION",
  access: "ACCESS",
};

const CONFIDENCE_WEIGHT: Record<FieldConfidence, number> = {
  high: 1,
  medium: 0.6,
  low: 0.3,
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * Buckets normalized timing into a {@link TimeWindow} for ranking/filtering.
 * `null` (regex fallback / no stated time) defaults to "today".
 */
export function timeWindowFromNormalized(tn: TimeNormalized | null): TimeWindow {
  if (!tn) return "today";
  if (tn.type === "now") return "now";
  if (tn.start) {
    const startMs = Date.parse(tn.start);
    if (!Number.isNaN(startMs)) {
      const diff = startMs - Date.now();
      if (diff <= 0) return "now";
      if (diff <= HOUR_MS) return "hour";
    }
  }
  return "today";
}

/**
 * Bridges an {@link ExtractResult} (LLM or regex) into the legacy
 * {@link ExtractedPost} display shape so `buildTicketFromExtracted` and the
 * existing ticket-print UI keep working unchanged.
 */
export function extractResultToPost(result: ExtractResult): ExtractedPost {
  const { extraction, confidence } = result;
  const sentinel = (value: string | null) =>
    value && value.trim() ? value : "—";

  const costColor =
    extraction.cost && /free/i.test(extraction.cost) ? "#E5431E" : "#1B1712";

  const rawScore = EXTRACT_FIELDS.reduce((sum, field) => {
    if (extraction[field] === null) return sum;
    return sum + CONFIDENCE_WEIGHT[confidence[field] ?? "low"];
  }, 0);
  const confidenceScore = Math.round((rawScore / EXTRACT_FIELDS.length) * 100);

  let confLabel: ExtractedPost["confLabel"] = "LOW";
  let confColor = STATUS_COLORS.gone;
  if (confidenceScore >= 80) {
    confLabel = "HIGH";
    confColor = STATUS_COLORS.available;
  } else if (confidenceScore >= 50) {
    confLabel = "MEDIUM";
    confColor = STATUS_COLORS.maybe;
  }

  const missingLabels = result.missing.map(
    (field) => EXTRACT_FIELD_LABELS[field] ?? field,
  );

  return {
    food: sentinel(extraction.food),
    cost: sentinel(extraction.cost),
    costColor,
    time: sentinel(extraction.time),
    location: sentinel(extraction.location),
    access: sentinel(extraction.access),
    confidence: confidenceScore,
    confLabel,
    confColor,
    missing: missingLabels,
    missingText: missingLabels.join(", "),
    hasMissing: missingLabels.length > 0,
    timeWindow: timeWindowFromNormalized(result.time_normalized),
    costCents: result.cost_cents,
    dietary: result.dietary
      ? {
          tags: result.dietary.tags,
          allergens: result.dietary.allergens,
          confidence: Math.round(
            ((CONFIDENCE_WEIGHT[result.dietary.confidence.tags] +
              CONFIDENCE_WEIGHT[result.dietary.confidence.allergens]) /
              2) *
              100,
          ),
        }
      : undefined,
  };
}

export function extractFromPost(text: string): ExtractedPost {
  const foods = [
    "pizza",
    "bagel",
    "taco",
    "donut",
    "doughnut",
    "sandwich",
    "coffee",
    "snack",
    "burrito",
    "noodle",
    "curry",
    "sushi",
    "cookie",
    "cake",
    "wrap",
    "fruit",
    "salad",
  ];

  let food: string | null = null;
  for (const word of foods) {
    if (new RegExp(`\\b${word}`, "i").test(text)) {
      food = word.charAt(0).toUpperCase() + word.slice(1);
      break;
    }
  }

  let cost: string | null = null;
  let costColor = "#1B1712";
  if (/\bfree\b/i.test(text)) {
    cost = "Free";
    costColor = "#E5431E";
  } else {
    const match = text.match(/\$\s?\d+(\.\d{2})?/);
    if (match) cost = match[0].replace(/\s/, "");
  }

  let time: string | null = null;
  const times = text.match(/\d{1,2}(:\d{2})?\s?(am|pm)/gi);
  if (times) time = times.slice(0, 2).join("–").replace(/\s/g, "");

  let location: string | null = null;
  const roomMatch = text.match(
    /\b(Quad|Room|Rm|Hall|Bldg|Building)\s?#?\d{2,4}\b/i,
  );
  const placeMatch = text.match(
    /\b[A-Z][a-zA-Z]+\s(Hall|Atrium|Lounge|Commons|Union|Library|Center|House|Auditorium|Lawn)\b/,
  );
  if (roomMatch) location = roomMatch[0];
  else if (placeMatch) location = placeMatch[0];

  let access: string | null = null;
  if (/open to all|everyone|all (are )?welcome|no rsvp|first come/i.test(text)) {
    access = "Open to all";
  } else if (/member|rsvp|ticket|attendee|sign ?up|registration/i.test(text)) {
    access = "Members / RSVP";
  }

  const fields = { food, cost, time, location, access };
  const labels: Record<keyof typeof fields, string> = {
    food: "food",
    cost: "cost",
    time: "time",
    location: "location",
    access: "access rule",
  };

  const missing = (Object.keys(fields) as (keyof typeof fields)[])
    .filter((key) => !fields[key])
    .map((key) => labels[key]);

  const found = 5 - missing.length;
  const confidence = Math.round((found / 5) * 100);

  let confLabel: ExtractedPost["confLabel"] = "LOW";
  let confColor = STATUS_COLORS.gone;
  if (confidence >= 80) {
    confLabel = "HIGH";
    confColor = STATUS_COLORS.available;
  } else if (confidence >= 50) {
    confLabel = "MEDIUM";
    confColor = STATUS_COLORS.maybe;
  }

  return {
    food: food ?? "—",
    cost: cost ?? "—",
    costColor,
    time: time ?? "—",
    location: location ?? "—",
    access: access ?? "—",
    confidence,
    confLabel,
    confColor,
    missing,
    missingText: missing.join(", "),
    hasMissing: missing.length > 0,
  };
}

export function generateTicketNumber(): string {
  return String(1000 + Math.floor(Math.random() * 8999));
}

export function createTicketId(prefix: "u" | "p" | "t"): string {
  return `${prefix}${Date.now()}`;
}

/** Seed data copied from the original prototype — backend starts with these. */
export const SEED_TICKETS: Ticket[] = [
  {
    id: "t1",
    no: "1043",
    name: "Free Pizza — Sponsor Night",
    source: "CS Club",
    cost: 0,
    area: "upper",
    time: "now",
    where: "Quadrangle",
    coords: coordsFor("Quadrangle"),
    ends: "ends 2:00pm",
    access: "Open to attendees",
    confirmed: "8 min ago",
    worth: "high",
    status: "available",
    blurb:
      "Sponsor bought 40 pies for the info session. Grab a slice at the back tables — no sign-in checked at the door.",
    createdBy: SEED_AUTHORS.csClub,
  },
  {
    id: "t2",
    no: "0210",
    name: "Bagels & Coffee — Dept Mixer",
    source: "Physics Dept",
    cost: 0,
    area: "upper",
    time: "now",
    where: "Main Library",
    coords: coordsFor("Main Library"),
    ends: "ends 11:30am",
    access: "Open to all",
    confirmed: "2 min ago",
    worth: "high",
    status: "available",
    blurb:
      "Morning mixer spread. Fresh bagels, cream cheese, and a full coffee urn. Closest free food to the main study floors.",
    createdBy: SEED_AUTHORS.physics,
  },
  {
    id: "t7",
    no: "0330",
    name: "Free Snacks — Study Lounge",
    source: "Library Services",
    cost: 0,
    area: "upper",
    time: "now",
    where: "Law Library",
    coords: coordsFor("Law Library"),
    ends: "restocks hourly",
    access: "Open to all",
    confirmed: "12 min ago",
    worth: "high",
    status: "available",
    blurb:
      "Finals-week snack station: granola bars, clementines, pretzels. Restocked on the hour by front-desk staff.",
    createdBy: SEED_AUTHORS.library,
  },
  {
    id: "t3",
    no: "5521",
    name: "$2 Grilled Cheese — Co-op",
    source: "Student Co-op",
    cost: 2,
    area: "lower",
    time: "now",
    where: "Lower Campus Food Court",
    coords: coordsFor("Lower Campus Food Court"),
    ends: "until sold out",
    access: "Cash only",
    confirmed: "20 min ago",
    worth: "maybe",
    status: "available",
    blurb:
      "Co-op fundraiser griddle. Two bucks, cash in the jar. Worth it if you were already headed to Lower Campus.",
    createdBy: SEED_AUTHORS.coop,
  },
  {
    id: "t4",
    no: "7788",
    name: "Leftover Sandwiches — Career Fair",
    source: "Career Center",
    cost: 0,
    area: "upper",
    time: "now",
    where: "Mathews Building",
    coords: coordsFor("Mathews Building"),
    ends: "ends 1:00pm",
    access: "Open to all",
    confirmed: "35 min ago",
    worth: "maybe",
    status: "maybe",
    blurb:
      "Boxed sandwiches left over from the recruiter lunch. Going fast — last confirmed count was about a dozen.",
    createdBy: SEED_AUTHORS.career,
  },
  {
    id: "t6",
    no: "3102",
    name: "$5 Taco Bar — Cultural Night",
    source: "Latin Student Union",
    cost: 5,
    area: "lower",
    time: "today",
    where: "Roundhouse",
    coords: coordsFor("Roundhouse"),
    ends: "starts 6:00pm",
    access: "Ticketed at door",
    confirmed: "1 hr ago",
    worth: "maybe",
    status: "available",
    blurb:
      "Full taco bar tonight. Five dollars gets you a plate and a drink. Long walk, but a real meal — not just snacks.",
    createdBy: SEED_AUTHORS.lsu,
  },
  {
    id: "t5",
    no: "9014",
    name: "Free Donuts — Frat Tabling",
    source: "Sigma Chi",
    cost: 0,
    area: "upper",
    time: "now",
    where: "Village Green",
    coords: coordsFor("Village Green"),
    ends: "gone",
    access: "Open to all",
    confirmed: "1 min ago",
    worth: "low",
    status: "gone",
    blurb:
      "Tabling giveaway that just wrapped. Box was reported empty a minute ago — skip it unless you are already passing by.",
    createdBy: SEED_AUTHORS.sigma,
  },
];

export type { TimeWindow };
