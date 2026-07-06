import "dotenv/config";
import { fetchEvents } from "../src/ingest/fetchEvents.js";
import {
  classifyEventsWithReport,
  formatClassificationLine,
} from "../src/ingest/classifyEvents.js";
import { initStore, flushPersist } from "../src/store/ticketStore.js";
import { ingestClassificationReport } from "../src/ingest/ingest.js";

async function main(): Promise<void> {
  initStore();

  const events = await fetchEvents();
  const report = await classifyEventsWithReport(events);

  console.log(`\nFetched ${events.length} events\n`);
  console.log(`=== KEPT (${report.kept.length}) ===`);
  for (const verdict of report.kept) {
    console.log(formatClassificationLine(verdict));
  }
  console.log(`\n=== POSSIBLE (${report.possible.length}) ===`);
  for (const verdict of report.possible) {
    console.log(formatClassificationLine(verdict));
  }
  console.log(`\n=== DROPPED (${report.dropped.length}) ===`);
  for (const verdict of report.dropped) {
    console.log(formatClassificationLine(verdict));
  }

  const inserted = ingestClassificationReport(report);
  flushPersist();
  console.log(
    `\n[ingest] inserted ${inserted.length} tickets (kept ${report.kept.length}, possible ${report.possible.length}, dropped ${report.dropped.length})`,
  );
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
