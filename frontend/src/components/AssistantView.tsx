import { useState } from "react";
import type { TicketView } from "@mealmap/shared";
import { useAssistant } from "../hooks/useAssistant";
import type { PendingAction } from "../hooks/useAuthGate";
import { VoicePoweredOrb } from "./ui/voice-powered-orb";

interface AssistantViewProps {
  gate: (action: PendingAction, run: () => void | Promise<void>) => void;
  tickets: TicketView[];
  onSelectTicket: (id: string) => void;
}

const HINTS: Record<string, string> = {
  idle: "Tap to ask — e.g. “What free food is near the library?”",
  listening: "Listening… speak now",
  thinking: "Thinking…",
  speaking: "Answering…",
  error: "Something went wrong — tap to try again",
};

export function AssistantView({
  gate,
  tickets,
  onSelectTicket,
}: AssistantViewProps) {
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
    <section
      className="mm-fade-up"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "40px 16px 24px",
      }}
    >
      <div
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 12,
          letterSpacing: "2px",
          color: "#E5431E",
          marginBottom: 8,
        }}
      >
        // ASK MEALMAP
      </div>
      <h1
        style={{
          fontFamily: "Archivo",
          fontWeight: 900,
          fontSize: "clamp(28px,4vw,44px)",
          letterSpacing: "-1px",
          margin: "0 0 32px",
          maxWidth: 620,
        }}
      >
        Ask out loud what&apos;s worth walking to.
      </h1>

      <button
        type="button"
        className={`mm-orb-shell${status === "listening" ? " is-listening" : ""}`}
        onClick={handleOrb}
        aria-label={
          status === "listening" ? "Stop listening" : "Start listening"
        }
      >
        <VoicePoweredOrb
          className="mm-orb-canvas"
          enableVoiceControl={status === "listening"}
        />
      </button>

      <p
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.5px",
          color: status === "error" ? "#C0341D" : "#8a7d6c",
          marginTop: 22,
          minHeight: 20,
        }}
      >
        {status === "error" && error ? error : HINTS[status]}
      </p>

      {transcript && (
        <p
          style={{
            fontFamily: "Archivo",
            fontWeight: 700,
            fontSize: 18,
            margin: "6px 0 0",
            maxWidth: 620,
          }}
        >
          &ldquo;{transcript}&rdquo;
        </p>
      )}

      {answer && (
        <div
          className="mm-panel"
          style={{ maxWidth: 620, padding: "18px 22px", marginTop: 20 }}
        >
          <p
            style={{
              fontFamily: "Archivo",
              fontWeight: 800,
              fontSize: 19,
              lineHeight: 1.35,
              margin: 0,
            }}
          >
            {answer}
          </p>
          {cited.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                marginTop: 14,
              }}
            >
              {cited.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    background: "#FBF7EE",
                    color: "#1B1712",
                    border: "2px solid #1B1712",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                >
                  {ticket.name} →
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={submitTyped}
        style={{
          display: "flex",
          gap: 8,
          marginTop: 28,
          width: "min(520px, 100%)",
        }}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={
            sttSupported ? "…or type your question" : "Type your question"
          }
          style={{
            flex: 1,
            fontFamily: "Space Mono, monospace",
            fontSize: 14,
            padding: "11px 14px",
            border: "2.5px solid #1B1712",
            borderRadius: 8,
            background: "#FBF7EE",
          }}
        />
        <button
          type="submit"
          className="mm-btn-primary"
          style={{ transform: "none" }}
        >
          ASK
        </button>
      </form>
      {!sttSupported && (
        <p
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 11,
            color: "#8a7d6c",
            marginTop: 10,
          }}
        >
          Voice input isn&apos;t supported in this browser — try Chrome, or type
          above.
        </p>
      )}
    </section>
  );
}
