import request from "supertest";
import type { NextFunction, Request, Response } from "express";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./auth/clerk.js", () => ({
  clerkAuthMiddleware: (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  requireWriteAuth: (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  resolveAuthUser: async () => ({
    userId: "user_test123",
    displayName: "Test User",
  }),
}));

import { createApp } from "./app.js";
import { initStore } from "./store/ticketStore.js";
import { frontendDistExists } from "./staticFrontend.js";

describe("production static frontend", () => {
  beforeAll(() => {
    initStore();
  });

  it.skipIf(!frontendDistExists())(
    "serves index.html and Vite assets from frontend/dist",
    async () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const app = createApp();
        const html = await request(app).get("/");
        expect(html.status).toBe(200);
        expect(html.text).toContain("MealMap");
        expect(html.text).toMatch(/\/assets\/.+\.(js|css)/);

        const assetMatch = html.text.match(/src="(\/assets\/[^"]+\.js)"/);
        expect(assetMatch).not.toBeNull();
        const asset = await request(app).get(assetMatch![1]!);
        expect(asset.status).toBe(200);

        const api = await request(app).get("/api/tickets");
        expect(api.status).toBe(200);
        expect(api.body).toHaveProperty("tickets");
      } finally {
        process.env.NODE_ENV = prev;
      }
    },
  );
});
