import { useCallback, useEffect, useState } from "react";
import type { ExtractedPost } from "@mealmap/shared";
import { extractFromPost } from "@mealmap/shared";

const SAMPLE_POST =
  "CS Club Sponsor Night is TONIGHT! Free pizza in Quad 1043 from 6pm to 8pm. Open to all students, first come first served. No RSVP needed.";

interface PasteViewProps {
  onGoDash: () => void;
  onPostTicket: (extracted: ExtractedPost) => Promise<void>;
  resumeSubmitToken?: number;
}

export function PasteView({
  onGoDash,
  onPostTicket,
  resumeSubmitToken = 0,
}: PasteViewProps) {
  const [pasteText, setPasteText] = useState(SAMPLE_POST);
  const [extracted, setExtracted] = useState<ExtractedPost | null>(null);
  const [posted, setPosted] = useState(false);
  const [posting, setPosting] = useState(false);

  const runExtract = () => {
    setExtracted(extractFromPost(pasteText));
    setPosted(false);
  };

  const postPaste = useCallback(async () => {
    if (!extracted) return;
    setPosting(true);
    try {
      await onPostTicket(extracted);
      setPosted(true);
    } finally {
      setPosting(false);
    }
  }, [extracted, onPostTicket]);

  useEffect(() => {
    if (!resumeSubmitToken || !extracted || posted) return;
    void postPaste();
  }, [resumeSubmitToken, extracted, posted, postPaste]);

  return (
    <section className="mm-fade-up">
      <div style={{ margin: "26px 0 4px" }}>
        <button className="mm-link-back" onClick={onGoDash}>
          ← back to dashboard
        </button>
      </div>
      <h1
        style={{
          fontFamily: "Archivo",
          fontWeight: 900,
          fontSize: "clamp(30px,4vw,44px)",
          letterSpacing: "-1.2px",
          margin: "8px 0 6px",
        }}
      >
        Paste an event post
      </h1>
      <p
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 12.5,
          color: "#8a7d6c",
          margin: "0 0 24px",
          maxWidth: 620,
        }}
      >
        Drop in a club email, flyer text, or group-chat message. We&apos;ll read
        it and print a ticket.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 22,
          alignItems: "start",
        }}
      >
        <div className="mm-panel" style={{ padding: 18, boxShadow: "5px 5px 0 rgba(27,23,18,0.85)" }}>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 11,
              letterSpacing: "2px",
              color: "#8a7d6c",
              marginBottom: 10,
            }}
          >
            RAW POST
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setExtracted(null);
              setPosted(false);
            }}
            style={{
              width: "100%",
              minHeight: 220,
              resize: "vertical",
              fontFamily: "Space Mono, monospace",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#1B1712",
              background: "#FFFDF7",
              border: "2px solid #1B1712",
              borderRadius: 8,
              padding: 14,
            }}
          />
          <button
            onClick={runExtract}
            style={{
              marginTop: 14,
              width: "100%",
              fontFamily: "Archivo",
              fontWeight: 800,
              fontSize: 15,
              background: "#1B1712",
              color: "#FBF7EE",
              border: "2.5px solid #1B1712",
              borderRadius: 9,
              boxShadow: "4px 4px 0 rgba(27,23,18,0.5)",
              cursor: "pointer",
              padding: 13,
            }}
          >
            READ THIS POST →
          </button>
        </div>

        <div style={{ minHeight: 220 }}>
          {extracted ? (
            <div
              className="mm-panel"
              style={{
                animation: "mm-print .5s ease both",
                boxShadow: "5px 5px 0 rgba(27,23,18,0.85)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "#1B1712",
                  color: "#FBF7EE",
                  padding: "11px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: "Space Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "1.5px",
                }}
              >
                <span>MEALMAP · AUTO-READ</span>
                <span style={{ color: extracted.confColor, fontWeight: 700 }}>
                  {extracted.confLabel} CONF · {extracted.confidence}%
                </span>
              </div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 11 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "9px 14px",
                    fontFamily: "Space Mono, monospace",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#9a8d7a" }}>FOOD</span>
                  <span style={{ fontWeight: 700, color: "#1B1712" }}>{extracted.food}</span>
                  <span style={{ color: "#9a8d7a" }}>COST</span>
                  <span style={{ fontWeight: 700, color: extracted.costColor }}>
                    {extracted.cost}
                  </span>
                  <span style={{ color: "#9a8d7a" }}>TIME</span>
                  <span style={{ color: "#1B1712" }}>{extracted.time}</span>
                  <span style={{ color: "#9a8d7a" }}>LOCATION</span>
                  <span style={{ color: "#1B1712" }}>{extracted.location}</span>
                  <span style={{ color: "#9a8d7a" }}>ACCESS</span>
                  <span style={{ color: "#1B1712" }}>{extracted.access}</span>
                </div>
                {extracted.hasMissing && (
                  <div
                    style={{
                      border: "2px dashed #B7791F",
                      borderRadius: 8,
                      padding: "10px 12px",
                      background: "#fbf3e2",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: 11,
                        letterSpacing: "1px",
                        color: "#B7791F",
                        fontWeight: 700,
                      }}
                    >
                      MISSING →{" "}
                    </span>
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: 12,
                        color: "#8a6a1f",
                      }}
                    >
                      {extracted.missingText}
                    </span>
                  </div>
                )}
                <div style={{ borderTop: "2px dashed #d9cdb5", margin: "2px 0" }} />
                {posted ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span
                      style={{
                        fontFamily: "Archivo",
                        fontWeight: 900,
                        fontSize: 20,
                        color: "#3C7A45",
                        border: "3px solid #3C7A45",
                        borderRadius: 7,
                        padding: "6px 12px",
                        transform: "rotate(-6deg)",
                      }}
                    >
                      POSTED
                    </span>
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: 12,
                        color: "#8a7d6c",
                      }}
                    >
                      Now live on the pass.
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => void postPaste()}
                    disabled={posting}
                    style={{
                      width: "100%",
                      fontFamily: "Archivo",
                      fontWeight: 900,
                      fontSize: 16,
                      background: "#E5431E",
                      color: "#FBF7EE",
                      border: "2.5px solid #1B1712",
                      borderRadius: 9,
                      boxShadow: "4px 4px 0 rgba(27,23,18,0.85)",
                      cursor: posting ? "wait" : "pointer",
                      padding: 14,
                      opacity: posting ? 0.7 : 1,
                    }}
                  >
                    {posting ? "POSTING…" : "POST TO MEALMAP"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                height: "100%",
                minHeight: 260,
                border: "2.5px dashed #b8ab92",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                textAlign: "center",
                padding: 30,
              }}
            >
              <span
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: 12,
                  letterSpacing: "1.5px",
                  color: "#a89a83",
                }}
              >
                ▮▮▮ TICKET PRINTS HERE ▮▮▮
              </span>
              <span
                style={{
                  fontFamily: "Archivo",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#a89a83",
                }}
              >
                Hit “Read this post” to preview
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
