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
        area: "upper",
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
      ends: "starts Fri 6:00 pm",
      sourceUrl: "https://example.com",
      blurb: "Free pizza",
    });
    expect(first.inserted).toBe(true);
    flushPersist();

    initStore({ force: true });

    const dup = insertAutoTicket({
      eventId: "evt-99",
      name: "Pizza Night",
      society: "CS Club",
      cost: 0,
      time: "today",
      worth: "high",
      ends: "starts Fri 6:00 pm",
      sourceUrl: "https://example.com",
      blurb: "Free pizza",
    });
    expect(dup.inserted).toBe(false);
    expect(listTickets()).toHaveLength(1);
  });

  it("resolves venue_hint to coords when alias matches", () => {
    const { ticket } = insertAutoTicket({
      eventId: "evt-quad",
      name: "Quad BBQ",
      society: "Eng Soc",
      cost: 0,
      time: "today",
      worth: "high",
      ends: "starts Sat 12:00 pm",
      sourceUrl: "https://example.com",
      blurb: "BBQ on the lawn — grab a plate if you're nearby.",
      foodLikelihood: "high",
      classifyReason: "Explicit BBQ in event name",
      venueHint: "Quad 1043",
      onCampus: true,
    });
    expect(ticket?.where).toBe("Quadrangle");
    expect(ticket?.coords).not.toBeNull();
    expect(ticket?.foodLikelihood).toBe("high");
    expect(ticket?.classifyReason).toBe("Explicit BBQ in event name");
    expect(ticket?.blurb).not.toMatch(/Food likelihood/i);
  });

  it("marks off-campus auto tickets without coords", () => {
    const { ticket } = insertAutoTicket({
      eventId: "evt-off",
      name: "Food crawl — Newtown",
      society: "Food Soc",
      cost: 0,
      time: "today",
      worth: "maybe",
      ends: "starts Sun 5:00 pm",
      sourceUrl: "https://example.com",
      blurb: "Off campus crawl",
      venueHint: null,
      onCampus: false,
    });
    expect(ticket?.where).toBe("off-campus event");
    expect(ticket?.onCampus).toBe(false);
    expect(ticket?.coords).toBeNull();
  });

  it("leaves on-campus tickets pinnable when venue_hint does not resolve", () => {
    const { ticket } = insertAutoTicket({
      eventId: "evt-pin",
      name: "Free snacks",
      society: "Random Soc",
      cost: 0,
      time: "today",
      worth: "maybe",
      ends: "starts Mon 1:00 pm",
      sourceUrl: "https://example.com",
      blurb: "Snacks somewhere",
      venueHint: null,
      onCampus: true,
    });
    expect(ticket?.where).toBe("location unconfirmed");
    expect(ticket?.coords).toBeNull();
    expect(ticket?.onCampus).toBe(true);
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
