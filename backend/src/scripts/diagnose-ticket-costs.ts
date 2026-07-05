/**
 * Log stored ticket costs alongside source price strings for free-only debugging.
 * Usage: npm run build -w backend && node dist/scripts/diagnose-ticket-costs.js
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  filterTickets,
  isFreeCost,
  parseEventPriceToCost,
  toTicketView,
  DEFAULT_FILTERS,
} from "@mealmap/shared";
import type { Ticket } from "@mealmap/shared";
import { fetchEvents } from "../ingest/fetchEvents.js";

const dataFile = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../data/store.json",
);

async function main(): Promise<void> {
  const snapshot = JSON.parse(readFileSync(dataFile, "utf8")) as {
    tickets: Ticket[];
  };
  const tickets = snapshot.tickets;

  let eventsById = new Map<string, string>();
  try {
    const events = await fetchEvents();
    eventsById = new Map(events.map((event) => [event.event_id, event.price]));
  } catch (error) {
    console.warn("[diagnose] Algolia fetch skipped:", (error as Error).message);
  }

  console.log("\n=== TICKET COST AUDIT ===\n");
  for (const ticket of tickets) {
    const eventId = ticket.id.startsWith("auto-")
      ? ticket.id.slice("auto-".length)
      : null;
    const algoliaPrice =
      ticket.sourcePrice ??
      (eventId ? eventsById.get(eventId) : undefined) ??
      "(none)";
    const mapped = parseEventPriceToCost(
      typeof algoliaPrice === "string" ? algoliaPrice : undefined,
    );

    console.log({
      id: ticket.id,
      name: ticket.name,
      storedCost: ticket.cost,
      costType: typeof ticket.cost,
      sourcePrice: algoliaPrice,
      mappedCost: mapped,
      isFreeCost: isFreeCost(ticket.cost),
      costLabel: toTicketView(ticket).costLabel,
      mismatch: mapped !== normalizeStored(ticket.cost),
    });
  }

  const freeOnly = filterTickets(tickets, {
    ...DEFAULT_FILTERS,
    freeOnly: true,
  });
  console.log("\n=== FREE-ONLY VIEW ===");
  console.log(
    freeOnly.map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      cost: ticket.cost,
      costLabel: toTicketView(ticket).costLabel,
    })),
  );
}

function normalizeStored(cost: unknown): number {
  if (cost === null || cost === undefined || cost === "") return 0;
  const n = typeof cost === "number" ? cost : Number(cost);
  return Number.isNaN(n) ? 0 : Math.floor(n);
}

void main();
