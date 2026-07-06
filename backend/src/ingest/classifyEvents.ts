import Anthropic from "@anthropic-ai/sdk";
import type { SocietyEvent } from "./fetchEvents.js";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 2500;
// Zero temperature: reproducible classification across identical event batches.
const TEMPERATURE = 0;
const TIMEOUT_MS = 10_000;
const BATCH_SIZE = 15;

const FOOD_KEYWORDS = [
  "bbq",
  "sausage sizzle",
  "bake sale",
  "pizza night",
  "pizza",
  "free lunch",
  "free dinner",
  "free breakfast",
  "free food",
  "sponsor night",
  "boodle fight",
  "snacks provided",
  "catering",
  "sausage",
  "cultural dinner",
  "dinner night",
  "member lunch",
  "food night",
];

/** Ticket price alone must not drop events with explicit provided-meal cues. */
const EXPLICIT_PROVISION_KEYWORDS = [
  ...FOOD_KEYWORDS,
  " dinner",
  " lunch",
  " breakfast",
  " banquet",
  " feast",
  " sizzle",
  "coffee night",
  "coffee society",
];

/** Commercial outings where attendees buy their own — never food-provided. */
const COMMERCIAL_OUTING_PATTERNS = [
  "pub crawl",
  "bar crawl",
  "food crawl",
  "cruise",
  "club night",
  "bar night",
  "restaurant outing",
  "restaurant trip",
  "dinner out",
  "lunch out",
  "happy hour",
  "drinks at",
  "maroubra",
  "kokoroya",
  "newtown",
  "pay own",
  "own way",
  "order your own",
];

function isCommercialOuting(text: string): boolean {
  const lower = text.toLowerCase();
  return COMMERCIAL_OUTING_PATTERNS.some((pattern) => lower.includes(pattern));
}

function maxTicketPrice(price: string): number | null {
  if (!price || /free/i.test(price)) return 0;
  const amounts = [...price.matchAll(/\$\s?(\d+(?:\.\d+)?)/g)].map((match) =>
    parseFloat(match[1]),
  );
  if (amounts.length === 0) return null;
  return Math.max(...amounts);
}

function hasExplicitProvisionSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return EXPLICIT_PROVISION_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function eventNameHaystack(event: SocietyEvent): string {
  return `${event.event_name} ${event.society_name}`.toLowerCase();
}

function eventFullHaystack(event: SocietyEvent): string {
  return `${event.event_name} ${event.location} ${event.society_name}`.toLowerCase();
}

function hasSocietyFoodContext(haystack: string): boolean {
  if (/isckon|iskcon|hare krishna/.test(haystack)) return true;
  if (/tea (&|and) coffee|coffee society|\bcoffee night\b|\btac\b/.test(haystack)) {
    return true;
  }
  if (/christian union/.test(haystack) && /\blunch\b/.test(haystack)) return true;
  return false;
}

/** Generic hangouts that stay hard-none (not upgraded to possible). */
const HARD_NONE_SOCIAL_PATTERNS = [
  "touhou",
  "roost",
  "webcomic",
  "bagl media",
  "snap bingo",
  "online games",
  "online tournament",
  "lan lounge",
  "pop-up library",
  "agm",
  "ks mt",
  "ksa mt",
  "toes on tour",
];

/** Social formats where food is plausible but unstated → possible tier. */
const POSSIBLE_SOCIAL_SIGNALS = [
  "social session",
  "meetup",
  "games night",
  "game night",
  "trivia",
  "boardgame",
  "board game",
  "weekly social",
  "hangout",
  "lounge",
  "friday boardgames",
  "tcgs",
];

function isSocialCategory(event: SocietyEvent): boolean {
  const cat = event.location.toLowerCase();
  return /party|bbq|social|trivia|quiz/i.test(cat);
}

function isOnlineEvent(event: SocietyEvent): boolean {
  return /\bonline\b/i.test(eventNameHaystack(event));
}

function isHardNoneEvent(event: SocietyEvent): boolean {
  const full = eventFullHaystack(event);
  const name = eventNameHaystack(event);
  if (isCommercialOuting(full)) return true;
  if (isOnlineEvent(event)) return true;
  if (
    /mock exam|peer mentoring|rehearsal|workshop|presentation|bjj|dodgeball|open tournament|training|internals|mentoring|site tour|run club|op shop|bouldering|ice skating|plasma donation|crew meeting|site visit|orchestra|wind symphony|table tennis|quadball|paint & sip|escape room|hyperkarting|cruise|arcade|food crawl|pub crawl|bar crawl|skate|hike|walk -|watch party|lan lounge/i.test(
      full,
    )
  ) {
    return true;
  }
  if (HARD_NONE_SOCIAL_PATTERNS.some((p) => full.includes(p))) {
    if (/trivia/i.test(full)) return false;
    if (/social session/i.test(full)) return false;
    return true;
  }
  if (/snap bingo|^bingo/i.test(name)) return true;
  return false;
}

function fallbackPossibleFood(event: SocietyEvent): string | null {
  if (!isSocialCategory(event)) return null;
  if (isHardNoneEvent(event)) return null;
  if (fallbackLikelyProvidedFood(event)) return null;

  const full = eventFullHaystack(event);
  const hit = POSSIBLE_SOCIAL_SIGNALS.find((signal) => full.includes(signal));
  if (hit) return hit;

  if (
    /party\/bbq\/social/i.test(event.location.toLowerCase()) &&
    /weekly|social|session|meetup/i.test(full)
  ) {
    return "society social (food plausible, unstated)";
  }
  return null;
}

function fallbackLikelyProvidedFood(event: SocietyEvent): string | null {
  const full = eventFullHaystack(event);
  const nameText = eventNameHaystack(event);
  if (isCommercialOuting(full)) return null;
  if (isHardNoneEvent(event)) return null;

  const hit =
    FOOD_KEYWORDS.find((keyword) => nameText.includes(keyword)) ??
    (hasExplicitProvisionSignal(nameText) ? "explicit provision" : null);
  const ambiguousMeal =
    !hit &&
    (hasSocietyFoodContext(nameText) ||
      /\bdinner\b/.test(nameText) ||
      /\blunch\b/.test(nameText) ||
      /\bbreakfast\b/.test(nameText));

  const signal = hit ?? (ambiguousMeal ? "meal context (ambiguous)" : null);
  if (!signal) return null;

  const ticketMax = maxTicketPrice(event.price);
  if (
    ticketMax != null &&
    ticketMax > 15 &&
    !hasExplicitProvisionSignal(nameText)
  ) {
    return null;
  }

  return signal;
}

export type FoodLikelihood = "high" | "medium" | "possible" | "low" | "none";
const LIKELIHOODS: FoodLikelihood[] = ["high", "medium", "possible", "low", "none"];

/** Likelihoods that survive ingest — only strong food signals are kept. */
export type KeptLikelihood = "high" | "medium";

/** Full verdict for one event (any likelihood tier). */
export interface ClassifiedVerdict {
  event: SocietyEvent;
  food_likelihood: FoodLikelihood;
  reason: string;
  blurb: string | null;
  venue_hint: string | null;
  on_campus: boolean;
}

export interface ClassificationReport {
  kept: ClassifiedEvent[];
  possible: PossibleEvent[];
  dropped: ClassifiedVerdict[];
}
/** An event where food is plausible but unstated — inserts as possible tier. */
export interface PossibleEvent {
  event: SocietyEvent;
  food_likelihood: "possible";
  reason: string;
  blurb: string | null;
  venue_hint: string | null;
  on_campus: boolean;
}
/** An event the pipeline decided is food-likely (only "high"/"medium" survive). */
export interface ClassifiedEvent {
  event: SocietyEvent;
  food_likelihood: KeptLikelihood;
  reason: string;
  /** Human-facing description for the ticket; null when the model omits it. */
  blurb: string | null;
  /** Campus location ONLY when explicitly stated or unambiguous; never guessed. */
  venue_hint: string | null;
  /** False for clearly off-campus events (e.g. suburb food crawl). */
  on_campus: boolean;
}

function toPossibleEvent(verdict: ClassifiedVerdict): PossibleEvent | null {
  if (verdict.food_likelihood !== "possible") return null;
  return {
    event: verdict.event,
    food_likelihood: "possible",
    reason: verdict.reason,
    blurb: verdict.blurb,
    venue_hint: verdict.venue_hint,
    on_campus: verdict.on_campus,
  };
}

function toClassifiedEvent(verdict: ClassifiedVerdict): ClassifiedEvent | null {
  if (
    verdict.food_likelihood !== "high" &&
    verdict.food_likelihood !== "medium"
  ) {
    return null;
  }
  return {
    event: verdict.event,
    food_likelihood: verdict.food_likelihood,
    reason: verdict.reason,
    blurb: verdict.blurb,
    venue_hint: verdict.venue_hint,
    on_campus: verdict.on_campus,
  };
}

function formatEventLine(event: SocietyEvent, verdict: ClassifiedVerdict): string {
  const price = event.price?.trim() || "—";
  return `${event.event_name} | ${event.society_name} | ${price} → ${verdict.food_likelihood} (${verdict.reason || "no reason"})`;
}

const SYSTEM_PROMPT = `You classify whether a university society event likely involves FREE or cheap FOOD PROVIDED TO ATTENDEES by the event itself (not purchased separately at a venue).

THE CORE TEST — apply this first:
Would a broke student attending this event receive food (free or cheap) as part of the event itself?
The question is PROVISION, not price. A ticket price is fine when it INCLUDES a provided meal.

PROVISION vs PURCHASE — the actual target of the "none" rule:
- "none" ONLY when attendees buy their OWN food/drinks individually at commercial venues: pub crawls, bar crawls, bar/club nights, harbour cruises, restaurant meetups where you order and pay, food crawls where you buy at each stop.
- Society events in Party/BBQ/Social category WITH provided catering — sponsor nights, launch events, "snacks provided", member lunches, cultural dinners — are legitimate even if ticketed.

Ticketed events where the price clearly INCLUDES a provided meal are legitimate (high/medium):
- Cultural dinners/food nights, member lunches, paid BBQs, boodle fights, "$X for dinner + activity"
- Examples: $12 cultural dinner, $5 member lunch, $22 boodle fight with communal meal — all can be high/medium

PRICE BOUNDARY (narrow):
- The ~$15 cap applies ONLY when food provision is unstated or ambiguous — NOT when a provided meal is explicit.
- High ticket price alone (escape room, cruise, arcade, sports) → none when the fee is clearly venue/activity entry, not a meal.

AMBIGUITY — prefer medium when food is implied; use "possible" for plausible-but-unstated socials:
- When the name suggests food context but provision is unclear (e.g. "X Society Dinner" with a price) → medium, not none.
- Society socials/hangouts/meetups in Party/BBQ/Social (or Quiz/Trivia) where food MIGHT be provided but is unstated → possible (NOT none).
- Reserve "none" for confident non-provision: buy-your-own outings, online events, sport/classes/workshops/exams/rehearsals/mentoring, retail outings.

THE "possible" TIER (between medium and none):
- Use when a reasonable student might hope for snacks/food at a society social, but nothing in the data confirms provision.
- Examples: Puzzlesoc Social Session (Party/BBQ/Social), Trivia Night, weekly meetup, games night, Mii Meetup.
- Do NOT use "possible" for pub crawls, cruises, restaurant outings, online events, sport sessions, classes/workshops/exams/rehearsals/mentoring, or retail outings — those stay "none".

CATEGORY IS NOT A FOOD CUE:
Party/BBQ/Social or any generic social category alone is NEVER a food cue. Bingo, trivia, games/console meetups, watch parties, lounges, libraries, AGMs/MTs, and generic hangouts need an explicit meal/snack/drink-provided signal in the event name OR legitimate society food context to reach medium.
- "Snap Bingo" (Party/BBQ/Social) → none (bingo, no food signal)
- "Touhou Thursdays" / "Roost n Chill" / "Nintendo Meetup" / "Watch Party" → none (generic hangout)
- "ISCKON W6" (UNSW Hindu Society) → medium (Hare Krishna / ISKCON events are food-centric — society + event context counts)
- "Christian Union Lunch; Sports and Hangs" → medium ("Lunch" explicit in name)
- "T2 Coffee Night" / "TOUR DE TAC — BETA COFFEE" (Tea & Coffee Society) → high/medium (provision IS the event)

ALWAYS "none" (never "possible"):
- Pub crawls, bar crawls, bar nights, club nights, harbour/city cruises
- Restaurant outings where attendees pay own way ("@ Restaurant", "order your own")
- Food crawls where attendees buy at each stop (Cabramatta Food Crawl — you pay at shops)
- Trips to commercial venues to buy lunch/dinner individually (Kokoroya Maroubra social lunch)
- Online events (online tournament, online games night)
- Sport sessions, classes, workshops, exams, rehearsals, mentoring, retail outings (op shop hop)
- Snap Bingo, Touhou Thursdays, Roost n Chill, LAN Lounge — generic hangouts with no food plausibility

POSITIVE signals (food likely provided):
- BBQ, sausage sizzle, bake sale, sponsor night with catering
- Free lunch/dinner/breakfast, member lunch, cultural dinner/food night
- Boodle fight, dumpling night, explicit "free food" or "snacks provided"

Few-shot examples (name → food_likelihood):
- "CityHeroes Pub Crawl — $25" → none (attendees buy drinks at pubs)
- "Harbour Cruise Social — $40" → none (cruise ticket, buy your own)
- "Cabramatta Food Crawl" → none (attendees buy their own at each stop)
- "Society Dinner @ Restaurant — pay own way" → none (restaurant, order individually)
- "FILOSOC Boodle Fight — $22" → high (communal meal provided, price includes it)
- "Sausage sizzle Village Green — gold coin" → high (provided on site)
- "PhilSoc Cultural Dinner Night — $12" → high (meal provided, price includes it)
- "Member Lunch — $5" → medium/high (provided member lunch)
- "Games Night — snacks provided" → medium (explicit snacks provided)
- "Christian Union Lunch; Sports and Hangs — free" → medium ("Lunch" explicit in name)
- "Snap Bingo — free" → none (bingo game, not a food social)
- "ISCKON W6 — free" → medium (Hare Krishna society context; food-centric event)
- "Puzzlesoc Social Session — Party/BBQ/Social" → possible (society social; food plausible but unstated)
- "Trivia Night!" → possible (social event; food sometimes provided, unstated here)
- "BJJ All Levels Class" → none (martial arts class, not a food social)
- "2026 Weekly Online Tournament 27" → none (online event)
- "Cabramatta Food Crawl" → none (attendees buy at each stop)

CRITICAL: Party/BBQ/Social category alone is NEVER sufficient. Generic social formats need explicit meal/snack/drink-provided language in the name or legitimate society food context (Hare Krishna/ISKCON, Tea & Coffee Society coffee events, "Lunch" in Christian Union events).

For each event (id, name, category, society, price, starts_at) return food_likelihood:
- "high": explicit PROVIDED food — BBQ, sizzle, free meals, bake sale, boodle fight, cultural dinner with included meal, catered sponsor feed
- "medium": food strongly implied OR ambiguous meal context without commercial-venue outing pattern — society dinner with price, member lunch, "lunch" in name, snacks provided
- "possible": society social/hangout/meetup in Party/BBQ/Social or Quiz/Trivia where food provision is plausible but unstated — NOT for online/sport/class/workshop/commercial outings
- "low": weak cue only; ticket $15+ with unstated provision
- "none": confident buy-your-own outing or confident no food (sport, class, online, exam, rehearsal, retail)

Also return for each event (use the event name + society for food cues; ignore category/location field for BBQ/Social classification — "Party/BBQ/Social" is NOT a food signal):
- venue_hint: string|null — UNSW Kensington campus location ONLY when explicitly stated. NEVER guess. If unclear, null.
- on_campus: boolean — false for suburb crawls, city venues, off-campus bars/restaurants, cruises.
- blurb: string — 1-2 sentences describing the event for a campus food pass ticket. Write like a sharp, dry-witted friend: grounded and matter-of-fact, not robotic or salesy. Mention only stated facts (society name exactly as given, event name, day/time from starts_at, price, category). Show, don't tell: name the event type and let that imply food — never explain that "food is the point" or call something "food-focused". Do not repeat the society name if it already appears in the event title. Must NEVER invent food details, locations, or vibes not in the data. No exclamation marks, no emoji, no marketing adjectives ("amazing", "delicious"), no first person. If location is unknown, you may note that someone should confirm it. Match the app's diner-ticket dryness.

Respond with ONLY a strict JSON array, one object per input event:
[{"id":"<event id>","food_likelihood":"high|medium|possible|low|none","reason":"one short line","venue_hint":null|"Quadrangle"|...,"on_campus":true|false,"blurb":"..."}]
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
): Promise<ClassifiedVerdict[]> {
  const payload = events.map((event) => ({
    id: eventId(event),
    name: event.event_name,
    category: event.location,
    society: event.society_name,
    price: event.price,
    starts_at: event.starts_at_iso,
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

  const byId = new Map<
    string,
    {
      likelihood: FoodLikelihood;
      reason: string;
      blurb: string | null;
      venue_hint: string | null;
      on_campus: boolean;
    }
  >();
  for (const item of parseJsonArray(raw)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const likelihood = coerceLikelihood(record.food_likelihood);
    if (!id || !likelihood) continue;
    const venueRaw = record.venue_hint;
    const venue_hint =
      typeof venueRaw === "string" && venueRaw.trim() ? venueRaw.trim() : null;
    const blurbRaw = record.blurb;
    const blurb =
      typeof blurbRaw === "string" && blurbRaw.trim() ? blurbRaw.trim() : null;
    const on_campus =
      typeof record.on_campus === "boolean" ? record.on_campus : true;
    byId.set(id, {
      likelihood,
      reason: typeof record.reason === "string" ? record.reason : "",
      blurb,
      venue_hint,
      on_campus,
    });
  }

  const verdicts: ClassifiedVerdict[] = [];
  for (const event of events) {
    const verdict = byId.get(eventId(event));
    if (!verdict) {
      verdicts.push({
        event,
        food_likelihood: "none",
        reason: "no model verdict",
        blurb: null,
        venue_hint: null,
        on_campus: true,
      });
      continue;
    }
    verdicts.push({
      event,
      food_likelihood: verdict.likelihood,
      reason: verdict.reason,
      blurb: verdict.blurb,
      venue_hint: verdict.venue_hint,
      on_campus: verdict.on_campus,
    });
  }
  return verdicts;
}

function classifyChunkFallback(events: SocietyEvent[]): ClassifiedVerdict[] {
  return events.map((event) => {
    const hit = fallbackLikelyProvidedFood(event);
    if (hit) {
      return {
        event,
        food_likelihood: "medium" as const,
        reason: `keyword match: "${hit}"`,
        blurb: null,
        venue_hint: null,
        on_campus: !isCommercialOuting(
          `${event.event_name} ${event.society_name}`.toLowerCase(),
        ),
      };
    }
    const possible = fallbackPossibleFood(event);
    if (possible) {
      return {
        event,
        food_likelihood: "possible" as const,
        reason: `plausible social: "${possible}"`,
        blurb: null,
        venue_hint: null,
        on_campus: !isCommercialOuting(
          `${event.event_name} ${event.location} ${event.society_name}`.toLowerCase(),
        ),
      };
    }
    const commercial = isCommercialOuting(
      `${event.event_name} ${event.location} ${event.society_name}`.toLowerCase(),
    );
    return {
      event,
      food_likelihood: "none" as const,
      reason: commercial
        ? "commercial outing — attendees buy their own"
        : "no provided-food signal",
      blurb: null,
      venue_hint: null,
      on_campus: !commercial,
    };
  });
}

async function classifyAllVerdicts(
  events: SocietyEvent[],
): Promise<ClassifiedVerdict[]> {
  if (events.length === 0) return [];

  const batches = chunk(events, BATCH_SIZE);
  const out: ClassifiedVerdict[] = [];

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

/** Classify all events and split into kept (high/medium) vs dropped. */
export async function classifyEventsWithReport(
  events: SocietyEvent[],
): Promise<ClassificationReport> {
  const all = await classifyAllVerdicts(events);
  const kept: ClassifiedEvent[] = [];
  const possible: PossibleEvent[] = [];
  const dropped: ClassifiedVerdict[] = [];
  for (const verdict of all) {
    const survivor = toClassifiedEvent(verdict);
    if (survivor) {
      kept.push(survivor);
      continue;
    }
    const maybe = toPossibleEvent(verdict);
    if (maybe) {
      possible.push(maybe);
      continue;
    }
    dropped.push(verdict);
  }
  return { kept, possible, dropped };
}

export function formatClassificationLine(verdict: ClassifiedVerdict): string {
  return formatEventLine(verdict.event, verdict);
}

/**
 * Classifies events in batches of up to 15 via Claude, discarding "none".
 * Falls back to keyword matching (per batch) on any LLM failure or missing key.
 */
export async function classifyEvents(
  events: SocietyEvent[],
): Promise<ClassifiedEvent[]> {
  const report = await classifyEventsWithReport(events);
  return report.kept;
}
