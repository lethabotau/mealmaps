import type {
  CreateTicketInput,
  ReportKind,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
} from "@mealmap/shared";
import {
  SEED_TICKETS,
  createTicketId,
  generateTicketNumber,
} from "@mealmap/shared";

interface StoreState {
  tickets: Ticket[];
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
}

const state: StoreState = {
  tickets: structuredClone(SEED_TICKETS),
  overrides: {},
  confirm: {},
};

export function listTickets(): Ticket[] {
  return [...state.tickets];
}

export function getTicket(id: string): Ticket | undefined {
  return state.tickets.find((ticket) => ticket.id === id);
}

export function createTicket(input: CreateTicketInput): Ticket {
  const ticket: Ticket = {
    id: createTicketId("u"),
    no: generateTicketNumber(),
    name: input.name,
    source: input.source,
    cost: input.cost,
    area: input.area,
    time: input.time ?? "now",
    walk: input.walk ?? 5,
    where: input.where,
    ends: input.ends,
    access: input.access,
    confirmed: "just now",
    worth: input.worth ?? "maybe",
    status: input.status ?? "available",
    blurb: input.blurb,
  };

  state.tickets.unshift(ticket);
  return ticket;
}

export function getOverrides(): TicketOverrides {
  return { ...state.overrides };
}

export function getConfirmMeta(): Record<string, TicketConfirmMeta> {
  return { ...state.confirm };
}

export function applyReport(id: string, kind: ReportKind): void {
  const current = state.confirm[id] ?? { count: 3, last: "4 min ago" };

  if (kind === "still") {
    state.confirm[id] = { count: current.count + 1, last: "just now" };
    return;
  }

  if (kind === "gone") {
    state.overrides[id] = "gone";
    state.confirm[id] = { ...current, last: "just now" };
    return;
  }

  if (kind === "all") {
    state.overrides[id] = "available";
    state.confirm[id] = { ...current, last: "just now" };
    return;
  }

  state.confirm[id] = { ...current, last: "just now" };
}

/** Reset store — used in tests only. */
export function resetStore(): void {
  state.tickets = structuredClone(SEED_TICKETS);
  state.overrides = {};
  state.confirm = {};
}
