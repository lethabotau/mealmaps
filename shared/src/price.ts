/** Parse all dollar amounts from a price string (e.g. "$0.00 - $6.37" → [0, 6.37]). */
export function parseDollarAmounts(price: string): number[] {
  const amounts: number[] = [];
  const re = /\$\s*(\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(price)) !== null) {
    amounts.push(parseFloat(match[1]));
  }
  return amounts;
}

/**
 * Map society event price text to integer dollar cost for filtering/sorting.
 * Explicit "Free" → 0. Multi-amount strings use the minimum (so "$0 - $6" is free).
 */
export function parseEventPriceToCost(price: string | null | undefined): number {
  const text = (price ?? "").trim();
  if (!text || /\bfree\b/i.test(text)) return 0;

  const amounts = parseDollarAmounts(text);
  if (amounts.length === 0) return 0;

  return Math.floor(Math.min(...amounts));
}

/** Coerce stored/API cost to a whole-dollar number. */
export function normalizeTicketCost(cost: unknown): number {
  if (cost === null || cost === undefined || cost === "") return 0;
  const n = typeof cost === "number" ? cost : Number(cost);
  if (Number.isNaN(n)) return 0;
  return Math.floor(n);
}

/** Robust free check — numeric 0 and string "0"; not falsy (`!cost`) semantics. */
export function isFreeCost(cost: unknown): boolean {
  return normalizeTicketCost(cost) === 0;
}

function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * When the source price is a range with a $0 floor, show the span in COST text
 * (e.g. "$0–$6.37"). Explicit "Free" and single $0 amounts stay plain FREE.
 */
export function formatPriceRangeLabel(
  sourcePrice: string | null | undefined,
): string | null {
  const text = (sourcePrice ?? "").trim();
  if (!text || /\bfree\b/i.test(text)) return null;

  const amounts = parseDollarAmounts(text);
  if (amounts.length < 2) return null;

  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min > 0 || max <= 0) return null;

  return `$${formatAmount(min)}–$${formatAmount(max)}`;
}

export function costDisplayFor(
  cost: unknown,
  sourcePrice?: string | null,
): { label: string; color: string } {
  const freeColor = "#E5431E";
  const paidColor = "#1B1712";
  const numericCost = normalizeTicketCost(cost);

  if (isFreeCost(numericCost)) {
    const rangeLabel = formatPriceRangeLabel(sourcePrice);
    if (rangeLabel) return { label: rangeLabel, color: freeColor };
    return { label: "FREE", color: freeColor };
  }

  return { label: `$${numericCost}`, color: paidColor };
}
