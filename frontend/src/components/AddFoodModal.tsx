import { useEffect, useState } from "react";
import { buildQuickAddTicket } from "@mealmap/shared";

interface AddFoodModalProps {
  onClose: () => void;
  onSubmit: (input: ReturnType<typeof buildQuickAddTicket>) => Promise<unknown>;
  onFinish: () => void;
}

const AREA_CHIPS = ["Quad", "Library", "Lower Campus", "Union"];
const FOOD_CHIPS = ["Pizza", "Bagels", "Snacks", "Tacos", "Coffee", "Sandwiches"];
const LAST_CHIPS = ["15 min", "30 min", "1 hour", "Until it's gone"];

export function AddFoodModal({ onClose, onSubmit, onFinish }: AddFoodModalProps) {
  const [step, setStep] = useState(1);
  const [where, setWhere] = useState("");
  const [what, setWhat] = useState("");
  const [last, setLast] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape (unless a layer above, e.g. the sign-in overlay, consumed it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pill = (active: boolean) =>
    active
      ? { bg: "#E5431E", color: "#FBF7EE" }
      : { bg: "#FFFDF7", color: "#1B1712" };

  const stepValid =
    (step === 1 && where.trim()) ||
    (step === 2 && what.trim()) ||
    (step === 3 && last.trim());

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(buildQuickAddTicket({ where, what, last }));
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div onClick={onClose} className="mm-modal-overlay">
      <div onClick={stop} className="mm-modal-sheet">
        <div
          style={{
            background: "#E5431E",
            color: "#FBF7EE",
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: "-0.3px",
            }}
          >
            Found food?
          </span>
          <button type="button" onClick={onClose} className="mm-modal-close">
            ✕
          </button>
        </div>

        {done ? (
          <div
            style={{
              padding: "40px 26px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 26,
                color: "#3C7A45",
                border: "3.5px solid #3C7A45",
                borderRadius: 9,
                padding: "10px 18px",
                transform: "rotate(-7deg)",
                animation: "mm-stampIn .5s ease both",
              }}
            >
              ON THE PASS
            </span>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                color: "#4A423A",
                margin: 0,
                maxWidth: 280,
              }}
            >
              Thanks — hungry students nearby can see it now.
            </p>
            <button
              onClick={onFinish}
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                fontSize: 15,
                background: "#1B1712",
                color: "#FBF7EE",
                border: "none",
                borderRadius: 9,
                cursor: "pointer",
                padding: "12px 22px",
              }}
            >
              See it ranked →
            </button>
          </div>
        ) : (
          <div style={{ padding: "20px 22px 22px" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: n <= step ? "#E5431E" : "#e0d6c1",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "2px",
                color: "#8a7d6c",
                marginBottom: 6,
              }}
            >
              STEP {step} OF 3
            </div>

            {step === 1 && (
              <>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: 22,
                    margin: "0 0 14px",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Where is it?
                </h3>
                <input
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  placeholder="e.g. Quad 1043, Library Atrium"
                  className="mm-form-input"
                  style={{ marginBottom: 12 }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {AREA_CHIPS.map((label) => {
                    const active = where === label;
                    const colors = pill(active);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setWhere(label)}
                        className="mm-chip-btn"
                        style={{
                          background: colors.bg,
                          color: colors.color,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: 22,
                    margin: "0 0 14px",
                    letterSpacing: "-0.5px",
                  }}
                >
                  What&apos;s the food?
                </h3>
                <input
                  value={what}
                  onChange={(e) => setWhat(e.target.value)}
                  placeholder="e.g. Free pizza, leftover bagels"
                  className="mm-form-input"
                  style={{ marginBottom: 12 }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {FOOD_CHIPS.map((label) => {
                    const active = what === label;
                    const colors = pill(active);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setWhat(label)}
                        className="mm-chip-btn"
                        style={{
                          background: colors.bg,
                          color: colors.color,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: 22,
                    margin: "0 0 14px",
                    letterSpacing: "-0.5px",
                  }}
                >
                  How long will it last?
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {LAST_CHIPS.map((label) => {
                    const active = last === label;
                    const colors = pill(active);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setLast(label)}
                        className="mm-chip-btn"
                        style={{
                          background: colors.bg,
                          color: colors.color,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    background: "#F5EDDC",
                    border: "2px dashed #1B1712",
                    borderRadius: 8,
                    padding: "12px 14px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12.5,
                    color: "#4A423A",
                    lineHeight: 1.7,
                  }}
                >
                  <div>WHERE · {where || "—"}</div>
                  <div>FOOD&nbsp;&nbsp;· {what || "—"}</div>
                  <div>LASTS&nbsp;· {last || "—"}</div>
                </div>
              </>
            )}

            <div className="mm-modal-actions">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 500,
                    fontSize: 14,
                    background: "none",
                    color: "#1B1712",
                    border: "2px solid #1B1712",
                    borderRadius: 8,
                    cursor: "pointer",
                    padding: "12px 18px",
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={!stepValid || submitting}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  fontSize: 16,
                  background: stepValid ? "#E5431E" : "#c9beac",
                  color: "#FBF7EE",
                  border: "2.5px solid #1B1712",
                  borderRadius: 9,
                  boxShadow: "3px 3px 0 rgba(27,23,18,0.7)",
                  cursor: stepValid && !submitting ? "pointer" : "not-allowed",
                  padding: 12,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {step < 3
                  ? "Next →"
                  : submitting
                    ? "Posting…"
                    : "Help students find this"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
