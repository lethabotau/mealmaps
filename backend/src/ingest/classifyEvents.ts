import Anthropic from "@anthropic-ai/sdk";
import type { SocietyEvent } from "./fetchEvents.js";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1500;
// Zero temperature: reproducible classification across identical event batches.
const TEMPERATURE = 0;
const TIMEOUT_MS = 10_000;
const BATCH_SIZE = 15;

const FOOD_KEYWORDS = [
  "bbq",
  "pizza",
  "food",
  "snacks",
  "dinner",
  "lunch",
  "breakfast",
  "sausage",
  "feed",
];

export type FoodLikelihood = "high" | "medium" | "low" | "none";
const LIKELIHOODS: FoodLikelihood[] = ["high", "medium", "low", "none"];

/** Likelihoods that survive ingest — only strong food signals are kept. */
export type KeptLikelihood = "high" | "medium";

/** An event the pipeline decided is food-likely (only "high"/"medium" survive). */
export interface ClassifiedEvent {
  event: SocietyEvent;
  food_likelihood: KeptLikelihood;
  reason: string;
}

const SYSTEM_PROMPT = `You classify whether a university society event likely involves FREE or cheap FOOD for attendees.

CRITICAL: the event CATEGORY (e.g. "Party/BBQ/Social", "Social", "Cultural") is NOT sufficient evidence on its own. Most socials, trivia, bingo, and games nights sit in those categories with no food. Only treat an event as food-likely when there is a real food signal in the event NAME, the SOCIETY type/focus, or the PRICE context — for example: "BBQ", "sausage sizzle", "pizza", "dinner", "lunch", "breakfast", "brunch", "supper", "snacks", "bake sale", "feed", a cultural/culinary food event (e.g. dumpling night, yum cha), or an explicit "free food".

For each event (id, name, category, society, price) return a food_likelihood:
- "high": explicit food in the name/society/price — BBQ, sausage sizzle, pizza night, free dinner, bake sale, cultural food night, catered sponsor feed
- "medium": food strongly implied by a food-oriented society or an explicit "free food" social, even if a specific dish isn't named
- "low": only a social/party category with NO food mention — e.g. a trivia, bingo, or games night in "Party/BBQ/Social"
- "none": clearly no food — rehearsals, sports games, classes, tournaments, meetings, workshops, info sessions

Do not upgrade "low" to "medium" just because the category contains the word "BBQ" or "Social"; require an actual food cue in the name, society, or price.

Respond with ONLY a strict JSON array, one object per input event:
[{"id":"<event id>","food_likelihood":"high|medium|low|none","reason":"one short line"}]
No prose, no markdown code fences.`;

function eventId(event: SocietyEvent): string {
  return event.event_id || event.objectID;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function parseJsonArray(raw: string): unknown[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const first = cleaned.indexOf("[");
  const last = cleaned.lastIndexOf("]");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON array found in model response");
  }
  const parsed = JSON.parse(cleaned.slice(first, last + 1));
  if (!Array.isArray(parsed)) throw new Error("Model response is not an array");
  return parsed;
}

function coerceLikelihood(value: unknown): FoodLikelihood | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase() as FoodLikelihood;
  return LIKELIHOODS.includes(lower) ? lower : null;
}

async function classifyChunkWithLlm(
  events: SocietyEvent[],
  client: Anthropic,
): Promise<ClassifiedEvent[]> {
  const payload = events.map((event) => ({
    id: eventId(event),
    name: event.event_name,
    category: event.location,
    society: event.society_name,
    price: event.price,
  }));

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });

  const raw = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  const byId = new Map<string, { likelihood: FoodLikelihood; reason: string }>();
  for (const item of parseJsonArray(raw)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const likelihood = coerceLikelihood(record.food_likelihood);
    if (!id || !likelihood) continue;
    byId.set(id, {
      likelihood,
      reason: typeof record.reason === "string" ? record.reason : "",
    });
  }

  const survivors: ClassifiedEvent[] = [];
  for (const event of events) {
    const verdict = byId.get(eventId(event));
    if (!verdict) continue;
    if (verdict.likelihood !== "high" && verdict.likelihood !== "medium") continue;
    survivors.push({
      event,
      food_likelihood: verdict.likelihood,
      reason: verdict.reason,
    });
  }
  return survivors;
}

function classifyChunkFallback(events: SocietyEvent[]): ClassifiedEvent[] {
  const survivors: ClassifiedEvent[] = [];
  for (const event of events) {
    const haystack =
      `${event.event_name} ${event.location} ${event.society_name}`.toLowerCase();
    const hit = FOOD_KEYWORDS.find((keyword) => haystack.includes(keyword));
    if (!hit) continue;
    survivors.push({
      event,
      food_likelihood: "medium",
      reason: `keyword match: "${hit}"`,
    });
  }
  return survivors;
}

/**
 * Classifies events in batches of up to 15 via Claude, discarding "none".
 * Falls back to keyword matching (per batch) on any LLM failure or missing key.
 */
export async function classifyEvents(
  events: SocietyEvent[],
): Promise<ClassifiedEvent[]> {
  if (events.length === 0) return [];

  const batches = chunk(events, BATCH_SIZE);
  const out: ClassifiedEvent[] = [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[ingest] ANTHROPIC_API_KEY not set — using keyword fallback for classification.",
    );
    for (const batch of batches) out.push(...classifyChunkFallback(batch));
    return out;
  }

  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
  for (const batch of batches) {
    try {
      out.push(...(await classifyChunkWithLlm(batch, client)));
    } catch (err) {
      console.warn(
        "[ingest] classification batch failed, using keyword fallback:",
        err instanceof Error ? err.message : "unknown error",
      );
      out.push(...classifyChunkFallback(batch));
    }
  }
  return out;
}
