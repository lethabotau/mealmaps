import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { SignIn, useAuth } from "@clerk/clerk-react";
import type { ReportKind } from "@mealmap/shared";

export type PendingAction =
  | { type: "add-food" }
  | { type: "report"; kind: ReportKind }
  | { type: "paste-submit" }
  | { type: "ask" };

const PENDING_STORAGE_KEY = "mealmap:pending-action";
const DISMISS_CLEAR_MS = 450;
const RESUME_DELAY_MS = 80;

function parsePending(raw: string): PendingAction | null {
  try {
    const data = JSON.parse(raw) as PendingAction;
    if (data.type === "add-food") return { type: "add-food" };
    if (data.type === "report" && data.kind) return data;
    if (data.type === "paste-submit") return { type: "paste-submit" };
    if (data.type === "ask") return { type: "ask" };
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function readStoredPending(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return null;
    return parsePending(raw);
  } catch {
    return null;
  }
}

function writeStoredPending(action: PendingAction) {
  try {
    sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(action));
  } catch {
    /* ignore quota / private mode */
  }
}

function clearStoredPending() {
  try {
    sessionStorage.removeItem(PENDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface AuthSignInOverlayProps {
  open: boolean;
  onDismiss: () => void;
}

export function AuthSignInOverlay({ open, onDismiss }: AuthSignInOverlayProps) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onDismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(27,23,18,0.45)",
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 101,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            width: "min(420px, 100%)",
            maxHeight: "90vh",
            overflow: "auto",
            background: "#FBF7EE",
            border: "3px solid #1B1712",
            borderRadius: 12,
            boxShadow: "8px 8px 0 rgba(27,23,18,0.85)",
          }}
        >
          <SignIn routing="virtual" />
        </div>
      </div>
    </>
  );
}

export function useAuthGate(onResume: (action: PendingAction) => void) {
  const { isSignedIn, isLoaded } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const pendingRef = useRef<PendingAction | null>(null);
  const isSignedInRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const onResumeRef = useRef(onResume);

  isSignedInRef.current = Boolean(isSignedIn);

  useEffect(() => {
    onResumeRef.current = onResume;
  }, [onResume]);

  const setPending = useCallback((action: PendingAction) => {
    pendingRef.current = action;
    writeStoredPending(action);
  }, []);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    clearStoredPending();
  }, []);

  const cancelDismissClear = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const cancelResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const runResume = useCallback(
    (pending: PendingAction) => {
      cancelResumeTimer();
      clearPending();
      setSignInOpen(false);
      cancelDismissClear();

      resumeTimerRef.current = window.setTimeout(() => {
        resumeTimerRef.current = null;
        onResumeRef.current(pending);
      }, RESUME_DELAY_MS);
    },
    [cancelDismissClear, cancelResumeTimer, clearPending],
  );

  const tryResumePending = useCallback(() => {
    if (!isLoaded || !isSignedIn) return;

    const pending = pendingRef.current ?? readStoredPending();
    if (!pending) return;

    runResume(pending);
  }, [isLoaded, isSignedIn, runResume]);

  const gate = useCallback(
    (pending: PendingAction, action: () => void | Promise<void>) => {
      if (isSignedIn) {
        return action();
      }
      cancelDismissClear();
      setPending(pending);
      setSignInOpen(true);
    },
    [cancelDismissClear, isSignedIn, setPending],
  );

  const closeSignIn = useCallback(() => {
    setSignInOpen(false);
    cancelDismissClear();

    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null;
      if (!isSignedInRef.current) {
        clearPending();
      }
    }, DISMISS_CLEAR_MS);
  }, [cancelDismissClear, clearPending]);

  useEffect(() => {
    tryResumePending();
  }, [tryResumePending]);

  useEffect(
    () => () => {
      cancelDismissClear();
      cancelResumeTimer();
    },
    [cancelDismissClear, cancelResumeTimer],
  );

  return { gate, signInOpen, closeSignIn };
}
