import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { resetStore } from "../store/ticketStore.js";

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
  it("lists seed tickets", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBeGreaterThan(0);
  });

  it("creates a ticket", async () => {
    const res = await request(app).post("/api/tickets").send({
      name: "Free Cookies",
      where: "Library Atrium",
      ends: "30 min",
      access: "Open to all",
      blurb: "Fresh batch on the table.",
    });

    expect(res.status).toBe(201);
    expect(res.body.ticket.name).toBe("Free Cookies");
  });

  it("reports a ticket as gone", async () => {
    const list = await request(app).get("/api/tickets");
    const id = list.body.tickets[0].id;

    const res = await request(app)
      .post(`/api/tickets/${id}/report`)
      .send({ kind: "gone" });

    expect(res.status).toBe(200);
    expect(res.body.overrides[id]).toBe("gone");
  });
});
