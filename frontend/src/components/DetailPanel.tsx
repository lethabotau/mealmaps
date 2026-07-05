import { useState } from "react";
import type { ReportKind, TicketView } from "@mealmap/shared";
import { SYSTEM_INGEST_USER } from "@mealmap/shared";

interface DetailPanelProps {
  ticket: TicketView;
  toast: string;
  onClose: () => void;
  onReport: (kind: ReportKind, locationText?: string) => void;
}

const REPORT_BUTTONS: Array<{ label: string; color: string; kind: ReportKind }> = [
  { label: "Still available", color: "#3C7A45", kind: "still" },
  { label: "Food gone", color: "#C0341D", kind: "gone" },
  { label: "Long queue", color: "#B7791F", kind: "queue" },
  { label: "Members only", color: "#B7791F", kind: "members" },
  { label: "Open to all", color: "#3C7A45", kind: "all" },
];

export function DetailPanel({ ticket, toast, onClose, onReport }: DetailPanelProps) {
  const isAutoSource = ticket.createdBy.userId === SYSTEM_INGEST_USER.userId;
  const isUnverified = ticket.trust === "unverified";
  const needsLocation = ticket.coords == null;
  const [pinText, setPinText] = useState("");
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(27,23,18,0.4)",
          zIndex: 39,
          animation: "mm-scrim .2s ease both",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(468px,100vw)",
          background: "#FBF7EE",
          borderLeft: "3px solid #1B1712",
          boxShadow: "-8px 0 24px rgba(27,23,18,0.25)",
          zIndex: 40,
          overflowY: "auto",
          animation: "mm-slideOver .28s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <div
          style={{
            background: "#1B1712",
            color: "#FBF7EE",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 12,
              letterSpacing: "2px",
            }}
          >
            TICKET · NO. {ticket.no}
          </span>
          <button
            onClick={onClose}
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 18,
              background: "none",
              border: "none",
              color: "#FBF7EE",
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "22px 20px 40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-block",
                  border: `1.5px solid ${ticket.statusColor}`,
                  color: ticket.statusColor,
                  padding: "2px 8px",
                  borderRadius: 4,
                  transform: "rotate(-2deg)",
                  fontFamily: "Space Mono, monospace",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "1.5px",
                  marginBottom: 10,
                }}
              >
                {ticket.statusLabel}
              </span>
              <h2
                style={{
                  fontFamily: "Archivo",
                  fontWeight: 900,
                  fontSize: 28,
                  lineHeight: 1.02,
                  letterSpacing: "-0.8px",
                  margin: 0,
                }}
              >
                {ticket.name}
              </h2>
              <div
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: 12.5,
                  color: "#8a7d6c",
                  marginTop: 7,
                }}
              >
                {isAutoSource
                  ? `via ${ticket.createdBy.displayName} · ${ticket.source}`
                  : `via ${ticket.source}`}
              </div>
            </div>
            {isUnverified ? (
              <div
                style={{
                  flexShrink: 0,
                  textAlign: "center",
                  fontFamily: "Archivo",
                  fontWeight: 900,
                  fontSize: 13,
                  color: "#B7791F",
                  border: "3px solid #B7791F",
                  borderRadius: 8,
                  padding: "8px 10px",
                  transform: "rotate(-6deg)",
                  lineHeight: 1.05,
                }}
              >
                UNVERIFIED
                <div
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontWeight: 400,
                    fontSize: 8,
                    letterSpacing: "1px",
                    color: "#B7791F",
                    marginTop: 3,
                  }}
                >
                  NOT YET CONFIRMED
                </div>
              </div>
            ) : (
              <div
                style={{
                  flexShrink: 0,
                  textAlign: "center",
                  fontFamily: "Archivo",
                  fontWeight: 900,
                  fontSize: 16,
                  color: ticket.worthColor,
                  border: `3px solid ${ticket.worthColor}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                  transform: "rotate(-6deg)",
                  lineHeight: 1.05,
                }}
              >
                {ticket.worthLabel}
                <div
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontWeight: 400,
                    fontSize: 8,
                    letterSpacing: "1px",
                    color: ticket.worthColor,
                    marginTop: 3,
                  }}
                >
                  WORTH WALKING
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              margin: "22px 0",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "10px 16px",
              fontFamily: "Space Mono, monospace",
              fontSize: 13.5,
              borderTop: "2px dashed #d9cdb5",
              borderBottom: "2px dashed #d9cdb5",
              padding: "16px 0",
            }}
          >
            <span style={{ color: "#9a8d7a" }}>COST</span>
            <span style={{ fontWeight: 700, color: ticket.costColor }}>
              {ticket.costLabel}
            </span>
            <span style={{ color: "#9a8d7a" }}>WHERE</span>
            <span style={{ color: "#1B1712" }}>{ticket.where}</span>
            <span style={{ color: "#9a8d7a" }}>WALK</span>
            <span style={{ color: "#1B1712" }}>
              {ticket.walk === null
                ? "walk unknown — location unconfirmed"
                : `${ticket.walk} min`}
            </span>
            <span style={{ color: "#9a8d7a" }}>ENDS</span>
            <span style={{ fontWeight: 700, color: ticket.endsColor }}>
              {ticket.ends}
            </span>
            <span style={{ color: "#9a8d7a" }}>ACCESS</span>
            <span style={{ color: "#1B1712" }}>{ticket.access}</span>
            <span style={{ color: "#9a8d7a" }}>SEEN</span>
            <span style={{ color: "#1B1712" }}>{ticket.confirmed}</span>
          </div>

          <p
            style={{
              fontFamily: "Archivo",
              fontSize: 15,
              lineHeight: 1.5,
              color: "#4A423A",
              margin: "0 0 22px",
            }}
          >
            {ticket.blurb}
          </p>

          {ticket.sourceUrl && (
            <a
              href={ticket.sourceUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                fontFamily: "Space Mono, monospace",
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: "0.5px",
                color: "#1B1712",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                margin: "0 0 22px",
              }}
            >
              check event page →
            </a>
          )}

          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 11,
              letterSpacing: "2px",
              color: "#8a7d6c",
              marginBottom: 12,
            }}
          >
            — REPORT WHAT YOU SEE —
          </div>

          {needsLocation && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "Space Mono, monospace",
                  fontSize: 11.5,
                  color: "#8a7d6c",
                  marginBottom: 6,
                }}
              >
                Where exactly? (optional — helps with "Still available")
              </label>
              <input
                value={pinText}
                onChange={(e) => setPinText(e.target.value)}
                placeholder="e.g. Quad 1043"
                style={{
                  width: "100%",
                  fontFamily: "Space Mono, monospace",
                  fontSize: 13.5,
                  background: "#FFFDF7",
                  border: "2px solid #1B1712",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {REPORT_BUTTONS.map((button) => (
              <button
                key={button.kind}
                onClick={() =>
                  onReport(
                    button.kind,
                    button.kind === "still"
                      ? pinText.trim() || undefined
                      : undefined,
                  )
                }
                style={{
                  fontFamily: "Archivo",
                  fontWeight: 700,
                  fontSize: 13.5,
                  background: "#FFFDF7",
                  color: button.color,
                  border: `2.5px solid ${button.color}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  padding: "11px 8px",
                }}
              >
                {button.label}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 22,
              padding: "14px 16px",
              background: "#F5EDDC",
              border: "2px solid #1B1712",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: 12.5,
                color: "#1B1712",
              }}
            >
              Confirmed by {ticket.confirmCount} students · last checked{" "}
              {ticket.lastChecked}
            </div>
          </div>

          {toast && (
            <div
              style={{
                marginTop: 14,
                fontFamily: "Archivo",
                fontWeight: 700,
                fontSize: 14,
                color: "#3C7A45",
                background: "#eaf3e7",
                border: "2px solid #3C7A45",
                borderRadius: 8,
                padding: "11px 14px",
                animation: "mm-fadeUp .25s ease both",
              }}
            >
              {toast}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
