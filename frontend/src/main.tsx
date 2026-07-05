import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SetupRequired } from "./components/SetupRequired";
import { clerkAppearance } from "./lib/clerkAppearance";
import "./styles/global.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const authReturnUrl =
  typeof window !== "undefined"
    ? `${window.location.pathname}${window.location.search}`
    : "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {!publishableKey ? (
      <SetupRequired
        title="Clerk key missing"
        steps={[
          "Copy frontend/.env.example to frontend/.env",
          "Add your Clerk publishable key as VITE_CLERK_PUBLISHABLE_KEY=pk_test_...",
          "Copy backend/.env.example to backend/.env and add CLERK_SECRET_KEY + CLERK_PUBLISHABLE_KEY",
        ]}
      />
    ) : (
      <ClerkProvider
        publishableKey={publishableKey}
        signInFallbackRedirectUrl={authReturnUrl}
        signUpFallbackRedirectUrl={authReturnUrl}
        appearance={clerkAppearance}
      >
        <App />
      </ClerkProvider>
    )}
  </StrictMode>,
);
