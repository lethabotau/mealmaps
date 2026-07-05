import { Router } from "express";
import { runIngest } from "../ingest/ingest.js";

export const ingestRouter = Router();

// Machine endpoint — guarded by a shared secret header, not Clerk auth.
ingestRouter.post("/", async (req, res) => {
  const secret = process.env.INGEST_SECRET;
  const provided = req.header("x-ingest-secret");
  if (!secret || provided !== secret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const summary = await runIngest();
    res.json({
      fetched: summary.fetched,
      classified: summary.classified,
      inserted: summary.inserted,
    });
  } catch (err) {
    console.error(
      "[ingest] route run failed:",
      err instanceof Error ? err.message : err,
    );
    res.status(500).json({ error: "ingest_failed" });
  }
});
