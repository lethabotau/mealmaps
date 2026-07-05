import type {
  CreateTicketInput,
  ExtractResult,
  ReportKind,
  ReportRecord,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
} from "@mealmap/shared";
import { authHeadersForPost } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Error carrying the HTTP status and backend error code (e.g. "auth_required"). */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** True for backend auth failures (missing/invalid/unverifiable session token). */
export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.code === "auth_required");
}

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
    const code = typeof body.error === "string" ? body.error : undefined;
    throw new ApiError(res.status, code, code ?? `Request failed (${res.status})`);
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
  locationText?: string,
): Promise<{
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
  report: ReportRecord;
  ticket: Ticket;
}> {
  return request(`/api/tickets/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ kind, locationText }),
  });
}

export function extractPost(text: string): Promise<ExtractResult> {
  return request<ExtractResult>("/api/extract", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function checkHealth(): Promise<{ ok: boolean }> {
  return request("/health");
}
