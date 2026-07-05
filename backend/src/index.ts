import "dotenv/config";
import { createApp } from "./app.js";
import { runIngest } from "./ingest/ingest.js";
import {
  flushPersist,
  hasAutoTickets,
  initStore,
} from "./store/ticketStore.js";

const PORT = Number(process.env.PORT) || 3001;

initStore();

if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
  console.warn(
    "[mealmap] Missing CLERK_SECRET_KEY or CLERK_PUBLISHABLE_KEY in backend/.env — POST routes require auth and may fail.",
  );
}

const app = createApp();

function shutdown(signal: string) {
  console.log(`[mealmap] ${signal} — flushing store…`);
  flushPersist();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app.listen(PORT, () => {
  console.log(`MealMap backend listening on http://localhost:${PORT}`);

  // Run boot ingest on a fresh store (no auto tickets in snapshot). Never crash startup.
  try {
    if (!hasAutoTickets()) {
      void runIngest().catch((err) => {
        console.warn(
          "[ingest] boot ingest failed:",
          err instanceof Error ? err.message : err,
        );
      });
    } else {
      console.log("[ingest] auto tickets present in store — skipping boot ingest");
    }
  } catch (err) {
    console.warn(
      "[ingest] boot ingest failed:",
      err instanceof Error ? err.message : err,
    );
  }
});
