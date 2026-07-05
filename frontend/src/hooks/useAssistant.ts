import { useCallback, useEffect, useRef, useState } from "react";
import { askAssistant } from "../api/client";

export type AssistantStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

interface AssistantState {
  status: AssistantStatus;
  transcript: string;
  answer: string;
  citedTicketIds: string[];
  error: string | null;
}

/**
 * Minimal Web Speech API typings — the browser globals aren't in the
 * standard TS lib. We only use the handful of members below.
 */
interface SpeechRecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEvent {
  results: ArrayLike<SpeechRecognitionResult>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const canSpeak =
  typeof window !== "undefined" && "speechSynthesis" in window;

export function useAssistant() {
  const [state, setState] = useState<AssistantState>({
    status: "idle",
    transcript: "",
    answer: "",
    citedTicketIds: [],
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sttSupported = useRef(getRecognitionCtor() !== null).current;

  const speak = useCallback((text: string) => {
    if (!canSpeak || !text) {
      setState((prev) => ({ ...prev, status: "idle" }));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () =>
      setState((prev) =>
        prev.status === "speaking" ? { ...prev, status: "idle" } : prev,
      );
    setState((prev) => ({ ...prev, status: "speaking" }));
    window.speechSynthesis.speak(utterance);
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      setState((prev) => ({
        ...prev,
        status: "thinking",
        transcript: trimmed,
        answer: "",
        citedTicketIds: [],
        error: null,
      }));
      try {
        const { answer, citedTicketIds } = await askAssistant(trimmed);
        setState((prev) => ({ ...prev, answer, citedTicketIds }));
        speak(answer);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error:
            err instanceof Error ? err.message : "Could not reach the assistant",
        }));
      }
    },
    [speak],
  );

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (canSpeak) window.speechSynthesis.cancel();

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      const text = (final || interim).trim();
      setState((prev) => ({ ...prev, transcript: text }));
      if (final.trim()) void ask(final);
    };
    recognition.onerror = (event) => {
      setState((prev) => ({
        ...prev,
        status: "error",
        error:
          event.error === "not-allowed"
            ? "Microphone access was blocked."
            : `Speech error: ${event.error}`,
      }));
    };
    recognition.onend = () => {
      setState((prev) =>
        prev.status === "listening" ? { ...prev, status: "idle" } : prev,
      );
    };

    recognitionRef.current = recognition;
    setState((prev) => ({
      ...prev,
      status: "listening",
      transcript: "",
      answer: "",
      error: null,
    }));
    recognition.start();
  }, [ask]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, []);

  return {
    ...state,
    sttSupported,
    ask,
    startListening,
    stopListening,
  };
}
