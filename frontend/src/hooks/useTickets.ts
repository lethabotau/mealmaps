import { useCallback, useEffect, useState } from "react";
import type {
  CreateTicketInput,
  ReportKind,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
} from "@mealmap/shared";
import { createTicket, fetchTickets, reportTicket } from "../api/client";

interface UseTicketsState {
  tickets: Ticket[];
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
  loading: boolean;
  error: string | null;
}

export function useTickets() {
  const [state, setState] = useState<UseTicketsState>({
    tickets: [],
    overrides: {},
    confirm: {},
    loading: true,
    error: null,
  });

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }
    try {
      const data = await fetchTickets();
      setState({
        tickets: data.tickets,
        overrides: data.overrides,
        confirm: data.confirm,
        loading: false,
        error: null,
      });
    } catch (err) {
      // A silent (background) refresh should never clobber a working view with
      // an error screen — only surface load errors from the initial fetch.
      if (silent) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load tickets",
      }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Boot ingest runs asynchronously (~20-30s) after the server starts listening,
  // so the first fetch can precede it. Refresh once shortly after mount, and
  // whenever the tab regains focus, to pick up auto tickets without a manual reload.
  useEffect(() => {
    const timer = window.setTimeout(() => void reload({ silent: true }), 20_000);
    const onFocus = () => void reload({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload]);

  const addTicket = useCallback(async (input: CreateTicketInput) => {
    const { ticket } = await createTicket(input);
    setState((prev) => ({
      ...prev,
      tickets: [ticket, ...prev.tickets],
    }));
    return ticket;
  }, []);

  const submitReport = useCallback(
    async (id: string, kind: ReportKind, locationText?: string) => {
      const data = await reportTicket(id, kind, locationText);
      setState((prev) => ({
        ...prev,
        tickets: data.ticket
          ? prev.tickets.map((t) => (t.id === data.ticket.id ? data.ticket : t))
          : prev.tickets.filter((t) => t.id !== id),
        overrides: data.overrides,
        confirm: data.confirm,
      }));
      return data;
    },
    [],
  );

  return {
    ...state,
    reload,
    addTicket,
    submitReport,
  };
}
