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
import {
  StorePersistence,
  loadSnapshot,
  resolveDataFile,
  snapshotFromState,
  type StoreSnapshot,
} from "./storePersistence.js";

export { SYSTEM_INGEST_USER };

interface StoreState {
  tickets: Ticket[];
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
  reports: ReportRecord[];
}

const state: StoreState = {
  tickets: [],
  overrides: {},
  confirm: {},
  reports: [],
};

/** External event ids already ingested, for cross-run dedupe. */
const ingestedEventIds = new Set<string>();

let persistence = new StorePersistence(null);
let initialized = false;

function seedOnBootEnabled(): boolean {
  return process.env.SEED_ON_BOOT === "true";
}

function applySnapshot(snapshot: StoreSnapshot): void {
  state.tickets = structuredClone(snapshot.tickets);
  state.overrides = structuredClone(snapshot.overrides);
  state.confirm = structuredClone(snapshot.confirm);
  state.reports = structuredClone(snapshot.reports);
  ingestedEventIds.clear();
  for (const id of snapshot.ingestedEventIds) {
    ingestedEventIds.add(id);
  }
}

function freshState(useSeeds: boolean): void {
  state.tickets = useSeeds ? structuredClone(SEED_TICKETS) : [];
  state.overrides = {};
  state.confirm = {};
  state.reports = [];
  ingestedEventIds.clear();
}

function currentSnapshot(): StoreSnapshot {
  return snapshotFromState(state, ingestedEventIds);
}

function markDirty(): void {
  persistence.schedule(currentSnapshot());
}

/**
 * Load persisted state from disk on boot, or start fresh.
 * Seeds are applied only on a fresh start when SEED_ON_BOOT=true (default off).
 */
export function initStore(options?: { force?: boolean }): void {
  if (initialized && !options?.force) return;
  initialized = true;

  const filePath = resolveDataFile();
  persistence = new StorePersistence(filePath);

  if (filePath) {
    const result = loadSnapshot(filePath);
    if (result.ok) {
      applySnapshot(result.snapshot);
      console.log(
        `[store] loaded ${state.tickets.length} tickets from ${filePath}`,
      );
      return;
    }

    console.warn(
      `[store] could not load ${filePath} (${result.reason}) — starting fresh`,
    );
  }

  freshState(seedOnBootEnabled());
  if (seedOnBootEnabled()) {
    console.log(`[store] seeded ${state.tickets.length} tickets (SEED_ON_BOOT=true)`);
  }
}

export function flushPersist(): void {
  persistence.flush();
}

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
  markDirty();
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
  markDirty();

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
      if (!ticket.coords) {
        const pin = locationText?.trim();
        if (pin) {
          const resolved = resolveLocation(pin);
          if (resolved) {
            ticket.coords = resolved.coords;
            ticket.where = resolved.name;
          } else {
            ticket.where = pin;
          }
        } else {
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

  markDirty();
  return record;
}

/** Reset store — used in tests only. */
export function resetStore(options?: { seed?: boolean }): void {
  persistence.cancel();
  freshState(options?.seed ?? seedOnBootEnabled());
}
