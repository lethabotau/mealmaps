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
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 12,
              letterSpacing: "2px",
              color: "#E5431E",
              marginBottom: 12,
            }}
          >
            // WHAT CAN I EAT RIGHT NOW?
          </div>
          <h1
            style={{
              fontFamily: "Archivo",
              fontWeight: 900,
              fontSize: "clamp(34px,5vw,54px)",
              lineHeight: 1,
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            Free &amp; cheap food on campus, ranked by what&apos;s worth walking
            to.
          </h1>
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <button
              onClick={onOpenAdd}
              style={{
                fontFamily: "Archivo",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.2px",
                lineHeight: 1.25,
                textAlign: "left",
                background: "#FBF7EE",
                color: "#1B1712",
                border: "3px solid #1B1712",
                borderRadius: "11px 8px 11px 8px",
                boxShadow: "5px 5px 0 rgba(27,23,18,0.88)",
                cursor: "pointer",
                padding: "13px 20px",
                transform: "rotate(-2deg)",
                maxWidth: 280,
              }}
            >
              Spotted food? Add it in 10 seconds
            </button>
            <button
              onClick={onGoPaste}
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.5px",
                background: "none",
                border: "none",
                borderBottom: "2px solid #1B1712",
                cursor: "pointer",
                padding: "2px 2px",
                color: "#1B1712",
                marginLeft: 6,
              }}
            >
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

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          margin: "34px 0 16px",
        }}
      >
        <h2
          style={{
            fontFamily: "Archivo",
            fontWeight: 900,
            fontSize: "clamp(24px,3vw,32px)",
            letterSpacing: "-0.8px",
            margin: 0,
          }}
        >
          Best options right now
        </h2>
        <button
          onClick={onGoResults}
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.5px",
            background: "none",
            border: "none",
            borderBottom: "2px solid #E5431E",
            color: "#E5431E",
            cursor: "pointer",
            padding: 2,
          }}
        >
          SEE ALL {resultCount} RANKED →
        </button>
      </div>

      {hasResults ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
            gap: 18,
          }}
        >
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
