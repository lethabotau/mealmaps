import cors from "cors";
import express from "express";
import { clerkAuthMiddleware } from "./auth/clerk.js";
import { ticketsRouter } from "./routes/tickets.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(clerkAuthMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "mealmap-backend" });
  });

  app.get("/api", (_req, res) => {
    res.json({
      name: "MealMap API",
      version: "0.1.0",
      endpoints: ["/health", "/api/tickets"],
    });
  });

  app.use("/api/tickets", ticketsRouter);

  return app;
}
