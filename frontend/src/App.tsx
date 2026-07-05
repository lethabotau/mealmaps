import { useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  buildTicketFromExtracted,
  filterTickets,
  toTicketView,
  type ExtractedPost,
  type Filters,
  type ReportKind,
  type Screen,
} from "@mealmap/shared";
import { AddFoodModal } from "./components/AddFoodModal";
import { DashboardView } from "./components/DashboardView";
import { DetailPanel } from "./components/DetailPanel";
import { Header } from "./components/Header";
import { PasteView } from "./components/PasteView";
import { RankedView } from "./components/RankedView";
import { useTickets } from "./hooks/useTickets";
import { REPORT_TOAST, buildFilterGroups } from "./lib/uiHelpers";

export default function App() {
  const { tickets, overrides, confirm, loading, error, addTicket, submitReport } =
    useTickets();

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const filtered = useMemo(
    () => filterTickets(tickets, filters, overrides),
    [tickets, filters, overrides],
  );

  const views = useMemo(
    () => filtered.map((ticket) => toTicketView(ticket, overrides, confirm)),
    [filtered, overrides, confirm],
  );

  const rankedTickets = useMemo(
    () => views.map((view, index) => ({ ...view, rank: index + 1 })),
    [views],
  );

  const filterGroups = useMemo(
    () =>
      buildFilterGroups(filters, (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
      }),
    [filters],
  );

  const detailTicket = detailId
    ? views.find((view) => view.id === detailId) ?? null
    : null;

  const handleReport = async (kind: ReportKind) => {
    if (!detailId) return;
    await submitReport(detailId, kind);
    setToast(REPORT_TOAST[kind] ?? "Thanks for the update!");
  };

  const handlePostFromPaste = async (extracted: ExtractedPost) => {
    await addTicket(buildTicketFromExtracted(extracted));
  };

  if (loading) {
    return (
      <div className="mm-page mm-container" style={{ paddingTop: 80 }}>
        Loading campus food pass…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mm-page mm-container" style={{ paddingTop: 80 }}>
        <h2>Could not reach the MealMap backend</h2>
        <p style={{ fontFamily: "Space Mono, monospace", color: "#8a7d6c" }}>
          {error}
        </p>
        <p>
          Run <code>npm run dev</code> from the repo root to start frontend +
          backend together.
        </p>
      </div>
    );
  }

  return (
    <div className="mm-page">
      <div className="mm-container">
        <Header
          screen={screen}
          onGoDash={() => setScreen("dashboard")}
          onGoResults={() => setScreen("results")}
          onGoPaste={() => setScreen("paste")}
          onOpenAdd={() => setModalOpen(true)}
        />

        {screen === "dashboard" && (
          <DashboardView
            filterGroups={filterGroups}
            bestTickets={views.slice(0, 3)}
            resultCount={views.length}
            onOpenAdd={() => setModalOpen(true)}
            onGoPaste={() => setScreen("paste")}
            onGoResults={() => setScreen("results")}
            onClearFilters={() =>
              setFilters({ budget: "u10", time: "today", area: "anywhere" })
            }
            onSelectTicket={(id) => {
              setDetailId(id);
              setToast("");
            }}
          />
        )}

        {screen === "results" && (
          <RankedView
            filterGroups={filterGroups}
            rankedTickets={rankedTickets}
            resultCount={views.length}
            onGoDash={() => setScreen("dashboard")}
            onClearFilters={() =>
              setFilters({ budget: "u10", time: "today", area: "anywhere" })
            }
            onOpenAdd={() => setModalOpen(true)}
            onSelectTicket={(id) => {
              setDetailId(id);
              setToast("");
            }}
          />
        )}

        {screen === "paste" && (
          <PasteView
            onGoDash={() => setScreen("dashboard")}
            onPostTicket={handlePostFromPaste}
          />
        )}
      </div>

      {detailTicket && (
        <DetailPanel
          ticket={detailTicket}
          toast={toast}
          onClose={() => setDetailId(null)}
          onReport={(kind) => void handleReport(kind)}
        />
      )}

      {modalOpen && (
        <AddFoodModal
          onClose={() => setModalOpen(false)}
          onSubmit={addTicket}
          onFinish={() => {
            setModalOpen(false);
            setScreen("results");
          }}
        />
      )}
    </div>
  );
}
