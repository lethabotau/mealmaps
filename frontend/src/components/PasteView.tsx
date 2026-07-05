import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  EXTRACT_FIELDS,
  EXTRACT_FIELD_LABELS,
  extractResultToPost,
  type ExtractResult,
  type FieldConfidence,
} from "@mealmap/shared";
import { isAuthError } from "../api/client";

const SAMPLE_POST =
  "CS Club Sponsor Night is TONIGHT! Free pizza in Quad 1043 from 6pm to 8pm. Open to all students, first come first served. No RSVP needed.";

const CONF_COLOR: Record<FieldConfidence, string> = {
  high: "#3C7A45",
  medium: "#B7791F",
  low: "#C0341D",
};

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix — backend wants raw base64.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface PasteViewProps {
  onGoDash: () => void;
  onExtract: (text: string) => Promise<ExtractResult | null>;
  onExtractImage: (
    imageBase64: string,
    mimeType: string,
  ) => Promise<ExtractResult | null>;
  onPostTicket: (extracted: ReturnType<typeof extractResultToPost>) => Promise<boolean>;
  resumeExtractToken?: number;
  resumeSubmitToken?: number;
}

export function PasteView({
  onGoDash,
  onExtract,
  onExtractImage,
  onPostTicket,
  resumeExtractToken = 0,
  resumeSubmitToken = 0,
}: PasteViewProps) {
  const [pasteText, setPasteText] = useState(SAMPLE_POST);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const runExtract = useCallback(async () => {
    if (!pasteText.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      const extracted = await onExtract(pasteText);
      // `null` means sign-in was required; the modal opened and this will be
      // re-run via resumeExtractToken after auth completes.
      if (extracted) {
        setResult(extracted);
        setImagePreviewUrl(null);
        setPosted(false);
      }
    } catch (err) {
      setError(
        isAuthError(err)
          ? "Session expired — sign in again, then hit Read this post."
          : "Couldn’t read the post. Check the text and try again.",
      );
    } finally {
      setExtracting(false);
    }
  }, [pasteText, onExtract]);

  const runExtractImage = useCallback(
    async (file: File) => {
      if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        setError("That image type isn't supported — try a JPEG, PNG, GIF, or WebP.");
        return;
      }
      setExtracting(true);
      setError(null);
      try {
        const base64 = await fileToBase64(file);
        const extracted = await onExtractImage(base64, file.type);
        if (extracted) {
          setResult(extracted);
          setImagePreviewUrl(URL.createObjectURL(file));
          setPosted(false);
        }
      } catch (err) {
        setError(
          isAuthError(err)
            ? "Session expired — sign in again, then drop the image once more."
            : "Couldn’t read that screenshot. Try again.",
        );
      } finally {
        setExtracting(false);
      }
    },
    [onExtractImage],
  );

  const postPaste = useCallback(async () => {
    if (!result || posted) return;
    setPosting(true);
    setError(null);
    try {
      const ok = await onPostTicket(extractResultToPost(result));
      if (ok) setPosted(true);
    } catch (err) {
      setError(
        isAuthError(err)
          ? "Session expired — sign in again, then hit Post to MealMap."
          : "Couldn’t post the ticket. Try again.",
      );
    } finally {
      setPosting(false);
    }
  }, [result, posted, onPostTicket]);

  // Resume the gated action after sign-in without re-running on every keystroke.
  const runExtractRef = useRef(runExtract);
  const postPasteRef = useRef(postPaste);
  useEffect(() => {
    runExtractRef.current = runExtract;
    postPasteRef.current = postPaste;
  });

  useEffect(() => {
    if (!resumeExtractToken) return;
    void runExtractRef.current();
  }, [resumeExtractToken]);

  useEffect(() => {
    if (!resumeSubmitToken) return;
    void postPasteRef.current();
  }, [resumeSubmitToken]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  return (
    <section className="mm-fade-up">
      <div style={{ margin: "26px 0 4px" }}>
        <button className="mm-link-back" onClick={onGoDash}>
          ← back to dashboard
        </button>
      </div>
      <h1 className="mm-page-title">Paste an event post</h1>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
          color: "#665a4a",
          margin: "0 0 24px",
          maxWidth: 620,
        }}
      >
        Drop in a club email, flyer text, or group-chat message — or drop/paste
        a screenshot of a flyer or Instagram story. We&apos;ll read it and
        print a ticket.
      </p>

      <div className="mm-paste-layout">
        <div className="mm-panel" style={{ padding: 18, boxShadow: "5px 5px 0 rgba(27,23,18,0.85)" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "2px",
              color: "#665a4a",
              marginBottom: 10,
            }}
          >
            RAW POST
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setResult(null);
              setPosted(false);
              setError(null);
            }}
            className="mm-form-textarea"
          />
          <button
            type="button"
            onClick={() => void runExtract()}
            disabled={extracting || !pasteText.trim()}
            className="mm-paste-read-btn"
            style={{
              opacity: extracting || !pasteText.trim() ? 0.7 : 1,
              cursor: extracting ? "wait" : "pointer",
            }}
          >
            {extracting ? "READING…" : "READ THIS POST →"}
          </button>
          {error && (
            <div
              style={{
                marginTop: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#C0341D",
              }}
            >
              {error}
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void runExtractImage(file);
            }}
            onPaste={(e) => {
              const item = Array.from(e.clipboardData.items).find((i) =>
                i.type.startsWith("image/"),
              );
              const file = item?.getAsFile();
              if (file) void runExtractImage(file);
            }}
            tabIndex={0}
            role="button"
            aria-label="Drop or paste a screenshot of a flyer or event post to read it"
            style={{
              marginTop: 14,
              border: `2.5px dashed ${dragOver ? "#E5431E" : "#b8ab92"}`,
              borderRadius: 10,
              padding: "16px 12px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: dragOver ? "#E5431E" : "#665a4a",
              cursor: "copy",
            }}
          >
            📸 Drop a screenshot here, or paste with ⌘V / Ctrl+V
          </div>
        </div>

        <div style={{ minHeight: 220 }}>
          {extracting ? (
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
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "1.5px",
                  color: "#a89a83",
                }}
              >
                ▮▮▮ READING ▮▮▮
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  fontSize: 16,
                  color: "#665a4a",
                }}
              >
                Reading the post…
              </span>
            </div>
          ) : result ? (
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
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "1.5px",
                }}
              >
                <span>MEALMAP · AUTO-READ</span>
                <span
                  style={{
                    color: result.source === "llm" ? "#8fd19e" : "#e0b062",
                    fontWeight: 500,
                  }}
                >
                  {result.source === "llm" ? "AI READ" : "KEYWORD READ"}
                </span>
              </div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 11 }}>
                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="Screenshot submitted for reading"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 160,
                      borderRadius: 8,
                      border: "2px solid #1B1712",
                      objectFit: "contain",
                    }}
                  />
                )}
                {result.time_normalized?.type === "now" && (
                  <div style={{ display: "flex" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: 15,
                        letterSpacing: "0.5px",
                        color: "#E5431E",
                        border: "3px solid #E5431E",
                        borderRadius: 7,
                        padding: "4px 11px",
                        transform: "rotate(-4deg)",
                      }}
                    >
                      HAPPENING NOW
                    </span>
                  </div>
                )}
                {!result.plausible && (
                  <div
                    style={{
                      border: "2px dashed #C0341D",
                      borderRadius: 8,
                      padding: "10px 12px",
                      background: "#fbe9e6",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: "1px",
                        color: "#C0341D",
                        fontWeight: 500,
                        marginBottom: 4,
                      }}
                    >
                      DOESN&apos;T LOOK LIKE A FOOD EVENT — POST ANYWAY?
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "#8a3a2e",
                      }}
                    >
                      {result.plausibility_reason || "Low plausibility."}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: "9px 14px",
                    alignItems: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                  }}
                >
                  {EXTRACT_FIELDS.map((field) => {
                    const value = result.extraction[field];
                    const isCost = field === "cost";
                    const valueColor =
                      isCost && value && /free/i.test(value)
                        ? "#E5431E"
                        : "#1B1712";
                    return (
                      <Fragment key={field}>
                        <span style={{ color: "#6b5f4f" }}>
                          {EXTRACT_FIELD_LABELS[field]}
                        </span>
                        <span
                          style={{
                            fontWeight: value ? 500 : 400,
                            color: value ? valueColor : "#b3a692",
                          }}
                        >
                          {value ?? "—"}
                        </span>
                        {value ? (
                          <span
                            style={{
                              justifySelf: "end",
                              fontFamily: "var(--font-mono)",
                              fontSize: 9.5,
                              letterSpacing: "0.5px",
                              fontWeight: 500,
                              color: CONF_COLOR[result.confidence[field]],
                              border: `1.5px solid ${CONF_COLOR[result.confidence[field]]}`,
                              borderRadius: 5,
                              padding: "2px 6px",
                            }}
                          >
                            {result.confidence[field].toUpperCase()}
                          </span>
                        ) : (
                          <span />
                        )}
                      </Fragment>
                    );
                  })}
                </div>

                {result.missing.length > 0 && (
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
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: "1px",
                        color: "#B7791F",
                        fontWeight: 500,
                      }}
                    >
                      MISSING →{" "}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "#8a6a1f",
                      }}
                    >
                      {result.missing
                        .map((field) => EXTRACT_FIELD_LABELS[field])
                        .join(", ")}
                    </span>
                  </div>
                )}

                <div style={{ borderTop: "2px dashed #d9cdb5", margin: "2px 0" }} />
                {posted ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
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
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "#665a4a",
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
                      fontFamily: "var(--font-sans)",
                      fontWeight: 500,
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
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "1.5px",
                  color: "#a89a83",
                }}
              >
                ▮▮▮ TICKET PRINTS HERE ▮▮▮
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
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
