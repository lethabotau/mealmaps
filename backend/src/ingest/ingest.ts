import type { Ticket, TimeWindow, WorthLevel } from "@mealmap/shared";
import { timeWindowFromNormalized } from "@mealmap/shared";
import { insertAutoTicket } from "../store/ticketStore.js";
import { classifyEvents, type KeptLikelihood } from "./classifyEvents.js";
import { fetchEvents, type SocietyEvent } from "./fetchEvents.js";

const TIME_ZONE = "Australia/Sydney";

export interface IngestSummary {
  fetched: number;
  classified: number;
  inserted: number;
  insertedTickets: Ticket[];
}

/** High food-likelihood ranks above medium within the unverified tier. */
function worthFromLikelihood(likelihood: KeptLikelihood): WorthLevel {
  return likelihood === "high" ? "high" : "maybe";
}

function priceToCost(price: string): number {
  if (!price || /free/i.test(price)) return 0;
  const match = price.match(/\$\s?(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function timeWindowFromIso(iso: string): TimeWindow {
  return timeWindowFromNormalized({ type: "specific", start: iso, confidence: "low" });
}

function formatStart(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "see event page";
  try {
    const label = new Intl.DateTimeFormat("en-AU", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: TIME_ZONE,
    }).format(date);
    return `starts ${label}`;
  } catch {
    return "see event page";
  }
}

function buildBlurb(event: SocietyEvent, likelihood: string, reason: string): string {
  const society = event.society_name || "a UNSW society";
  const category = event.event_type || event.location || "event";
  const detail = reason ? ` — ${reason}` : "";
  return `Auto-added from ${society} (${category}). Location unconfirmed — check the event page. Food likelihood: ${likelihood}${detail}.`;
}

/**
 * Full pipeline: one Algolia query -> LLM food classification -> low-trust
 * auto tickets. Deduped by event_id. Returns a summary and the new tickets.
 */
export async function runIngest(): Promise<IngestSummary> {
  const events = await fetchEvents();
  const classified = await classifyEvents(events);

  const insertedTickets: Ticket[] = [];
  for (const { event, food_likelihood, reason } of classified) {
    const { inserted, ticket } = insertAutoTicket({
      eventId: event.event_id || event.objectID,
      name: event.event_name || "Society event",
      society: event.society_name || "UNSW society",
      cost: priceToCost(event.price),
      time: timeWindowFromIso(event.starts_at_iso),
      worth: worthFromLikelihood(food_likelihood),
      ends: formatStart(event.starts_at_iso),
      sourceUrl: event.source_url,
      blurb: buildBlurb(event, food_likelihood, reason),
    });
    if (inserted && ticket) insertedTickets.push(ticket);
  }

  const summary: IngestSummary = {
    fetched: events.length,
    classified: classified.length,
    inserted: insertedTickets.length,
    insertedTickets,
  };

  console.log(
    `[ingest] fetched ${summary.fetched}, classified ${summary.classified} food-likely, inserted ${summary.inserted} new`,
  );

  return summary;
}
