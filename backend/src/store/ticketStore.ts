import type {
  CreateTicketInput,
  ReportKind,
  ReportRecord,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
  TimeWindow,
  UserIdentity,
  WorthLevel,
} from "@mealmap/shared";
import {
  SEED_TICKETS,
  SYSTEM_INGEST_USER,
  createTicketId,
  generateTicketNumber,
  resolveLocation,
} from "@mealmap/shared";

export { SYSTEM_INGEST_USER };

interface StoreState {
  tickets: Ticket[];
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
  reports: ReportRecord[];
}

const state: StoreState = {
  tickets: structuredClone(SEED_TICKETS),
  overrides: {},
  confirm: {},
  reports: [],
};

/** External event ids already ingested, for cross-run dedupe within a process. */
const ingestedEventIds = new Set<string>();

export function listTickets(): Ticket[] {
  return [...state.tickets];
}

export function getTicket(id: string): Ticket | undefined {
  return state.tickets.find((ticket) => ticket.id === id);
}

export function listReports(): ReportRecord[] {
  return [...state.reports];
}

export function createTicket(
  input: CreateTicketInput,
  createdBy: UserIdentity,
): Ticket {
  const ticket: Ticket = {
    id: createTicketId("u"),
    no: generateTicketNumber(),
    name: input.name,
    source: input.source,
    cost: input.cost,
    area: input.area,
    time: input.time ?? "now",
    where: input.where,
    coords: resolveLocation(input.where)?.coords ?? null,
    ends: input.ends,
    access: input.access,
    confirmed: "just now",
    worth: input.worth ?? "maybe",
    status: input.status ?? "available",
    blurb: input.blurb,
    createdBy,
  };

  state.tickets.unshift(ticket);
  return ticket;
}

/** True once at least one auto-ingested ticket exists (used to gate boot ingest). */
export function hasAutoTickets(): boolean {
  return state.tickets.some(
    (ticket) => ticket.createdBy.userId === SYSTEM_INGEST_USER.userId,
  );
}

export interface AutoTicketInput {
  eventId: string;
  name: string;
  /** Origin society, surfaced as "via MealMap Auto · <society>". */
  society: string;
  cost: number;
  time: TimeWindow;
  /** Intra-tier ranking hint derived from food likelihood (high vs maybe). */
  worth: WorthLevel;
  ends: string;
  sourceUrl: string;
  blurb: string;
}

/**
 * Inserts an auto-ingested ticket in the `unverified` trust tier so it ranks
 * below every human (confirmed) ticket regardless of worth. `source` carries the
 * society name for display; `createdBy` marks it as system-ingested.
 * Dedupes by external `eventId`; returns `inserted: false` if already ingested.
 */
export function insertAutoTicket(
  input: AutoTicketInput,
): { inserted: boolean; ticket?: Ticket } {
  if (input.eventId && ingestedEventIds.has(input.eventId)) {
    return { inserted: false };
  }

  const id = input.eventId ? `auto-${input.eventId}` : createTicketId("t");
  const ticket: Ticket = {
    id,
    no: generateTicketNumber(),
    name: input.name,
    source: input.society || "UNSW society",
    cost: input.cost,
    area: "quad",
    time: input.time,
    where: "location unconfirmed",
    coords: null,
    ends: input.ends,
    access: "check event page",
    confirmed: "not yet confirmed",
    worth: input.worth,
    status: "available",
    blurb: input.blurb,
    createdBy: SYSTEM_INGEST_USER,
    sourceUrl: input.sourceUrl,
    trust: "unverified",
  };

  state.tickets.push(ticket);
  state.confirm[id] = { count: 0, last: "not yet confirmed" };
  if (input.eventId) ingestedEventIds.add(input.eventId);

  return { inserted: true, ticket };
}

export function getOverrides(): TicketOverrides {
  return { ...state.overrides };
}

export function getConfirmMeta(): Record<string, TicketConfirmMeta> {
  return { ...state.confirm };
}

export function applyReport(
  id: string,
  kind: ReportKind,
  reportedBy: UserIdentity,
  locationText?: string,
): ReportRecord {
  const current = state.confirm[id] ?? { count: 3, last: "4 min ago" };
  const record: ReportRecord = {
    id: `r${Date.now()}`,
    ticketId: id,
    kind,
    reportedBy,
    createdAt: new Date().toISOString(),
  };

  state.reports.unshift(record);

  if (kind === "still") {
    const ticket = state.tickets.find((t) => t.id === id);
    if (ticket) {
      if (ticket.trust === "unverified") {
        ticket.trust = "confirmed";
      }
      // Crowd location pinning: a "still available" report can carry an optional
      // "where exactly?" note. Only touch coords/where when they're still unknown.
      if (!ticket.coords) {
        const pin = locationText?.trim();
        if (pin) {
          const resolved = resolveLocation(pin);
          if (resolved) {
            ticket.coords = resolved.coords;
            ticket.where = resolved.name;
          } else {
            // No match — still better than "location unconfirmed"; coords stay null.
            ticket.where = pin;
          }
        } else {
          // No note given: try to pin from the existing where-text if it matches.
          const resolved = resolveLocation(ticket.where);
          if (resolved) ticket.coords = resolved.coords;
        }
      }
    }
    state.confirm[id] = {
      count: current.count + 1,
      last: "just now",
      lastReportedBy: reportedBy,
    };
  } else if (kind === "gone") {
    state.overrides[id] = "gone";
    state.confirm[id] = {
      ...current,
      last: "just now",
      lastReportedBy: reportedBy,
    };
  } else if (kind === "all") {
    state.overrides[id] = "available";
    state.confirm[id] = {
      ...current,
      last: "just now",
      lastReportedBy: reportedBy,
    };
  } else {
    state.confirm[id] = {
      ...current,
      last: "just now",
      lastReportedBy: reportedBy,
    };
  }

  return record;
}

/** Reset store — used in tests only. */
export function resetStore(): void {
  state.tickets = structuredClone(SEED_TICKETS);
  state.overrides = {};
  state.confirm = {};
  state.reports = [];
  ingestedEventIds.clear();
}
