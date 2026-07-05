import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { clerkAppearance } from "../lib/clerkAppearance";

interface HeaderProps {
  onGoDash: () => void;
}

export function Header({ onGoDash }: HeaderProps) {
  return (
    <header className="mm-header">
      <div
        onClick={onGoDash}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            flexShrink: 0,
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
          <span className="mm-logo-mark">M</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <span className="mm-logo-word">
            Meal<span style={{ color: "#E5431E" }}>Map</span>
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
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
