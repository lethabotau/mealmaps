import type {
  CreateTicketInput,
  ReportKind,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
} from "@mealmap/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface TicketsPayload {
  tickets: Ticket[];
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export function fetchTickets(): Promise<TicketsPayload> {
  return request<TicketsPayload>("/api/tickets");
}

export function createTicket(input: CreateTicketInput): Promise<{ ticket: Ticket }> {
  return request("/api/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function reportTicket(
  id: string,
  kind: ReportKind,
): Promise<{ overrides: TicketOverrides; confirm: Record<string, TicketConfirmMeta> }> {
  return request(`/api/tickets/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}

export function checkHealth(): Promise<{ ok: boolean }> {
  return request("/health");
}
