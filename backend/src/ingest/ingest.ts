import type { Ticket, TimeWindow, WorthLevel } from "@mealmap/shared";
import {
  parseEventPriceToCost,
  timeWindowFromNormalized,
  timeWindowFromStartMs,
} from "@mealmap/shared";
import { insertAutoTicket } from "../store/ticketStore.js";
import type { ClassifiedEvent, ClassificationReport, KeptLikelihood, PossibleEvent } from "./classifyEvents.js";
import { classifyEventsWithReport } from "./classifyEvents.js";
import { fetchEvents, type SocietyEvent } from "./fetchEvents.js";

const TIME_ZONE = "Australia/Sydney";

export interface IngestSummary {
  fetched: number;
  classified: number;
  possible: number;
  inserted: number;
  insertedTickets: Ticket[];
}

/** High food-likelihood ranks above medium within the unverified tier. */
function worthFromLikelihood(likelihood: KeptLikelihood): WorthLevel {
  return likelihood === "high" ? "high" : "maybe";
}

export { parseEventPriceToCost };

function timeWindowFromIso(iso: string): TimeWindow {
  const startMs = Date.parse(iso);
  if (Number.isNaN(startMs)) {
    return timeWindowFromNormalized(null);
  }
  return timeWindowFromStartMs(startMs);
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

/** Template blurb when the classifier omits `blurb`. */
export function buildFallbackBlurb(event: SocietyEvent): string {
  const society = event.society_name || "a UNSW society";
  const when = formatStart(event.starts_at_iso).replace(/^starts /, "");
  const price =
    !event.price || /free/i.test(event.price) ? "free" : event.price.trim();
  return `${society} — ${event.event_name || "society event"}. ${when}, ${price}. Room not pinned yet; check the event page or confirm it here.`;
}

/** Prefer the classifier blurb; fall back to the template. */
export function resolveAutoBlurb(
  event: SocietyEvent,
  generated: string | null | undefined,
): string {
  const trimmed = generated?.trim();
  if (trimmed) return trimmed;
  return buildFallbackBlurb(event);
}

/** Blurb for possible-tier tickets — notes food is unconfirmed. */
export function resolvePossibleBlurb(
  event: SocietyEvent,
  generated: string | null | undefined,
): string {
  const base = resolveAutoBlurb(event, generated);
  if (/isn't confirmed|not confirmed|unconfirmed/i.test(base)) return base;
  return `${base} Food here isn't confirmed yet — confirm if you spot a spread.`;
}

function insertFromClassified(
  classified: ClassifiedEvent | PossibleEvent,
  opts: { possibleTier?: boolean },
): Ticket | undefined {
  const {
    event,
    food_likelihood,
    reason,
    blurb,
    venue_hint,
    on_campus,
  } = classified;
  const { inserted, ticket } = insertAutoTicket({
    eventId: event.event_id || event.objectID,
    name: event.event_name || "Society event",
    society: event.society_name || "UNSW society",
    cost: parseEventPriceToCost(event.price),
    sourcePrice: event.price.trim() || undefined,
    time: timeWindowFromIso(event.starts_at_iso),
    startsAtIso: event.starts_at_iso,
    worth: opts.possibleTier
      ? "maybe"
      : worthFromLikelihood(food_likelihood as KeptLikelihood),
    ends: formatStart(event.starts_at_iso),
    sourceUrl: event.source_url,
    blurb: opts.possibleTier
      ? resolvePossibleBlurb(event, blurb)
      : resolveAutoBlurb(event, blurb),
    foodLikelihood: food_likelihood,
    classifyReason: reason,
    venueHint: venue_hint,
    onCampus: on_campus,
    possibleTier: opts.possibleTier,
  });
  return inserted && ticket ? ticket : undefined;
}

/** Insert tickets from classifier survivors (kept + possible). */
export function ingestClassificationReport(
  report: ClassificationReport,
): Ticket[] {
  const insertedTickets: Ticket[] = [];
  for (const item of report.kept) {
    const ticket = insertFromClassified(item, { possibleTier: false });
    if (ticket) insertedTickets.push(ticket);
  }
  for (const item of report.possible) {
    const ticket = insertFromClassified(item, { possibleTier: true });
    if (ticket) insertedTickets.push(ticket);
  }
  return insertedTickets;
}

/** Insert tickets from kept-tier classifier survivors only. */
export function ingestClassified(classified: ClassifiedEvent[]): Ticket[] {
  return ingestClassificationReport({ kept: classified, possible: [], dropped: [] });
}

/**
 * Full pipeline: one Algolia query -> LLM food classification -> low-trust
 * auto tickets. Deduped by event_id. Returns a summary and the new tickets.
 */
export async function runIngest(): Promise<IngestSummary> {
  if (!process.env.ALGOLIA_SEARCH_KEY) {
    console.warn("[ingest] ALGOLIA_SEARCH_KEY is not set — skipping ingest");
    return {
      fetched: 0,
      classified: 0,
      possible: 0,
      inserted: 0,
      insertedTickets: [],
    };
  }

  const events = await fetchEvents();
  const report = await classifyEventsWithReport(events);
  const insertedTickets = ingestClassificationReport(report);

  const summary: IngestSummary = {
    fetched: events.length,
    classified: report.kept.length,
    possible: report.possible.length,
    inserted: insertedTickets.length,
    insertedTickets,
  };

  console.log(
    `[ingest] fetched ${summary.fetched}, kept ${summary.classified}, possible ${summary.possible}, inserted ${summary.inserted} new`,
  );

  return summary;
}
