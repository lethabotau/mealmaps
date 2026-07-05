import type { CreateTicketInput, ReportKind } from "@mealmap/shared";
import { Router } from "express";
import {
  applyReport,
  createTicket,
  getConfirmMeta,
  getOverrides,
  getTicket,
  listTickets,
} from "../store/ticketStore.js";

export const ticketsRouter = Router();

ticketsRouter.get("/", (_req, res) => {
  res.json({
    tickets: listTickets(),
    overrides: getOverrides(),
    confirm: getConfirmMeta(),
  });
});

ticketsRouter.get("/:id", (req, res) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json({
    ticket,
    overrides: getOverrides(),
    confirm: getConfirmMeta(),
  });
});

ticketsRouter.post("/", (req, res) => {
  const body = req.body as Partial<CreateTicketInput>;

  if (!body.name || !body.where || !body.ends || !body.access || !body.blurb) {
    res.status(400).json({
      error: "Missing required fields: name, where, ends, access, blurb",
    });
    return;
  }

  const ticket = createTicket({
    name: body.name,
    source: body.source ?? "Student report",
    cost: body.cost ?? 0,
    area: body.area ?? "quad",
    time: body.time,
    walk: body.walk,
    where: body.where,
    ends: body.ends,
    access: body.access,
    worth: body.worth,
    status: body.status,
    blurb: body.blurb,
  });

  res.status(201).json({ ticket });
});

ticketsRouter.post("/:id/report", (req, res) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const kind = req.body?.kind as ReportKind | undefined;
  const allowed: ReportKind[] = ["still", "gone", "queue", "members", "all"];
  if (!kind || !allowed.includes(kind)) {
    res.status(400).json({ error: "Invalid report kind" });
    return;
  }

  applyReport(ticket.id, kind);
  res.json({
    overrides: getOverrides(),
    confirm: getConfirmMeta(),
  });
});
