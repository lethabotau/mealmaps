import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SYSTEM_INGEST_USER } from "@mealmap/shared";
import {
  applyReport,
  createTicket,
  flushPersist,
  getTicket,
  hasAutoTickets,
  initStore,
  insertAutoTicket,
  listTickets,
  resetStore,
} from "./ticketStore.js";

describe("ticketStore persistence", () => {
  let tempDir: string;
  let dataFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mealmap-store-"));
    dataFile = path.join(tempDir, "store.json");
    process.env.DATA_FILE = dataFile;
    process.env.SEED_ON_BOOT = "false";
    resetStore({ seed: false });
    initStore({ force: true });
  });

  afterEach(() => {
    resetStore({ seed: false });
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("starts empty without seeds when SEED_ON_BOOT is false", () => {
    expect(listTickets()).toHaveLength(0);
    expect(hasAutoTickets()).toBe(false);
  });

  it("persists create + report across reload", () => {
    const ticket = createTicket(
      {
        name: "Free Cookies",
        source: "Student report",
        cost: 0,
        area: "quad",
        where: "Quadrangle",
        ends: "30 min",
        access: "Open to all",
        blurb: "Fresh batch.",
      },
      { userId: "u1", displayName: "Alice" },
    );

    applyReport(ticket.id, "gone", { userId: "u2", displayName: "Bob" });
    flushPersist();

    expect(fs.existsSync(dataFile)).toBe(true);

    initStore({ force: true });

    const reloaded = getTicket(ticket.id);
    expect(reloaded?.name).toBe("Free Cookies");
    expect(reloaded?.createdBy.displayName).toBe("Alice");
  });

  it("persists ingested event ids to prevent duplicate auto inserts", () => {
    const first = insertAutoTicket({
      eventId: "evt-99",
      name: "Pizza Night",
      society: "CS Club",
      cost: 0,
      time: "today",
      worth: "high",
      ends: "8pm",
      sourceUrl: "https://example.com",
      blurb: "Free pizza",
    });
    expect(first.inserted).toBe(true);
    flushPersist();

    initStore({ force: true });

    expect(hasAutoTickets()).toBe(true);
    const dup = insertAutoTicket({
      eventId: "evt-99",
      name: "Pizza Night",
      society: "CS Club",
      cost: 0,
      time: "today",
      worth: "high",
      ends: "8pm",
      sourceUrl: "https://example.com",
      blurb: "Free pizza",
    });
    expect(dup.inserted).toBe(false);
    expect(listTickets()).toHaveLength(1);
  });

  it("loads auto tickets from snapshot and skips re-ingest semantics", () => {
    insertAutoTicket({
      eventId: "evt-auto",
      name: "BBQ",
      society: "Eng Soc",
      cost: 0,
      time: "today",
      worth: "maybe",
      ends: "6pm",
      sourceUrl: "https://example.com/bbq",
      blurb: "Sausage sizzle",
    });
    flushPersist();

    initStore({ force: true });

    expect(hasAutoTickets()).toBe(true);
    expect(
      listTickets().some(
        (t) => t.createdBy.userId === SYSTEM_INGEST_USER.userId,
      ),
    ).toBe(true);
  });

  it("starts fresh when snapshot file is corrupt", () => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, "{not json", "utf8");

    initStore({ force: true });

    expect(listTickets()).toHaveLength(0);
  });
});

describe("ticketStore seeds", () => {
  beforeEach(() => {
    process.env.DATA_FILE = ":memory:";
    process.env.SEED_ON_BOOT = "true";
    resetStore({ seed: true });
    initStore({ force: true });
  });

  it("loads SEED_TICKETS when SEED_ON_BOOT=true on fresh start", () => {
    expect(listTickets().length).toBeGreaterThan(0);
  });
});
