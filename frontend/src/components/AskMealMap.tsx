import { useEffect, useState } from "react";
import type { TicketView } from "@mealmap/shared";
import { useAssistant } from "../hooks/useAssistant";
import type { PendingAction } from "../hooks/useAuthGate";

interface AskMealMapProps {
  gate: (action: PendingAction, run: () => void | Promise<void>) => void;
  tickets: TicketView[];
  onSelectTicket: (id: string) => void;
  resumeToken?: number;
}

const HINTS: Record<string, string> = {
  idle: "Ask what's worth walking to — e.g. “Any free pizza near the library?”",
  listening: "Listening… speak now",
  thinking: "Thinking…",
  speaking: "Answering…",
  error: "Something went wrong — tap the mic or try again",
};

export function AskMealMap({
  gate,
  tickets,
  onSelectTicket,
  resumeToken = 0,
}: AskMealMapProps) {
  const {
    status,
    transcript,
    answer,
    citedTicketIds,
    error,
    sttSupported,
    ask,
    startListening,
    stopListening,
  } = useAssistant();
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (resumeToken > 0) {
      startListening();
    }
  }, [resumeToken, startListening]);

  const orbClass = `mm-orb mm-orb--compact${
    status === "idle" ? "" : ` is-${status}`
  }`;

  const handleOrb = () => {
    if (status === "listening") {
      stopListening();
      return;
    }
    if (status === "thinking" || status === "speaking") return;
    gate({ type: "ask" }, startListening);
  };

  const submitTyped = (event: React.FormEvent) => {
    event.preventDefault();
    const question = typed.trim();
    if (!question) return;
    setTyped("");
    gate({ type: "ask" }, () => ask(question));
  };

  const cited = citedTicketIds
    .map((id) => tickets.find((t) => t.id === id))
    .filter((t): t is TicketView => Boolean(t));

  return (
    <div className="mm-ask-panel mm-fade-up">
      <div className="mm-ask-head">
        <span className="mm-order-slip-label">// ASK MEALMAP</span>
        <p className="mm-ask-hint" role="status" aria-live="polite">
          {status === "error" && error ? error : HINTS[status]}
        </p>
      </div>

      <form className="mm-ask-bar" onSubmit={submitTyped}>
        <button
          type="button"
          className={orbClass}
          onClick={handleOrb}
          aria-label={
            status === "listening" ? "Stop listening" : "Start voice input"
          }
        />
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={
            sttSupported ? "Type or tap the mic…" : "Type your question…"
          }
          className="mm-form-input mm-ask-input"
          disabled={status === "thinking" || status === "speaking"}
        />
        <button
          type="submit"
          className="mm-ask-submit"
          disabled={status === "thinking" || status === "speaking"}
        >
          Ask
        </button>
      </form>

      {!sttSupported && (
        <p className="mm-ask-footnote">
          Voice input isn&apos;t supported in this browser — type above, or try
          Chrome.
        </p>
      )}

      {transcript && (
        <p className="mm-ask-transcript" aria-live="polite">
          &ldquo;{transcript}&rdquo;
        </p>
      )}

      {answer && (
        <div className="mm-ask-answer" role="status" aria-live="polite">
          <p className="mm-ask-answer-text">{answer}</p>
          {cited.length > 0 && (
            <div className="mm-ask-citations">
              {cited.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  className="mm-chip-btn"
                  onClick={() => onSelectTicket(ticket.id)}
                >
                  {ticket.name} →
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
