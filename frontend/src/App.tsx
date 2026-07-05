import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  DEFAULT_FILTERS,
  buildTicketFromExtracted,
  filterTickets,
  toTicketView,
  type CampusArea,
  type ExtractedPost,
  type ExtractResult,
  type Filters,
  type ReportKind,
  type Screen,
} from "@mealmap/shared";
import { configureAuthTokenGetter } from "./api/auth";
import { extractPost } from "./api/client";
import { AddFoodModal } from "./components/AddFoodModal";
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
import { layoutDashboardTickets } from "./lib/dashboardTickets";

export default function App() {
  const { getToken } = useAuth();
  const { tickets, overrides, confirm, loading, error, addTicket, submitReport } =
    useTickets();

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [vantage, setVantage] = useState<CampusArea>("upper");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [pasteResumeToken, setPasteResumeToken] = useState(0);
  const [pasteExtractToken, setPasteExtractToken] = useState(0);
  const [askResumeToken, setAskResumeToken] = useState(0);

  const handleReport = useCallback(
    async (kind: ReportKind, locationText?: string) => {
      if (!detailId) return;
      await submitReport(detailId, kind, locationText);
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
        void handleReport(action.kind, action.locationText);
        return;
      }
      if (action.type === "paste-extract") {
        setPasteExtractToken((token) => token + 1);
        return;
      }
      if (action.type === "paste-submit") {
        setPasteResumeToken((token) => token + 1);
        return;
      }
      if (action.type === "ask") {
        setScreen("dashboard");
        setAskResumeToken((token) => token + 1);
      }
    },
    [handleReport],
  );

  const { gate, signInOpen, closeSignIn } = useAuthGate(handleResume);

  useEffect(() => {
    configureAuthTokenGetter(() => getToken());
  }, [getToken]);

  const filtered = useMemo(
    () => filterTickets(tickets, filters, overrides, vantage),
    [tickets, filters, overrides, vantage],
  );

  const views = useMemo(
    () =>
      filtered.map((ticket) => toTicketView(ticket, overrides, confirm, vantage)),
    [filtered, overrides, confirm, vantage],
  );

  const { railPreview, gridTickets } = useMemo(
    () => layoutDashboardTickets(views),
    [views],
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
        <p style={{ fontFamily: "var(--font-mono)", color: "#8a7d6c" }}>
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
        <Header onGoDash={() => setScreen("dashboard")} />

        {screen === "dashboard" && (
          <DashboardView
            vantage={vantage}
            onVantageChange={setVantage}
            filterGroups={filterGroups}
            railPreview={railPreview}
            gridTickets={gridTickets}
            allTickets={views}
            resultCount={views.length}
            gate={gate}
            askResumeToken={askResumeToken}
            onOpenAdd={openAddModal}
            onGoPaste={() => setScreen("paste")}
            onGoResults={() => setScreen("results")}
            onClearFilters={() => setFilters(DEFAULT_FILTERS)}
            onSelectTicket={(id) => {
              setDetailId(id);
              setToast("");
            }}
          />
        )}

        {screen === "results" && (
          <RankedView
            vantage={vantage}
            onVantageChange={setVantage}
            filterGroups={filterGroups}
            rankedTickets={rankedTickets}
            resultCount={views.length}
            onGoDash={() => setScreen("dashboard")}
            onClearFilters={() => setFilters(DEFAULT_FILTERS)}
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
            resumeExtractToken={pasteExtractToken}
            resumeSubmitToken={pasteResumeToken}
            onExtract={async (text) => {
              let result: ExtractResult | null = null;
              await gate({ type: "paste-extract" }, async () => {
                result = await extractPost(text);
              });
              return result;
            }}
            onPostTicket={async (extracted) => {
              let posted = false;
              await gate({ type: "paste-submit" }, async () => {
                await handlePostFromPaste(extracted);
                posted = true;
              });
              return posted;
            }}
          />
        )}
      </div>

      {detailTicket && (
        <DetailPanel
          ticket={detailTicket}
          toast={toast}
          onClose={() => setDetailId(null)}
          onReport={(kind, locationText) =>
            gate({ type: "report", kind, locationText }, () =>
              void handleReport(kind, locationText),
            )
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
