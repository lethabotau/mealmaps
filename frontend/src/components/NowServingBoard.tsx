import type { TicketView } from "@mealmap/shared";
import { ALLERGEN_LABELS, dietaryBadgeFor } from "@mealmap/shared";

interface NowServingBoardProps {
  tickets: TicketView[];
  onSelectTicket: (id: string) => void;
}

const STUB_ROTATIONS = [-3.5, 2.2, -1.8];
const STUB_OFFSETS = [
  { top: 0, left: 0 },
  { top: 8, left: 12 },
  { top: 14, left: 22 },
];

function walkLine(ticket: TicketView): string {
  if (!ticket.showWalk) return "off campus";
  if (ticket.walk == null) return "? min";
  return `${ticket.walk} min`;
}

function stampLabel(ticket: TicketView): string {
  return ticket.trust === "unverified" ? "UNVERIFIED" : ticket.worthLabel;
}

function stampColor(ticket: TicketView): string {
  return ticket.trust === "unverified" ? "#B7791F" : ticket.worthColor;
}

function dietaryAriaSuffix(ticket: TicketView): string {
  if (dietaryBadgeFor(ticket) !== "conflict" || !ticket.dietary) return "";
  const allergens = ticket.dietary.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ");
  return `. Contains ${allergens}`;
}

export function NowServingBoard({ tickets, onSelectTicket }: NowServingBoardProps) {
  return (
    <div className="mm-now-serving">
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "2px",
          color: "#E5431E",
          marginBottom: 10,
        }}
      >
        /// NOW SERVING
      </div>
      <div className="mm-now-serving-rail">
        {tickets.length === 0 ? (
          <div className="mm-now-serving-empty">
            Nothing on the pass yet — check filters or add food.
          </div>
        ) : (
          tickets.map((ticket, index) => (
            <button
              key={ticket.id}
              type="button"
              className="mm-now-serving-stub"
              aria-label={`Open ${ticket.name}${dietaryAriaSuffix(ticket)}`}
              onClick={() => onSelectTicket(ticket.id)}
              style={{
                ["--stub-rotate" as string]: `${STUB_ROTATIONS[index] ?? -2}deg`,
                transform: `rotate(${STUB_ROTATIONS[index] ?? -2}deg)`,
                top: STUB_OFFSETS[index]?.top ?? 0,
                left: STUB_OFFSETS[index]?.left ?? 0,
                zIndex: tickets.length - index,
              }}
            >
              <div className="mm-now-serving-stub-top">
                <span
                  className="mm-now-serving-status"
                  style={{
                    borderColor: ticket.statusColor,
                    color: ticket.statusColor,
                  }}
                >
                  {ticket.statusLabel}
                </span>
                <span className="mm-now-serving-walk">{walkLine(ticket)}</span>
              </div>
              <span className="mm-now-serving-name">{ticket.name}</span>
              {dietaryBadgeFor(ticket) === "conflict" && (
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    fontWeight: 600,
                    color: "var(--mm-red)",
                  }}
                >
                  ⚠ allergen
                </span>
              )}
              <div className="mm-now-serving-stub-bottom">
                <span
                  className="mm-now-serving-cost"
                  style={{ color: ticket.costColor }}
                >
                  {ticket.costLabel}
                </span>
                <span
                  className="mm-now-serving-stamp"
                  style={{
                    color: stampColor(ticket),
                    borderColor: stampColor(ticket),
                  }}
                >
                  {stampLabel(ticket)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
