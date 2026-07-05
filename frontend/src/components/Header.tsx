import { SignedIn, UserButton } from "@clerk/clerk-react";
import type { Screen } from "@mealmap/shared";

interface HeaderProps {
  screen: Screen;
  onGoDash: () => void;
  onGoResults: () => void;
  onGoPaste: () => void;
  onGoAssistant: () => void;
  onOpenAdd: () => void;
}

export function Header({
  screen,
  onGoDash,
  onGoResults,
  onGoPaste,
  onGoAssistant,
  onOpenAdd,
}: HeaderProps) {
  const navColor = (target: Screen) =>
    screen === target ? "#E5431E" : "#1B1712";

  return (
    <header
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px 24px",
        borderBottom: "3px solid #1B1712",
        paddingBottom: 16,
      }}
    >
      <div
        onClick={onGoDash}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            background: "#E5431E",
            border: "2.5px solid #1B1712",
            borderRadius: "9px 7px 9px 7px",
            boxShadow: "3px 3px 0 rgba(27,23,18,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-3deg)",
          }}
        >
          <span
            style={{
              fontFamily: "Archivo",
              fontWeight: 900,
              fontSize: 24,
              color: "#FBF7EE",
              lineHeight: 1,
            }}
          >
            M
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "Archivo",
              fontWeight: 900,
              fontSize: 27,
              letterSpacing: "-1px",
            }}
          >
            Meal<span style={{ color: "#E5431E" }}>Map</span>
          </span>
          <span
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 9.5,
              letterSpacing: "2.5px",
              color: "#8a7d6c",
              marginTop: 3,
            }}
          >
            CAMPUS FOOD PASS
          </span>
        </div>
      </div>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px 6px",
        }}
      >
        {(
          [
            ["DASHBOARD", onGoDash, "dashboard"],
            ["RANKED", onGoResults, "results"],
            ["PASTE POST", onGoPaste, "paste"],
            ["ASK", onGoAssistant, "assistant"],
          ] as const
        ).map(([label, onClick, target]) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "1px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 10px",
              color: navColor(target),
            }}
          >
            {label}
          </button>
        ))}
        <button className="mm-btn-primary" onClick={onOpenAdd}>
          + FOUND FOOD
        </button>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </nav>
    </header>
  );
}
