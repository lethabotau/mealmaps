import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACT_FIELDS,
  extractFromPost,
  type ExtractField,
  type ExtractResult,
  type FieldConfidence,
  type TimeNormalized,
} from "@mealmap/shared";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1000;
const TEMPERATURE = 0.1;
const TIMEOUT_MS = 10_000;

/** Request-time context so the model can resolve relative dates. */
export interface ExtractContext {
  nowIso: string;
  timeZone: string;
}

function buildSystemPrompt({ nowIso, timeZone }: ExtractContext): string {
  return `You extract structured food-event data from messy student event posts.

The current date-time is ${nowIso} (timezone ${timeZone}). Resolve all relative time references against this.

Extract these fields:
- food: what food is offered (string, or null if not stated)
- cost: what it costs, verbatim, e.g. "Free", "$5", "gold coin donation" (string, or null)
- time: when it is happening — preserve exactly what the post says, do not invent (string, or null)
- location: the physical place it is happening (string, or null)
- access: who can attend, e.g. "Open to all", "Members only", "RSVP required" (string, or null)

Also return:
- confidence: an object mapping each of food, cost, time, location, access to "high", "medium", or "low"
- time_normalized: your best structured interpretation of when it happens, or null if no time is stated:
  { "type": "now" | "today" | "specific", "start": ISO-8601 datetime string or null, "confidence": "high" | "medium" | "low" }
  - "happening now", "rn", "right now" -> type "now", start null
  - a time later today with no explicit date -> type "today"
  - a specific date/time, including relative dates you resolve ("tmrw 12-2", "this arvo") -> type "specific", start = resolved ISO-8601 datetime
- cost_cents: integer cents, or null if no cost stated:
  - genuinely free -> 0
  - "$5" -> 500
  - vague donations like "gold coin donation" -> your best estimate, ~100-200
- missing: an array of the field names (food, cost, time, location, access) that are not stated in the post
- plausible: boolean — false if the text does not look like a genuine campus food event (gibberish, trolling, clearly off-campus, or no food involved)
- plausibility_reason: one short line explaining the plausible value

Interpretation rules:
- You MAY resolve relative references ("rn", "tmrw", "this arvo") into concrete values — that is interpreting stated facts.
- You MUST NEVER fabricate unstated facts: no invented end time, no guessed room number, no assumed access rule.
- Any value you resolved rather than read verbatim gets at most "medium" confidence (this includes time_normalized.confidence for resolved times).
- If a field is not stated, its value is null and its name appears in "missing".
- Respond with ONLY the JSON object. No prose, no markdown code fences.

Use exactly this JSON shape:
{"food":null,"cost":null,"time":null,"location":null,"access":null,"confidence":{"food":"low","cost":"low","time":"low","location":"low","access":"low"},"time_normalized":null,"cost_cents":null,"missing":[],"plausible":true,"plausibility_reason":""}`;
}

const CONFIDENCE_VALUES: FieldConfidence[] = ["high", "medium", "low"];
const TIME_TYPES: TimeNormalized["type"][] = ["now", "today", "specific"];

function coerceString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed === "—") {
    return null;
  }
  return trimmed;
}

function coerceConfidence(value: unknown): FieldConfidence {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if ((CONFIDENCE_VALUES as string[]).includes(lower)) {
      return lower as FieldConfidence;
    }
  }
  return "low";
}

function coerceTimeNormalized(value: unknown): TimeNormalized | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const type =
    typeof v.type === "string"
      ? (v.type.toLowerCase() as TimeNormalized["type"])
      : null;
  if (!type || !TIME_TYPES.includes(type)) return null;
  let confidence = coerceConfidence(v.confidence);
  // A "specific" datetime is always a resolved interpretation of the post —
  // enforce the "resolved values get at most medium" rule regardless of the
  // model's self-assessment.
  if (type === "specific" && confidence === "high") confidence = "medium";
  return {
    type,
    start: coerceString(v.start),
    confidence,
  };
}

function coerceCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value);
}

/** Strips accidental markdown fences and grabs the outermost JSON object. */
function stripToJson(raw: string): string {
  const withoutFences = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const first = withoutFences.indexOf("{");
  const last = withoutFences.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found in model response");
  }
  return withoutFences.slice(first, last + 1);
}

function normalize(parsed: unknown): ExtractResult {
  const root = (parsed ?? {}) as Record<string, unknown>;
  const extractionSource =
    root.extraction && typeof root.extraction === "object"
      ? (root.extraction as Record<string, unknown>)
      : root;
  const confidenceSource =
    root.confidence && typeof root.confidence === "object"
      ? (root.confidence as Record<string, unknown>)
      : {};

  const extraction = {} as Record<ExtractField, string | null>;
  const confidence = {} as Record<ExtractField, FieldConfidence>;
  for (const field of EXTRACT_FIELDS) {
    extraction[field] = coerceString(extractionSource[field]);
    confidence[field] =
      extraction[field] === null
        ? "low"
        : coerceConfidence(confidenceSource[field]);
  }

  const missing = EXTRACT_FIELDS.filter((field) => extraction[field] === null);

  return {
    extraction,
    confidence,
    time_normalized: coerceTimeNormalized(root.time_normalized),
    cost_cents: coerceCents(root.cost_cents),
    missing,
    plausible: root.plausible !== false,
    plausibility_reason: coerceString(root.plausibility_reason) ?? "",
    source: "llm",
  };
}

/**
 * Calls Anthropic to extract structured data. Returns `null` when no API key
 * is configured (caller falls back to regex). Throws on API/parse failure so
 * the caller can fall back and never surface a 500.
 */
export async function extractWithLlm(
  text: string,
  context: ExtractContext,
): Promise<ExtractResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({
    apiKey,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
  });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: buildSystemPrompt(context),
    messages: [{ role: "user", content: text }],
  });

  const raw = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  return normalize(JSON.parse(stripToJson(raw)));
}

/** Maps the shared regex extractor into the {@link ExtractResult} shape. */
export function regexToExtractResult(text: string): ExtractResult {
  const post = extractFromPost(text);
  const value = (field: string) => (field && field !== "—" ? field : null);

  const extraction: Record<ExtractField, string | null> = {
    food: value(post.food),
    cost: value(post.cost),
    time: value(post.time),
    location: value(post.location),
    access: value(post.access),
  };

  const confidence = {} as Record<ExtractField, FieldConfidence>;
  for (const field of EXTRACT_FIELDS) confidence[field] = "low";

  const missing = EXTRACT_FIELDS.filter((field) => extraction[field] === null);

  return {
    extraction,
    confidence,
    time_normalized: null,
    cost_cents: null,
    missing,
    plausible: true,
    plausibility_reason: "Extracted with keyword fallback.",
    source: "regex",
  };
}
