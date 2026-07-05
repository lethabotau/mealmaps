import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { clerkAppearance } from "../lib/clerkAppearance";

interface HeaderProps {
  onGoDash: () => void;
}

export function Header({ onGoDash }: HeaderProps) {
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
        <div>
          <span
            style={{
              fontFamily: "Archivo",
              fontWeight: 900,
              fontSize: 27,
              letterSpacing: "-1px",
              lineHeight: 1,
            }}
          >
            Meal<span style={{ color: "#E5431E" }}>Map</span>
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <SignedOut>
          <SignInButton mode="modal">
            <button type="button" className="mm-header-auth-btn">
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton appearance={clerkAppearance} />
        </SignedIn>
      </div>
    </header>
  );
}
