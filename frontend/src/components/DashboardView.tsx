import type { CampusArea, TicketView } from "@mealmap/shared";
import type { FilterGroup } from "../lib/uiHelpers";
import { EmptyState } from "./EmptyState";
import { NowServingBoard } from "./NowServingBoard";
import { OrderSlipBar } from "./OrderSlipBar";
import { TicketCard } from "./TicketCard";

interface DashboardViewProps {
  vantage: CampusArea;
  onVantageChange: (value: CampusArea) => void;
  filterGroups: FilterGroup[];
  railPreview: TicketView[];
  gridTickets: TicketView[];
  resultCount: number;
  onOpenAdd: () => void;
  onGoPaste: () => void;
  onGoResults: () => void;
  onClearFilters: () => void;
  onSelectTicket: (id: string) => void;
}

export function DashboardView({
  vantage,
  onVantageChange,
  filterGroups,
  railPreview,
  gridTickets,
  resultCount,
  onOpenAdd,
  onGoPaste,
  onGoResults,
  onClearFilters,
  onSelectTicket,
}: DashboardViewProps) {
  const hasResults = resultCount > 0;

  return (
    <section className="mm-fade-up">
      <div className="mm-hero">
        <div className="mm-hero-copy">
          <div className="mm-hero-eyebrow">// WHAT CAN I EAT RIGHT NOW?</div>
          <h1 className="mm-hero-headline">
            Free &amp; cheap food on campus, ranked by what&apos;s worth walking
            to.
          </h1>
          <div className="mm-hero-actions">
            <button type="button" onClick={onOpenAdd} className="mm-hero-cta">
              Spotted food? Add it in 10 seconds
            </button>
            <button type="button" onClick={onGoPaste} className="mm-hero-paste">
              or paste an event post →
            </button>
          </div>
        </div>

        <div className="mm-hero-board">
          <NowServingBoard tickets={railPreview} onSelectTicket={onSelectTicket} />
        </div>
      </div>

      <OrderSlipBar
        vantage={vantage}
        onVantageChange={onVantageChange}
        filterGroups={filterGroups}
      />

      <div className="mm-section-head">
        <h2 className="mm-section-title">Best options right now</h2>
        <button
          type="button"
          onClick={onGoResults}
          className="mm-text-link"
          style={{ color: "#E5431E", borderBottom: "2px solid #E5431E" }}
        >
          SEE ALL {resultCount} RANKED →
        </button>
      </div>

      {hasResults ? (
        <div className="mm-ticket-grid">
          {gridTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onSelectTicket(ticket.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onClearFilters={onClearFilters} onOpenAdd={onOpenAdd} />
      )}
    </section>
  );
}
