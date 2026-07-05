import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import { requireWriteAuth } from "../auth/clerk.js";
import { extractWithLlm, regexToExtractResult } from "../services/extractService.js";

export const extractRouter = Router();

// Gated like other write routes — LLM extraction costs API money.
extractRouter.post("/", requireWriteAuth, async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) {
    res.status(400).json({ error: "Missing text" });
    return;
  }

  try {
    const llmResult = await extractWithLlm(text, {
      nowIso: new Date().toISOString(),
      timeZone: "Australia/Sydney",
    });
    if (llmResult) {
      res.json(llmResult);
      return;
    }
  } catch (err) {
    // Never leak post text or model output — log only structured error detail.
    const detail =
      err instanceof Anthropic.APIError
        ? {
            status: err.status,
            type: (err.error as { error?: { type?: string } })?.error?.type,
            message: err.message,
          }
        : {
            type: err instanceof Error ? err.name : typeof err,
            message: err instanceof Error ? err.message : "unknown error",
          };
    console.error("[extract] LLM extraction failed, using regex fallback:", detail);
  }

  res.json(regexToExtractResult(text));
});
