import type { CampusArea, RankedTicketView } from "@mealmap/shared";
import type { FilterGroup } from "../lib/uiHelpers";
import { EmptyState } from "./EmptyState";
import { FilterBar } from "./FilterBar";
import { TicketCard } from "./TicketCard";
import { VantageBar } from "./VantageBar";

interface RankedViewProps {
  vantage: CampusArea;
  onVantageChange: (value: CampusArea) => void;
  filterGroups: FilterGroup[];
  rankedTickets: RankedTicketView[];
  resultCount: number;
  onGoDash: () => void;
  onClearFilters: () => void;
  onOpenAdd: () => void;
  onSelectTicket: (id: string) => void;
}

export function RankedView({
  vantage,
  onVantageChange,
  filterGroups,
  rankedTickets,
  resultCount,
  onGoDash,
  onClearFilters,
  onOpenAdd,
  onSelectTicket,
}: RankedViewProps) {
  const hasResults = rankedTickets.length > 0;

  return (
    <section className="mm-fade-up">
      <div style={{ margin: "26px 0 4px" }}>
        <button className="mm-link-back" onClick={onGoDash}>
          ← back to dashboard
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
          margin: "8px 0 4px",
        }}
      >
        <h1
          style={{
            fontFamily: "Archivo",
            fontWeight: 900,
            fontSize: "clamp(30px,4vw,44px)",
            letterSpacing: "-1.2px",
            margin: 0,
          }}
        >
          Ranked results
        </h1>
        <span
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 14,
            color: "#8a7d6c",
          }}
        >
          {resultCount} on the pass
        </span>
      </div>
      <p
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 12.5,
          color: "#8a7d6c",
          margin: "6px 0 20px",
          maxWidth: 600,
        }}
      >
        Sorted by worth-walking, then distance. Gone tickets sink to the bottom.
      </p>

      <VantageBar vantage={vantage} onChange={onVantageChange} />
      <div className="mm-panel" style={{ margin: "0 0 26px", padding: "16px 18px" }}>
        <FilterBar groups={filterGroups} embedded />
      </div>

      {hasResults ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: 760,
          }}
        >
          <button
            type="button"
            onClick={onOpenAdd}
            style={{
              alignSelf: "flex-start",
              fontFamily: "Archivo",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "0.2px",
              lineHeight: 1.25,
              textAlign: "left",
              background: "#FBF7EE",
              color: "#1B1712",
              border: "2.5px solid #1B1712",
              borderRadius: "10px 7px 10px 7px",
              boxShadow: "4px 4px 0 rgba(27,23,18,0.88)",
              cursor: "pointer",
              padding: "11px 18px",
              transform: "rotate(-1.5deg)",
            }}
          >
            + Found food
          </button>
          {rankedTickets.map((ticket) => (
            <div
              key={ticket.id}
              style={{ display: "flex", alignItems: "stretch", gap: 14 }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 40,
                  display: "flex",
                  justifyContent: "center",
                  paddingTop: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "Archivo",
                    fontWeight: 900,
                    fontSize: 34,
                    color: "#d8ccb4",
                    lineHeight: 1,
                  }}
                >
                  {ticket.rank}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TicketCard
                  ticket={ticket}
                  onClick={() => onSelectTicket(ticket.id)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState onClearFilters={onClearFilters} onOpenAdd={onOpenAdd} />
      )}
    </section>
  );
}
