import "dotenv/config";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { initStore } from "./store/ticketStore.js";

/**
 * Public reads must never depend on Clerk session state. Stale/invalid
 * __session cookies are common for signed-out users and previously 500'd
 * GET /api/tickets when clerkMiddleware ran globally.
 */
describe("public read routes (real Clerk middleware, unmocked)", () => {
  beforeAll(() => {
    initStore();
  });

  it("GET /api/tickets returns 200 with an invalid __session cookie", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", "__session=invalid.jwt.token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tickets)).toBe(true);
  });

  it("GET /health returns 200 with an invalid __session cookie", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/health")
      .set("Cookie", "__session=invalid.jwt.token");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
