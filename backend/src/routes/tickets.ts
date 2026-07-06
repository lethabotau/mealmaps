import type { CreateTicketInput, ReportKind } from "@mealmap/shared";
import { normalizeTicketCost } from "@mealmap/shared";
import { Router } from "express";
import {
  clerkAuthMiddleware,
  requireWriteAuth,
  resolveAuthUser,
} from "../auth/clerk.js";
import {
  applyReport,
  createTicket,
  getConfirmMeta,
  getOverrides,
  getTicket,
  listReports,
  listTickets,
} from "../store/ticketStore.js";

export const ticketsRouter = Router();

ticketsRouter.get("/", (_req, res) => {
  res.json({
    tickets: listTickets(),
    overrides: getOverrides(),
    confirm: getConfirmMeta(),
    reports: listReports(),
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
    reports: listReports().filter((r) => r.ticketId === ticket.id),
  });
});

ticketsRouter.post("/", clerkAuthMiddleware, requireWriteAuth, async (req, res) => {
  const body = req.body as Partial<CreateTicketInput> & {
    createdBy?: unknown;
  };

  if (!body.name || !body.where || !body.ends || !body.access || !body.blurb) {
    res.status(400).json({
      error: "Missing required fields: name, where, ends, access, blurb",
    });
    return;
  }

  const createdBy = await resolveAuthUser(req);

  const ticket = createTicket(
    {
      name: body.name,
      source: body.source ?? "Student report",
      cost: normalizeTicketCost(body.cost ?? 0),
      area: body.area ?? "upper",
      time: body.time,
      where: body.where,
      ends: body.ends,
      access: body.access,
      worth: body.worth,
      status: body.status,
      blurb: body.blurb,
    },
    createdBy,
  );

  res.status(201).json({ ticket });
});

ticketsRouter.post(
  "/:id/report",
  clerkAuthMiddleware,
  requireWriteAuth,
  async (req, res) => {
    const ticketId = req.params.id;
    if (!ticketId || Array.isArray(ticketId)) {
      res.status(400).json({ error: "Invalid ticket id" });
      return;
    }

    const ticket = getTicket(ticketId);
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const kind = req.body?.kind as ReportKind | undefined;
    const allowed: ReportKind[] = [
      "still",
      "gone",
      "queue",
      "members",
      "all",
      "food_yes",
      "food_no",
    ];
    if (!kind || !allowed.includes(kind)) {
      res.status(400).json({ error: "Invalid report kind" });
      return;
    }

    const locationText =
      typeof req.body?.locationText === "string"
        ? req.body.locationText
        : undefined;

    const reportedBy = await resolveAuthUser(req);
    const report = applyReport(ticket.id, kind, reportedBy, locationText);

    res.json({
      overrides: getOverrides(),
      confirm: getConfirmMeta(),
      report,
      ticket: getTicket(ticket.id) ?? null,
    });
  },
);
