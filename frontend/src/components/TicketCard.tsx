import type { TicketView } from "@mealmap/shared";
import { ALLERGEN_LABELS, dietaryBadgeFor, SYSTEM_INGEST_USER } from "@mealmap/shared";

interface TicketCardProps {
  ticket: TicketView;
  onClick: () => void;
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const isAutoSource = ticket.createdBy.userId === SYSTEM_INGEST_USER.userId;
  const dietaryBadge = dietaryBadgeFor(ticket);
  return (
    <button
      type="button"
      className="mm-ticket-card"
      onClick={onClick}
      onMouseEnter={(e) => {
        if (window.matchMedia("(hover: hover)").matches) {
          e.currentTarget.style.transform = "translate(-2px,-2px)";
          e.currentTarget.style.boxShadow = "7px 9px 0 rgba(27,23,18,0.9)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div className="mm-ticket-card-body">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "1px",
            color: "#5f5344",
          }}
        >
          <span>NO. {ticket.no}</span>
          <span
            style={{
              border: `1.5px solid ${ticket.statusColor}`,
              color: ticket.statusColor,
              padding: "2px 6px",
              borderRadius: 4,
              transform: "rotate(-2.5deg)",
              fontWeight: 500,
              letterSpacing: "1.5px",
            }}
          >
            {ticket.statusLabel}
          </span>
        </div>
        <div className="mm-ticket-card-name">{ticket.name}</div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#665a4a",
            overflowWrap: "anywhere",
          }}
        >
          {isAutoSource
            ? `via ${ticket.createdBy.displayName} · ${ticket.source}`
            : `via ${ticket.source}`}
        </div>
        <div
          style={{
            borderTop: "2px dashed #d9cdb5",
            margin: "3px 0 1px",
          }}
        />
        <div className="mm-ticket-card-fields">
          <span style={{ color: "#6b5f4f" }}>COST</span>
          <span style={{ color: ticket.costColor, fontWeight: 500 }}>
            {ticket.costLabel}
          </span>
          <span style={{ color: "#6b5f4f" }}>WHERE</span>
          <span
            style={{
              color: ticket.isPinnable ? "#E5431E" : "#1B1712",
              fontWeight: ticket.isPinnable ? 500 : 400,
            }}
          >
            {ticket.whereDisplay}
          </span>
          <span style={{ color: "#6b5f4f" }}>{ticket.timeLabel}</span>
          <span style={{ color: ticket.timeColor, fontWeight: 500 }}>
            {ticket.timeText}
          </span>
          <span style={{ color: "#6b5f4f" }}>ACCESS</span>
          <span style={{ color: "#1B1712" }}>{ticket.access}</span>
          <span style={{ color: "#6b5f4f" }}>SEEN</span>
          <span style={{ color: "#1B1712" }}>{ticket.confirmed}</span>
        </div>
        {dietaryBadge === "conflict" && ticket.dietary && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--mm-red)",
            }}
          >
            ⚠ Contains{" "}
            {ticket.dietary.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ")}
          </div>
        )}
        {dietaryBadge === "unconfirmed" && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--mm-amber)",
            }}
          >
            Dietary info unconfirmed
          </div>
        )}
      </div>

      <div className="mm-ticket-card-stub">
        <div className="mm-ticket-card-stub-hole mm-ticket-card-stub-hole--top" />
        <div className="mm-ticket-card-stub-hole mm-ticket-card-stub-hole--bottom" />
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              fontSize: ticket.walk === null ? 22 : 27,
              color: ticket.walk === null ? "#a89a86" : "#1B1712",
              lineHeight: 1,
            }}
          >
            {ticket.showWalk ? (ticket.walk === null ? "—" : ticket.walk) : "—"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "1px",
              color: "#665a4a",
              marginTop: 2,
            }}
          >
            {ticket.walkStubLabel}
          </div>
        </div>
        <div
          className="mm-ticket-card-stub-stamp"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: ticket.isPossibleFood ? 11 : 14,
            letterSpacing: "0.3px",
            color: ticket.stampColor,
            border: `2.5px solid ${ticket.stampColor}`,
            borderRadius: 6,
            padding: ticket.isPossibleFood ? "5px 5px" : "5px 6px",
            textAlign: "center",
            transform: "rotate(-7deg)",
            lineHeight: 1.05,
            flexShrink: 0,
          }}
        >
          {ticket.stampLabel}
        </div>
        {ticket.foodConfirmPrompt && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.5px",
              color: "#B7791F",
              flexShrink: 0,
              textAlign: "right",
              maxWidth: 120,
              lineHeight: 1.2,
            }}
          >
            {ticket.foodConfirmPrompt}
          </div>
        )}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "1px",
            color: "#665a4a",
            flexShrink: 0,
          }}
        >
          DETAILS →
        </div>
      </div>
    </button>
  );
}
