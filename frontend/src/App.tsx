import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
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
import { configureAuthTokenGetter } from "./api/auth";
import { AddFoodModal } from "./components/AddFoodModal";
import { AssistantView } from "./components/AssistantView";
import { DashboardView } from "./components/DashboardView";
import { DetailPanel } from "./components/DetailPanel";
import { Header } from "./components/Header";
import { PasteView } from "./components/PasteView";
import { RankedView } from "./components/RankedView";
import {
  type PendingAction,
  AuthSignInOverlay,
  useAuthGate,
} from "./hooks/useAuthGate";
import { useTickets } from "./hooks/useTickets";
import { REPORT_TOAST, buildFilterGroups } from "./lib/uiHelpers";

export default function App() {
  const { getToken } = useAuth();
  const { tickets, overrides, confirm, loading, error, addTicket, submitReport } =
    useTickets();

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [pasteResumeToken, setPasteResumeToken] = useState(0);

  const handleReport = useCallback(
    async (kind: ReportKind) => {
      if (!detailId) return;
      await submitReport(detailId, kind);
      setToast(REPORT_TOAST[kind] ?? "Thanks for the update!");
    },
    [detailId, submitReport],
  );

  const handlePostFromPaste = useCallback(
    async (extracted: ExtractedPost) => {
      await addTicket(buildTicketFromExtracted(extracted));
    },
    [addTicket],
  );

  const handleResume = useCallback(
    (action: PendingAction) => {
      if (action.type === "add-food") {
        setModalOpen(true);
        return;
      }
      if (action.type === "report") {
        void handleReport(action.kind);
        return;
      }
      if (action.type === "paste-submit") {
        setPasteResumeToken((token) => token + 1);
        return;
      }
      if (action.type === "ask") {
        setScreen("assistant");
      }
    },
    [handleReport],
  );

  const { gate, signInOpen, closeSignIn } = useAuthGate(handleResume);

  useEffect(() => {
    configureAuthTokenGetter(() => getToken());
  }, [getToken]);

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

  const openAddModal = () =>
    gate({ type: "add-food" }, () => setModalOpen(true));

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
      <AuthSignInOverlay open={signInOpen} onDismiss={closeSignIn} />
      <div className="mm-container">
        <Header
          screen={screen}
          onGoDash={() => setScreen("dashboard")}
          onGoResults={() => setScreen("results")}
          onGoPaste={() => setScreen("paste")}
          onGoAssistant={() => setScreen("assistant")}
          onOpenAdd={openAddModal}
        />

        {screen === "dashboard" && (
          <DashboardView
            filterGroups={filterGroups}
            bestTickets={views.slice(0, 3)}
            resultCount={views.length}
            onOpenAdd={openAddModal}
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
            onOpenAdd={openAddModal}
            onSelectTicket={(id) => {
              setDetailId(id);
              setToast("");
            }}
          />
        )}

        {screen === "paste" && (
          <PasteView
            onGoDash={() => setScreen("dashboard")}
            resumeSubmitToken={pasteResumeToken}
            onPostTicket={async (extracted) => {
              await gate({ type: "paste-submit" }, () =>
                handlePostFromPaste(extracted),
              );
            }}
          />
        )}

        {screen === "assistant" && (
          <AssistantView
            gate={gate}
            tickets={views}
            onSelectTicket={(id) => {
              setDetailId(id);
              setToast("");
            }}
          />
        )}
      </div>

      {detailTicket && (
        <DetailPanel
          ticket={detailTicket}
          toast={toast}
          onClose={() => setDetailId(null)}
          onReport={(kind) =>
            gate({ type: "report", kind }, () => void handleReport(kind))
          }
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
