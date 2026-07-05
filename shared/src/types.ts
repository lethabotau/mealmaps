/** Geographic zones on campus used for filtering. */
export type CampusArea = "quad" | "library" | "lower";

/** When the food is available relative to now. */
export type TimeWindow = "now" | "hour" | "today";

/** Crowd-sourced availability signal. */
export type TicketStatus = "available" | "maybe" | "gone";

/** How worth-it the walk is, based on cost, distance, and freshness. */
export type WorthLevel = "high" | "maybe" | "low";

export interface UserIdentity {
  userId: string;
  displayName: string;
}

export interface Ticket {
  id: string;
  no: string;
  name: string;
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

export type Screen = "dashboard" | "results" | "paste" | "assistant";

/** A user's spoken/typed question for the food assistant. */
export interface AssistantRequest {
  question: string;
}

/** The assistant's grounded answer plus the tickets it relied on. */
export interface AssistantResponse {
  answer: string;
  citedTicketIds: string[];
}

/** Slim ticket shape sent to the model as grounding context. */
export interface AssistantTicketContext {
  id: string;
  name: string;
  source: string;
  cost: number;
  area: CampusArea;
  walk: number;
  where: string;
  ends: string;
  access: string;
  worth: WorthLevel;
  status: TicketStatus;
}

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
