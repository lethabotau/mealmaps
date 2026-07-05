import request from "supertest";
import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetStore } from "../store/ticketStore.js";

vi.mock("../auth/clerk.js", () => ({
  clerkAuthMiddleware: (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  requireWriteAuth: (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !String(auth).startsWith("Bearer ")) {
      res.status(401).json({ error: "auth_required" });
      return;
    }
    next();
  },
  resolveAuthUser: async () => ({
    userId: "user_test123",
    displayName: "Test User",
  }),
}));

const { createApp } = await import("../app.js");
const app = createApp();

afterEach(() => {
  resetStore();
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("tickets API", () => {
  it("lists seed tickets without auth", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBeGreaterThan(0);
    expect(res.body.tickets[0].createdBy).toBeDefined();
  });

  it("returns 401 when creating a ticket without token", async () => {
    const res = await request(app).post("/api/tickets").send({
      name: "Free Cookies",
      where: "Library Atrium",
      ends: "30 min",
      access: "Open to all",
      blurb: "Fresh batch on the table.",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("auth_required");
  });

  it("creates a ticket with auth token", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", "Bearer test-token")
      .send({
        name: "Free Cookies",
        where: "Library Atrium",
        ends: "30 min",
        access: "Open to all",
        blurb: "Fresh batch on the table.",
        createdBy: { userId: "spoof", displayName: "Spoof" },
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket.name).toBe("Free Cookies");
    expect(res.body.ticket.createdBy).toEqual({
      userId: "user_test123",
      displayName: "Test User",
    });
  });

  it("returns 401 when reporting without token", async () => {
    const list = await request(app).get("/api/tickets");
    const id = list.body.tickets[0].id;

    const res = await request(app)
      .post(`/api/tickets/${id}/report`)
      .send({ kind: "gone" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("auth_required");
  });

  it("reports a ticket with auth token", async () => {
    const list = await request(app).get("/api/tickets");
    const id = list.body.tickets[0].id;

    const res = await request(app)
      .post(`/api/tickets/${id}/report`)
      .set("Authorization", "Bearer test-token")
      .send({ kind: "gone" });

    expect(res.status).toBe(200);
    expect(res.body.overrides[id]).toBe("gone");
    expect(res.body.report.reportedBy).toEqual({
      userId: "user_test123",
      displayName: "Test User",
    });
  });
});
