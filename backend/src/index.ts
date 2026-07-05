import "dotenv/config";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT) || 3001;

if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
  console.warn(
    "[mealmap] Missing CLERK_SECRET_KEY or CLERK_PUBLISHABLE_KEY in backend/.env — POST routes require auth and may fail.",
  );
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`MealMap backend listening on http://localhost:${PORT}`);
});
