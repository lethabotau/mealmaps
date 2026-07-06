import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import { clerkAuthMiddleware, requireWriteAuth } from "../auth/clerk.js";
import {
  extractImageWithLlm,
  extractWithLlm,
  isSupportedImageMediaType,
  regexToExtractResult,
} from "../services/extractService.js";

export const extractRouter = Router();

function logExtractError(context: string, err: unknown): void {
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
  console.error(`[extract] ${context}:`, detail);
}

// Gated like other write routes — LLM extraction costs API money.
extractRouter.post("/", clerkAuthMiddleware, requireWriteAuth, async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  const image = typeof req.body?.image === "string" ? req.body.image : "";
  const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : "";

  if (image) {
    if (!isSupportedImageMediaType(mimeType)) {
      res.status(400).json({ error: "Unsupported image type" });
      return;
    }

    try {
      const llmResult = await extractImageWithLlm(image, mimeType, {
        nowIso: new Date().toISOString(),
        timeZone: "Australia/Sydney",
      });
      if (llmResult) {
        res.json(llmResult);
        return;
      }
      // No API key configured — there is no safe fallback for images.
      res.status(503).json({ error: "Image reading is not available right now" });
    } catch (err) {
      logExtractError("vision extraction failed", err);
      res.status(502).json({ error: "Couldn't read that image — try again" });
    }
    return;
  }

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
    logExtractError("LLM extraction failed, using regex fallback", err);
  }

  res.json(regexToExtractResult(text));
});
