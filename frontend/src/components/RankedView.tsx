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
        <h1 className="mm-page-title">Ranked results</h1>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: "#8a7d6c",
          }}
        >
          {resultCount} on the pass
        </span>
      </div>
      <p
        style={{
          fontFamily: "var(--font-mono)",
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
        <div className="mm-ranked-list">
          <button type="button" onClick={onOpenAdd} className="mm-ranked-cta">
            + Found food
          </button>
          {rankedTickets.map((ticket) => (
            <div key={ticket.id} className="mm-ranked-row">
              <span className="mm-ranked-num">{ticket.rank}</span>
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
