/** Geographic zones on campus used for filtering and walk vantage. */
export type CampusArea = "upper" | "lower";

/** Legacy ticket areas from before upper/lower consolidation. */
export type LegacyCampusArea = "quad" | "library" | "lower";

/** When the food is available relative to now. */
export type TimeWindow = "now" | "hour" | "today";

/** Crowd-sourced availability signal. */
export type TicketStatus = "available" | "maybe" | "gone";

/** How worth-it the walk is, based on cost, distance, and freshness. */
export type WorthLevel = "high" | "maybe" | "low";

/**
 * Verification tier. `unverified` = machine-ingested, not yet crowd-checked;
 * `confirmed` = human-authored or crowd-verified. Absent trust is treated as
 * `confirmed` so existing human tickets rank and label unchanged.
 */
export type TrustTier = "unverified" | "confirmed";

export interface UserIdentity {
  userId: string;
  displayName: string;
}

/** Approximate geographic coordinates (WGS84). */
export interface Coords {
  lat: number;
  lng: number;
}

export interface Ticket {
  id: string;
  no: string;
  name: string;
  /** Origin of the ticket, e.g. a society name, "Pasted post", or "auto". */
  source: string;
  cost: number;
  /** Raw price text from auto-ingest (Algolia). Used for COST range labels. */
  sourcePrice?: string;
  area: CampusArea;
  time: TimeWindow;
  /** Display location name (the "locationName"), e.g. "Main Library". */
  where: string;
  /**
   * Approximate coords of `where`, resolved via the campus geo table on create.
   * `null`/absent when the location text didn't match (walk shows as unknown).
   */
  coords?: Coords | null;
  ends: string;
  access: string;
  confirmed: string;
  worth: WorthLevel;
  status: TicketStatus;
  blurb: string;
  createdBy: UserIdentity;
  /** External link for auto-ingested tickets (society event page). */
  sourceUrl?: string;
  /**
   * Verification tier. Absent means `confirmed` (human tickets). Auto-ingested
   * tickets start `unverified` and flip to `confirmed` on a crowd "still" report.
   */
  trust?: TrustTier;
  /**
   * Whether the event is on UNSW campus. `false` for off-campus events (no walk,
   * no pin prompt). Absent means on-campus (human tickets and legacy autos).
   */
  onCampus?: boolean;
  /** Auto-ingest classifier tier — stored for deck/Q&A, not shown in UI. */
  foodLikelihood?: "high" | "medium";
  /** Auto-ingest classifier reason — stored for deck/Q&A, not shown in UI. */
  classifyReason?: string;
}

export interface TicketConfirmMeta {
  count: number;
  last: string;
  lastReportedBy?: UserIdentity;
}

export type ReportKind = "still" | "gone" | "queue" | "members" | "all";

export interface ReportRecord {
  id: string;
  ticketId: string;
  kind: ReportKind;
  reportedBy: UserIdentity;
  createdAt: string;
}

export interface TicketOverrides {
  [ticketId: string]: TicketStatus | undefined;
}

export interface Filters {
  /** When true, only show tickets with cost === 0. */
  freeOnly: boolean;
  time: "now" | "hour" | "today";
}

export type Screen = "dashboard" | "results" | "paste";

export interface ExtractedPost {
  food: string;
  cost: string;
  costColor: string;
  time: string;
  location: string;
  access: string;
  confidence: number;
  confLabel: "LOW" | "MEDIUM" | "HIGH";
  confColor: string;
  missing: string[];
  missingText: string;
  hasMissing: boolean;
  /** Normalized timing carried through to the created ticket's TimeWindow. */
  timeWindow?: TimeWindow;
  /** Normalized cost in integer cents, carried through to ticket cost. */
  costCents?: number | null;
}

/** Fields extracted from a pasted event post. */
export type ExtractField = "food" | "cost" | "time" | "location" | "access";

/** Per-field extraction confidence. */
export type FieldConfidence = "high" | "medium" | "low";

/**
 * Model's structured interpretation of when the event happens.
 * `start` is an ISO 8601 datetime for resolved specific times, else null.
 * Resolved (interpreted) values are capped at "medium" confidence.
 */
export interface TimeNormalized {
  type: "now" | "today" | "specific";
  start: string | null;
  confidence: FieldConfidence;
}

/**
 * Result of extracting structured food-event data from a pasted post.
 * Shared shape returned by `POST /api/extract` and consumed by the paste screen.
 * `source` distinguishes an LLM read from the regex fallback.
 */
export interface ExtractResult {
  extraction: Record<ExtractField, string | null>;
  confidence: Record<ExtractField, FieldConfidence>;
  /** Normalized timing. `null` when no time is stated or on regex fallback. */
  time_normalized: TimeNormalized | null;
  /** Normalized cost in integer cents. `null` when unstated or on regex fallback. */
  cost_cents: number | null;
  missing: ExtractField[];
  plausible: boolean;
  plausibility_reason: string;
  source: "llm" | "regex";
}

export interface CreateTicketInput {
  name: string;
  source: string;
  cost: number;
  area: CampusArea;
  time?: TimeWindow;
  where: string;
  ends: string;
  access: string;
  worth?: WorthLevel;
  status?: TicketStatus;
  blurb: string;
}

export interface TicketView extends Ticket {
  /** Walk minutes from the current vantage, or `null` when coords are unknown. */
  walk: number | null;
  /** Card/detail label for the time row (`WHEN` for start times, `ENDS` for end/duration). */
  timeLabel: "WHEN" | "ENDS";
  /** Time row text (prefix stripped from stored `ends` when applicable). */
  timeText: string;
  timeColor: string;
  /** User-facing location line (may differ from stored `where`). */
  whereDisplay: string;
  /** On-campus ticket with no coords — crowd can pin the location. */
  isPinnable: boolean;
  /** When false (off-campus), walk is hidden and pin prompt is suppressed. */
  showWalk: boolean;
  /** Short label under the walk number on ticket cards. */
  walkStubLabel: string;
  /** Full walk line for the detail panel. */
  walkDetailText: string;
  costLabel: string;
  costColor: string;
  worthLabel: string;
  worthColor: string;
  statusLabel: string;
  statusColor: string;
  /** @deprecated Use timeColor */
  endsColor: string;
  confirmCount: number;
  lastChecked: string;
  effectiveStatus: TicketStatus;
}

export interface RankedTicketView extends TicketView {
  rank: number;
}
