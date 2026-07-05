import "dotenv/config";
import { runIngest } from "./ingest.js";

async function main(): Promise<void> {
  try {
    const summary = await runIngest();
    const sample = summary.insertedTickets[0];
    if (sample) {
      console.log("[ingest] sample inserted ticket:");
      console.log(JSON.stringify(sample, null, 2));
    } else {
      console.log("[ingest] no new tickets inserted this run.");
    }
    process.exit(0);
  } catch (err) {
    console.error(
      "[ingest] run failed:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }
}

void main();
