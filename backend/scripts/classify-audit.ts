import "dotenv/config";
import { sydneyCalendarDate } from "@mealmap/shared";
import { fetchEvents } from "../src/ingest/fetchEvents.js";
import {
  classifyEventsWithReport,
  formatClassificationLine,
  type ClassifiedVerdict,
} from "../src/ingest/classifyEvents.js";
import type { SocietyEvent } from "../src/ingest/fetchEvents.js";

function eventStartMs(event: SocietyEvent): number {
  return Date.parse(event.starts_at_iso);
}

function isTodaySydney(event: SocietyEvent, nowMs: number): boolean {
  const startMs = eventStartMs(event);
  if (Number.isNaN(startMs)) return false;
  return sydneyCalendarDate(startMs) === sydneyCalendarDate(nowMs);
}

function printSection(
  title: string,
  verdicts: ClassifiedVerdict[],
  todayOnly: boolean,
  nowMs: number,
): void {
  const filtered = todayOnly
    ? verdicts.filter((v) => isTodaySydney(v.event, nowMs))
    : verdicts;
  console.log(`\n=== ${title} (${filtered.length}) ===`);
  for (const verdict of filtered) {
    console.log(formatClassificationLine(verdict));
  }
}

async function main(): Promise<void> {
  const nowMs = Date.now();
  const todayLabel = sydneyCalendarDate(nowMs);

  const events = await fetchEvents();
  const report = await classifyEventsWithReport(events);

  const todayEvents = events.filter((e) => isTodaySydney(e, nowMs));

  console.log(`\nClassification audit — Sydney today: ${todayLabel}`);
  console.log(`Fetched ${events.length} events (${todayEvents.length} today)\n`);

  printSection("KEPT (all)", report.kept, false, nowMs);
  printSection("POSSIBLE (all)", report.possible, false, nowMs);
  printSection("DROPPED (all)", report.dropped, false, nowMs);

  console.log(`\n--- TODAY (${todayLabel}) — three-way boundary ---`);
  printSection("KEPT (today)", report.kept, true, nowMs);
  printSection("POSSIBLE (today)", report.possible, true, nowMs);
  printSection("DROPPED (today)", report.dropped, true, nowMs);

  console.log(
    `\nSummary: kept ${report.kept.length}, possible ${report.possible.length}, dropped ${report.dropped.length}`,
  );
  const todayKept = report.kept.filter((v) => isTodaySydney(v.event, nowMs)).length;
  const todayPossible = report.possible.filter((v) =>
    isTodaySydney(v.event, nowMs),
  ).length;
  const todayDropped = report.dropped.filter((v) =>
    isTodaySydney(v.event, nowMs),
  ).length;
  console.log(
    `Today: kept ${todayKept}, possible ${todayPossible}, dropped ${todayDropped}`,
  );
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
