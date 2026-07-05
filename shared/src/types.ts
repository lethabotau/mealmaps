/** Geographic zones on campus used for filtering. */
export type CampusArea = "quad" | "library" | "lower";

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

export interface Ticket {
  id: string;
  no: string;
  name: string;
  /** Origin of the ticket, e.g. a society name, "Pasted post", or "auto". */
  source: string;
  cost: number;
  area: CampusArea;
  time: TimeWindow;
  walk: number;
  where: string;
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
  budget: "free" | "u5" | "u10";
  time: "now" | "hour" | "today";
  area: CampusArea | "anywhere";
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
  walk?: number;
  where: string;
  ends: string;
  access: string;
  worth?: WorthLevel;
  status?: TicketStatus;
  blurb: string;
}

export interface TicketView extends Ticket {
  costLabel: string;
  costColor: string;
  worthLabel: string;
  worthColor: string;
  statusLabel: string;
  statusColor: string;
  endsColor: string;
  confirmCount: number;
  lastChecked: string;
  effectiveStatus: TicketStatus;
}

export interface RankedTicketView extends TicketView {
  rank: number;
}
