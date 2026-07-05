import type {
  AssistantResponse,
  CreateTicketInput,
  ReportKind,
  ReportRecord,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
} from "@mealmap/shared";
import { authHeadersForPost } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface TicketsPayload {
  tickets: Ticket[];
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
  reports: ReportRecord[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (method === "POST") {
    Object.assign(headers, await authHeadersForPost());
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
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

export function createTicket(
  input: CreateTicketInput,
): Promise<{ ticket: Ticket }> {
  return request("/api/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function reportTicket(
  id: string,
  kind: ReportKind,
): Promise<{
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
  report: ReportRecord;
}> {
  return request(`/api/tickets/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}

export function askAssistant(question: string): Promise<AssistantResponse> {
  return request<AssistantResponse>("/api/assistant", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function checkHealth(): Promise<{ ok: boolean }> {
  return request("/health");
}
