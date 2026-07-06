import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sydneyLocalToUtcMs } from "@mealmap/shared";
import { initStore, resetStore } from "../store/ticketStore.js";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create: mockCreate };
  },
}));

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

beforeAll(() => {
  initStore();
});

afterEach(() => {
  resetStore({ seed: true });
  mockCreate.mockReset();
  vi.unstubAllGlobals();
});

describe("POST /api/assistant", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/assistant")
      .send({ question: "anything free today?" });
    expect(res.status).toBe(401);
  });

  it("injects Sydney clock and resolved ticket schedule into the model call", async () => {
    const now = sydneyLocalToUtcMs(2026, 7, 6, 10, 45);
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            answer:
              "Nothing confirmed today — Tuesday has Christian Union's free lunch at 11am.",
            citedTicketIds: [],
          }),
        },
      ],
    });

    const prev = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";

    try {
      const res = await request(app)
        .post("/api/assistant")
        .set("Authorization", "Bearer test-token")
        .send({ question: "is there anything happening today" });

      expect(res.status).toBe(200);
      expect(res.body.answer).toContain("Nothing confirmed today");

      expect(mockCreate).toHaveBeenCalledOnce();
      const call = mockCreate.mock.calls[0][0];
      expect(call.system).toContain(
        "Current date/time: Monday 6 July 2026, 10:45 am (Australia/Sydney)",
      );
      expect(call.messages[0].content).toContain("schedule");
      expect(call.messages[0].content).toContain("matchesToday");
    } finally {
      process.env.ANTHROPIC_API_KEY = prev;
      vi.useRealTimers();
    }
  });
});
