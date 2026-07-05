const ALGOLIA_URL =
  "https://Z9GSMS5XJY-dsn.algolia.net/1/indexes/society_scrape_algolia/query";
const ALGOLIA_APP_ID = "Z9GSMS5XJY";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A cleaned society-scrape hit. NOTE: `location` here is the event CATEGORY
 * (e.g. "Party/BBQ/Social"), NOT a physical location.
 */
export interface SocietyEvent {
  event_id: string;
  event_name: string;
  event_type: string;
  location: string;
  starts_at_iso: string;
  local_date: string;
  description: string;
  society_name: string;
  price: string;
  source_url: string;
  banner_image: string;
  objectID: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toEvent(hit: Record<string, unknown>): SocietyEvent {
  return {
    event_id: str(hit.event_id),
    event_name: str(hit.event_name),
    event_type: str(hit.event_type),
    location: str(hit.location),
    starts_at_iso: str(hit.starts_at_iso),
    local_date: str(hit.local_date),
    description: str(hit.description),
    society_name: str(hit.society_name),
    price: str(hit.price),
    source_url: str(hit.source_url),
    banner_image: str(hit.banner_image),
    objectID: str(hit.objectID),
  };
}

/**
 * Runs a single Algolia query and returns events starting within the next
 * 7 days. `_highlightResult` is stripped. Throws on missing key / HTTP error.
 */
export async function fetchEvents(): Promise<SocietyEvent[]> {
  const apiKey = process.env.ALGOLIA_SEARCH_KEY;
  if (!apiKey) {
    throw new Error("ALGOLIA_SEARCH_KEY is not set");
  }

  const res = await fetch(ALGOLIA_URL, {
    method: "POST",
    headers: {
      "x-algolia-application-id": ALGOLIA_APP_ID,
      "x-algolia-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query: "", hitsPerPage: 100 }),
  });

  if (!res.ok) {
    throw new Error(`Algolia query failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { hits?: unknown };
  const hits = Array.isArray(data.hits) ? (data.hits as Record<string, unknown>[]) : [];

  const now = Date.now();
  const horizon = now + SEVEN_DAYS_MS;
  const events: SocietyEvent[] = [];

  for (const hit of hits) {
    const { _highlightResult, ...rest } = hit;
    void _highlightResult;
    const event = toEvent(rest);

    const startMs = Date.parse(event.starts_at_iso);
    if (Number.isNaN(startMs)) continue;
    if (startMs < now || startMs > horizon) continue;

    events.push(event);
  }

  return events;
}
