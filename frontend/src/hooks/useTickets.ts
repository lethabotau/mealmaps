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

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
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

  const addTicket = useCallback(async (input: CreateTicketInput) => {
    const { ticket } = await createTicket(input);
    setState((prev) => ({
      ...prev,
      tickets: [ticket, ...prev.tickets],
    }));
    return ticket;
  }, []);

  const submitReport = useCallback(async (id: string, kind: ReportKind) => {
    const data = await reportTicket(id, kind);
    setState((prev) => ({
      ...prev,
      overrides: data.overrides,
      confirm: data.confirm,
    }));
    return data;
  }, []);

  return {
    ...state,
    reload,
    addTicket,
    submitReport,
  };
}
