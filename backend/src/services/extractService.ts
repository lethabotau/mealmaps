import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACT_FIELDS,
  extractFromPost,
  type Allergen,
  type DietTag,
  type ExtractField,
  type ExtractResult,
  type FieldConfidence,
  type TimeNormalized,
} from "@mealmap/shared";

const DIET_TAG_VALUES: DietTag[] = [
  "vegan",
  "vegetarian",
  "halal",
  "kosher",
  "gluten-free",
  "dairy-free",
];

const ALLERGEN_VALUES: Allergen[] = [
  "nuts",
  "peanuts",
  "dairy",
  "gluten",
  "egg",
  "soy",
  "shellfish",
  "sesame",
];

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
- dietary_tags: array of diet tags EXPLICITLY stated or unambiguously implied by the post, using only these values: ${DIET_TAG_VALUES.join(", ")}. Empty array if none stated.
- allergens: array of allergens EXPLICITLY stated as present in the food, using only these values: ${ALLERGEN_VALUES.join(", ")}. Empty array if none stated.
- dietary_confidence: an object mapping "tags" and "allergens" each to "high", "medium", or "low"

Dietary rules — these are safety-critical, read carefully:
- Empty dietary_tags/allergens arrays mean UNKNOWN, not "confirmed none present". Never imply a food is safe by omission.
- Never infer transitively: "vegan" does NOT imply dairy-free is confirmed absent unless dairy-free is separately and explicitly stated; a dish being vegetarian says nothing about nut content.
- Only extract a tag/allergen if the post states it or a very common dish name unambiguously implies it (e.g. "cheese pizza" implies dairy). When in doubt, leave it out — a false negative here is safer than a false positive on food safety data.
- Any tag/allergen you infer rather than read verbatim gets at most "medium" confidence in dietary_confidence.

Interpretation rules:
- You MAY resolve relative references ("rn", "tmrw", "this arvo") into concrete values — that is interpreting stated facts.
- You MUST NEVER fabricate unstated facts: no invented end time, no guessed room number, no assumed access rule.
- Any value you resolved rather than read verbatim gets at most "medium" confidence (this includes time_normalized.confidence for resolved times).
- If a field is not stated, its value is null and its name appears in "missing".
- Respond with ONLY the JSON object. No prose, no markdown code fences.

Use exactly this JSON shape:
{"food":null,"cost":null,"time":null,"location":null,"access":null,"confidence":{"food":"low","cost":"low","time":"low","location":"low","access":"low"},"time_normalized":null,"cost_cents":null,"missing":[],"plausible":true,"plausibility_reason":"","dietary_tags":[],"allergens":[],"dietary_confidence":{"tags":"low","allergens":"low"}}`;
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

function coerceDietTags(value: unknown): DietTag[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is DietTag =>
      typeof v === "string" && (DIET_TAG_VALUES as string[]).includes(v),
  );
}

function coerceAllergens(value: unknown): Allergen[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is Allergen =>
      typeof v === "string" && (ALLERGEN_VALUES as string[]).includes(v),
  );
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

  const dietaryConfidenceSource =
    root.dietary_confidence && typeof root.dietary_confidence === "object"
      ? (root.dietary_confidence as Record<string, unknown>)
      : {};

  return {
    extraction,
    confidence,
    time_normalized: coerceTimeNormalized(root.time_normalized),
    cost_cents: coerceCents(root.cost_cents),
    missing,
    plausible: root.plausible !== false,
    plausibility_reason: coerceString(root.plausibility_reason) ?? "",
    source: "llm",
    dietary: {
      tags: coerceDietTags(root.dietary_tags),
      allergens: coerceAllergens(root.allergens),
      confidence: {
        tags: coerceConfidence(dietaryConfidenceSource.tags),
        allergens: coerceConfidence(dietaryConfidenceSource.allergens),
      },
    },
  };
}

function buildClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
}

function extractTextBlocks(message: Anthropic.Message): string {
  return message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
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
  const client = buildClient();
  if (!client) return null;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: buildSystemPrompt(context),
    messages: [{ role: "user", content: text }],
  });

  return normalize(JSON.parse(stripToJson(extractTextBlocks(message))));
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const IMAGE_MEDIA_TYPES: ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function isSupportedImageMediaType(value: string): value is ImageMediaType {
  return (IMAGE_MEDIA_TYPES as string[]).includes(value);
}

/**
 * Calls Anthropic's vision model to read a screenshot/flyer/poster and
 * extract the same structured shape as the text path. Returns `null` when no
 * API key is configured. Throws on API/parse failure — callers should show an
 * error rather than fall back to regex, since dietary/allergen and other
 * fields are not safely guessable from an image without reading it.
 */
export async function extractImageWithLlm(
  imageBase64: string,
  mediaType: ImageMediaType,
  context: ExtractContext,
): Promise<ExtractResult | null> {
  const client = buildClient();
  if (!client) return null;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: buildSystemPrompt(context),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: "This is a screenshot of a campus food event post (Instagram story, flyer, or poster). Read the visible text and extract the fields exactly as instructed.",
          },
        ],
      },
    ],
  });

  return normalize(JSON.parse(stripToJson(extractTextBlocks(message))));
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
    // Dietary/allergen data is not safely inferable via keyword regex — a
    // wrong guess here is actively harmful (unlike a wrong guess on "cost" or
    // "time"). Always report unknown rather than attempt keyword matching.
    dietary: {
      tags: [],
      allergens: [],
      confidence: { tags: "low", allergens: "low" },
    },
  };
}
