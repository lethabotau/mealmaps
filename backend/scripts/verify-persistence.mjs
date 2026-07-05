/**
 * End-to-end persistence verification (no running server required).
 * Simulates: fresh boot → ingest → user ticket + report → reboot → reload.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mealmap-verify-"));
const dataFile = path.join(tmpDir, "store.json");

process.env.DATA_FILE = dataFile;
process.env.SEED_ON_BOOT = "false";

const store = await import("../dist/store/ticketStore.js");
const { SEED_TICKETS } = await import("@mealmap/shared");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

// --- Boot 1: fresh store (no file) ---
store.initStore({ force: true });
assert(store.listTickets().length === 0, "fresh boot should have no seeds");
assert(!store.hasAutoTickets(), "fresh boot should have no auto tickets");

// Simulate boot ingest
const ingested = store.insertAutoTicket({
  eventId: "verify-evt-1",
  name: "Verify BBQ",
  society: "Test Soc",
  cost: 0,
  time: "today",
  worth: "high",
  ends: "6pm",
  sourceUrl: "https://example.com/bbq",
  blurb: "Verification event",
});
assert(ingested.inserted, "first ingest insert should succeed");

const userTicket = store.createTicket(
  {
    name: "Verify Pizza",
    source: "Student report",
    cost: 0,
    area: "quad",
    where: "Quadrangle",
    ends: "1 hour",
    access: "Open to all",
    blurb: "Verification user ticket",
  },
  { userId: "verify-user", displayName: "Verifier" },
);

store.applyReport(userTicket.id, "still", {
  userId: "verify-user",
  displayName: "Verifier",
});
store.flushPersist();

const boot1Count = store.listTickets().length;
const boot1Auto = store.listTickets().filter(
  (t) => t.createdBy.userId === "system-ingest",
).length;

// --- Boot 2: reload from disk (simulated server restart) ---
store.initStore({ force: true });

assert(fs.existsSync(dataFile), "snapshot file should exist on disk");
assert(
  store.listTickets().length === boot1Count,
  `ticket count should survive reboot (got ${store.listTickets().length}, expected ${boot1Count})`,
);
assert(
  store.getTicket(userTicket.id)?.name === "Verify Pizza",
  "user ticket should survive reboot",
);
assert(store.hasAutoTickets(), "auto tickets should survive reboot");
assert(
  store.listTickets().filter((t) => t.createdBy.userId === "system-ingest")
    .length === boot1Auto,
  "auto ticket count unchanged after reboot",
);

// No duplicate ingest
const dup = store.insertAutoTicket({
  eventId: "verify-evt-1",
  name: "Verify BBQ",
  society: "Test Soc",
  cost: 0,
  time: "today",
  worth: "high",
  ends: "6pm",
  sourceUrl: "https://example.com/bbq",
  blurb: "Verification event",
});
assert(!dup.inserted, "duplicate ingest should be rejected after reboot");

// No seed tickets loaded
const seedIds = new Set(SEED_TICKETS.map((t) => t.id));
const seedLeaked = store.listTickets().some((t) => seedIds.has(t.id));
assert(!seedLeaked, "seed tickets must not appear when SEED_ON_BOOT=false");

// Boot ingest would be skipped because hasAutoTickets()
assert(store.hasAutoTickets(), "reloaded store should skip boot ingest");

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log("PASS persistence verification");
console.log(`  tickets after reboot: ${store.listTickets().length}`);
console.log(`  auto tickets: ${boot1Auto}`);
console.log(`  user ticket: ${userTicket.id}`);
console.log(`  duplicate ingest blocked: yes`);
console.log(`  seeds loaded: no`);
