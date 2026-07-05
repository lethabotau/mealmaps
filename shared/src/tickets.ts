import type {
  CampusArea,
  CreateTicketInput,
  ExtractedPost,
  Filters,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
  TicketStatus,
  TicketView,
  TimeWindow,
  WorthLevel,
} from "./types.js";

export const WORTH_COLORS: Record<WorthLevel, string> = {
  high: "#3C7A45",
  maybe: "#B7791F",
  low: "#C0341D",
};

export const WORTH_LABELS: Record<WorthLevel, string> = {
  high: "GO NOW",
  maybe: "MAYBE",
  low: "SKIP",
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  available: "#3C7A45",
  maybe: "#B7791F",
  gone: "#C0341D",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  available: "AVAILABLE",
  maybe: "HOLD?",
  gone: "GONE",
};

export const DEFAULT_FILTERS: Filters = {
  budget: "u10",
  time: "now",
  area: "anywhere",
};

export function worthRank(w: WorthLevel): number {
  if (w === "high") return 0;
  if (w === "maybe") return 1;
  return 2;
}

export function effectiveStatus(
  ticket: Ticket,
  overrides: TicketOverrides = {},
): TicketStatus {
  return overrides[ticket.id] ?? ticket.status;
}

export function filterTickets(
  tickets: Ticket[],
  filters: Filters,
  overrides: TicketOverrides = {},
): Ticket[] {
  const list = tickets.filter((ticket) => {
    if (filters.budget === "free" && ticket.cost !== 0) return false;
    if (filters.budget === "u5" && ticket.cost >= 5) return false;
    if (filters.budget === "u10" && ticket.cost >= 10) return false;
    if (filters.time === "now" && ticket.time !== "now") return false;
    if (
      filters.time === "hour" &&
      !(ticket.time === "now" || ticket.time === "hour")
    ) {
      return false;
    }
    if (filters.area !== "anywhere" && ticket.area !== filters.area) return false;
    return true;
  });

  return list.sort((a, b) => {
    const aGone = effectiveStatus(a, overrides) === "gone" ? 1 : 0;
    const bGone = effectiveStatus(b, overrides) === "gone" ? 1 : 0;
    if (aGone !== bGone) return aGone - bGone;

    const worthDiff = worthRank(a.worth) - worthRank(b.worth);
    if (worthDiff !== 0) return worthDiff;

    return a.walk - b.walk;
  });
}

export function toTicketView(
  ticket: Ticket,
  overrides: TicketOverrides = {},
  confirm: Record<string, TicketConfirmMeta> = {},
): TicketView {
  const status = effectiveStatus(ticket, overrides);
  const gone = status === "gone";
  const meta = confirm[ticket.id];

  return {
    ...ticket,
    effectiveStatus: status,
    ends: gone ? "gone" : ticket.ends,
    endsColor: gone ? STATUS_COLORS.gone : "#E5431E",
    costLabel: ticket.cost === 0 ? "FREE" : `$${ticket.cost}`,
    costColor: ticket.cost === 0 ? "#E5431E" : "#1B1712",
    worthLabel: WORTH_LABELS[ticket.worth],
    worthColor: WORTH_COLORS[ticket.worth],
    statusLabel: STATUS_LABELS[status],
    statusColor: STATUS_COLORS[status],
    confirmCount: meta?.count ?? 3,
    lastChecked: meta?.last ?? "4 min ago",
  };
}

export function inferAreaFromWhere(where: string): CampusArea {
  const lower = where.toLowerCase();
  if (lower.includes("library")) return "library";
  if (lower.includes("lower")) return "lower";
  return "quad";
}

export function buildQuickAddTicket(input: {
  where: string;
  what: string;
  last: string;
}): CreateTicketInput {
  return {
    name: (input.what || "Food").replace(/\b\w/g, (c) => c.toUpperCase()),
    source: "Student report",
    cost: 0,
    area: inferAreaFromWhere(input.where),
    time: "now",
    walk: 2 + Math.floor(Math.random() * 8),
    where: input.where || "On campus",
    ends: input.last || "until gone",
    access: "Open to all",
    worth: "maybe",
    status: "available",
    blurb:
      "Reported by a fellow student just now. Details are fresh but unverified — report back when you get there!",
  };
}

export function buildTicketFromExtracted(extracted: ExtractedPost): CreateTicketInput {
  const cost =
    extracted.cost === "Free"
      ? 0
      : parseInt(extracted.cost.replace(/\D/g, ""), 10) || 0;

  return {
    name:
      extracted.food !== "—"
        ? `${extracted.food} — from post`
        : "Event food — from post",
    source: "Pasted post",
    cost,
    area: "quad",
    time: "now",
    walk: 2 + Math.floor(Math.random() * 8),
    where: extracted.location !== "—" ? extracted.location : "See post",
    ends:
      extracted.time !== "—"
        ? `ends ${extracted.time.split("–").pop()}`
        : "see post",
    access: extracted.access !== "—" ? extracted.access : "See post",
    worth: extracted.confidence >= 80 ? "high" : "maybe",
    status: "available",
    blurb: `Auto-read from a pasted event post. Confidence ${extracted.confidence}%. Double-check details when you arrive.`,
  };
}

export function extractFromPost(text: string): ExtractedPost {
  const foods = [
    "pizza",
    "bagel",
    "taco",
    "donut",
    "doughnut",
    "sandwich",
    "coffee",
    "snack",
    "burrito",
    "noodle",
    "curry",
    "sushi",
    "cookie",
    "cake",
    "wrap",
    "fruit",
    "salad",
  ];

  let food: string | null = null;
  for (const word of foods) {
    if (new RegExp(`\\b${word}`, "i").test(text)) {
      food = word.charAt(0).toUpperCase() + word.slice(1);
      break;
    }
  }

  let cost: string | null = null;
  let costColor = "#1B1712";
  if (/\bfree\b/i.test(text)) {
    cost = "Free";
    costColor = "#E5431E";
  } else {
    const match = text.match(/\$\s?\d+(\.\d{2})?/);
    if (match) cost = match[0].replace(/\s/, "");
  }

  let time: string | null = null;
  const times = text.match(/\d{1,2}(:\d{2})?\s?(am|pm)/gi);
  if (times) time = times.slice(0, 2).join("–").replace(/\s/g, "");

  let location: string | null = null;
  const roomMatch = text.match(
    /\b(Quad|Room|Rm|Hall|Bldg|Building)\s?#?\d{2,4}\b/i,
  );
  const placeMatch = text.match(
    /\b[A-Z][a-zA-Z]+\s(Hall|Atrium|Lounge|Commons|Union|Library|Center|House|Auditorium|Lawn)\b/,
  );
  if (roomMatch) location = roomMatch[0];
  else if (placeMatch) location = placeMatch[0];

  let access: string | null = null;
  if (/open to all|everyone|all (are )?welcome|no rsvp|first come/i.test(text)) {
    access = "Open to all";
  } else if (/member|rsvp|ticket|attendee|sign ?up|registration/i.test(text)) {
    access = "Members / RSVP";
  }

  const fields = { food, cost, time, location, access };
  const labels: Record<keyof typeof fields, string> = {
    food: "food",
    cost: "cost",
    time: "time",
    location: "location",
    access: "access rule",
  };

  const missing = (Object.keys(fields) as (keyof typeof fields)[])
    .filter((key) => !fields[key])
    .map((key) => labels[key]);

  const found = 5 - missing.length;
  const confidence = Math.round((found / 5) * 100);

  let confLabel: ExtractedPost["confLabel"] = "LOW";
  let confColor = STATUS_COLORS.gone;
  if (confidence >= 80) {
    confLabel = "HIGH";
    confColor = STATUS_COLORS.available;
  } else if (confidence >= 50) {
    confLabel = "MEDIUM";
    confColor = STATUS_COLORS.maybe;
  }

  return {
    food: food ?? "—",
    cost: cost ?? "—",
    costColor,
    time: time ?? "—",
    location: location ?? "—",
    access: access ?? "—",
    confidence,
    confLabel,
    confColor,
    missing,
    missingText: missing.join(", "),
    hasMissing: missing.length > 0,
  };
}

export function generateTicketNumber(): string {
  return String(1000 + Math.floor(Math.random() * 8999));
}

export function createTicketId(prefix: "u" | "p" | "t"): string {
  return `${prefix}${Date.now()}`;
}

/** Seed data copied from the original prototype — backend starts with these. */
export const SEED_TICKETS: Ticket[] = [
  {
    id: "t1",
    no: "1043",
    name: "Free Pizza — Sponsor Night",
    source: "CS Club",
    cost: 0,
    area: "quad",
    time: "now",
    walk: 6,
    where: "Quad 1043",
    ends: "ends 2:00pm",
    access: "Open to attendees",
    confirmed: "8 min ago",
    worth: "high",
    status: "available",
    blurb:
      "Sponsor bought 40 pies for the info session. Grab a slice at the back tables — no sign-in checked at the door.",
  },
  {
    id: "t2",
    no: "0210",
    name: "Bagels & Coffee — Dept Mixer",
    source: "Physics Dept",
    cost: 0,
    area: "library",
    time: "now",
    walk: 3,
    where: "Library Atrium",
    ends: "ends 11:30am",
    access: "Open to all",
    confirmed: "2 min ago",
    worth: "high",
    status: "available",
    blurb:
      "Morning mixer spread. Fresh bagels, cream cheese, and a full coffee urn. Closest free food to the main study floors.",
  },
  {
    id: "t7",
    no: "0330",
    name: "Free Snacks — Study Lounge",
    source: "Library Services",
    cost: 0,
    area: "library",
    time: "now",
    walk: 4,
    where: "Library 3F",
    ends: "restocks hourly",
    access: "Open to all",
    confirmed: "12 min ago",
    worth: "high",
    status: "available",
    blurb:
      "Finals-week snack station: granola bars, clementines, pretzels. Restocked on the hour by front-desk staff.",
  },
  {
    id: "t3",
    no: "5521",
    name: "$2 Grilled Cheese — Co-op",
    source: "Student Co-op",
    cost: 2,
    area: "lower",
    time: "now",
    walk: 11,
    where: "Lower Commons",
    ends: "until sold out",
    access: "Cash only",
    confirmed: "20 min ago",
    worth: "maybe",
    status: "available",
    blurb:
      "Co-op fundraiser griddle. Two bucks, cash in the jar. Worth it if you were already headed to Lower Campus.",
  },
  {
    id: "t4",
    no: "7788",
    name: "Leftover Sandwiches — Career Fair",
    source: "Career Center",
    cost: 0,
    area: "quad",
    time: "now",
    walk: 8,
    where: "Union Hall 2F",
    ends: "ends 1:00pm",
    access: "Open to all",
    confirmed: "35 min ago",
    worth: "maybe",
    status: "maybe",
    blurb:
      "Boxed sandwiches left over from the recruiter lunch. Going fast — last confirmed count was about a dozen.",
  },
  {
    id: "t6",
    no: "3102",
    name: "$5 Taco Bar — Cultural Night",
    source: "Latin Student Union",
    cost: 5,
    area: "lower",
    time: "today",
    walk: 14,
    where: "International House",
    ends: "starts 6:00pm",
    access: "Ticketed at door",
    confirmed: "1 hr ago",
    worth: "maybe",
    status: "available",
    blurb:
      "Full taco bar tonight. Five dollars gets you a plate and a drink. Long walk, but a real meal — not just snacks.",
  },
  {
    id: "t5",
    no: "9014",
    name: "Free Donuts — Frat Tabling",
    source: "Sigma Chi",
    cost: 0,
    area: "quad",
    time: "now",
    walk: 5,
    where: "Quad Lawn",
    ends: "gone",
    access: "Open to all",
    confirmed: "1 min ago",
    worth: "low",
    status: "gone",
    blurb:
      "Tabling giveaway that just wrapped. Box was reported empty a minute ago — skip it unless you are already passing by.",
  },
];

export type { TimeWindow };
