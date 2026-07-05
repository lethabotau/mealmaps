import type { TicketView } from "@mealmap/shared";

interface TicketCardProps {
  ticket: TicketView;
  onClick: () => void;
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        background: "#FBF7EE",
        border: "2.5px solid #1B1712",
        borderRadius: "15px 12px 16px 13px",
        boxShadow: "4px 5px 0 rgba(27,23,18,0.88)",
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr 116px",
        overflow: "hidden",
        transition: "transform .12s ease, box-shadow .12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translate(-2px,-2px)";
        e.currentTarget.style.boxShadow = "7px 9px 0 rgba(27,23,18,0.9)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "4px 5px 0 rgba(27,23,18,0.88)";
      }}
    >
      <div
        style={{
          padding: "15px 15px 15px 17px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            fontFamily: "Space Mono, monospace",
            fontSize: 11,
            letterSpacing: "1px",
            color: "#7a6f61",
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
              fontWeight: 700,
              letterSpacing: "1.5px",
            }}
          >
            {ticket.statusLabel}
          </span>
        </div>
        <div
          style={{
            fontFamily: "Archivo",
            fontWeight: 800,
            fontSize: 20,
            lineHeight: 1.05,
            letterSpacing: "-0.4px",
            color: "#1B1712",
          }}
        >
          {ticket.name}
        </div>
        <div
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 12,
            color: "#8a7d6c",
          }}
        >
          via {ticket.source}
        </div>
        <div
          style={{
            borderTop: "2px dashed #d9cdb5",
            margin: "3px 0 1px",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "5px 12px",
            fontFamily: "Space Mono, monospace",
            fontSize: 12,
          }}
        >
          <span style={{ color: "#9a8d7a" }}>COST</span>
          <span style={{ color: ticket.costColor, fontWeight: 700 }}>
            {ticket.costLabel}
          </span>
          <span style={{ color: "#9a8d7a" }}>WHERE</span>
          <span style={{ color: "#1B1712" }}>{ticket.where}</span>
          <span style={{ color: "#9a8d7a" }}>ENDS</span>
          <span style={{ color: ticket.endsColor, fontWeight: 700 }}>
            {ticket.ends}
          </span>
          <span style={{ color: "#9a8d7a" }}>ACCESS</span>
          <span style={{ color: "#1B1712" }}>{ticket.access}</span>
          <span style={{ color: "#9a8d7a" }}>SEEN</span>
          <span style={{ color: "#1B1712" }}>{ticket.confirmed}</span>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          borderLeft: "2px dashed #1B1712",
          background: "#F5EDDC",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "15px 6px",
          gap: 8,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -9,
            top: -9,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#F1E9D8",
            border: "2.5px solid #1B1712",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -9,
            bottom: -9,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#F1E9D8",
            border: "2.5px solid #1B1712",
          }}
        />
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontWeight: 700,
              fontSize: 27,
              color: "#1B1712",
              lineHeight: 1,
            }}
          >
            {ticket.walk}
          </div>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 9,
              letterSpacing: "1px",
              color: "#8a7d6c",
              marginTop: 2,
            }}
          >
            MIN WALK
          </div>
        </div>
        <div
          style={{
            fontFamily: "Archivo",
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: "0.4px",
            color: ticket.worthColor,
            border: `2.5px solid ${ticket.worthColor}`,
            borderRadius: 6,
            padding: "5px 6px",
            textAlign: "center",
            transform: "rotate(-7deg)",
            lineHeight: 1.05,
          }}
        >
          {ticket.worthLabel}
        </div>
        <div
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 9,
            letterSpacing: "1px",
            color: "#8a7d6c",
          }}
        >
          DETAILS →
        </div>
      </div>
    </div>
  );
}
