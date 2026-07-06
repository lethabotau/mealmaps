import Anthropic from "@anthropic-ai/sdk";
import {
  buildAssistantSystemPrompt,
  ticketsForAssistant,
} from "@mealmap/shared";
import type { AssistantResponse } from "@mealmap/shared";
import { Router } from "express";
import { clerkAuthMiddleware, requireWriteAuth } from "../auth/clerk.js";
import {
  getConfirmMeta,
  getOverrides,
  listTickets,
} from "../store/ticketStore.js";

export const assistantRouter = Router();

// A cheap, fast model is plenty for a short grounded Q&A over a small dataset.
const MODEL = "claude-haiku-4-5";

assistantRouter.post("/", clerkAuthMiddleware, requireWriteAuth, async (req, res) => {
  const question =
    typeof req.body?.question === "string" ? req.body.question.trim() : "";

  if (!question) {
    res.status(400).json({ error: "Missing 'question'" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "assistant_not_configured" });
    return;
  }

  const nowMs = Date.now();
  const context = ticketsForAssistant(
    listTickets(),
    getOverrides(),
    getConfirmMeta(),
    nowMs,
  );

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: buildAssistantSystemPrompt(nowMs),
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              answer: { type: "string" },
              citedTicketIds: { type: "array", items: { type: "string" } },
            },
            required: ["answer", "citedTicketIds"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `Tickets (resolved JSON with Sydney schedule flags):\n${JSON.stringify(
            context,
          )}\n\nQuestion: ${question}`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("");

    const parsed = JSON.parse(text) as AssistantResponse;

    // Only echo ticket ids we actually know about.
    const known = new Set(context.map((t) => t.id));
    const citedTicketIds = Array.isArray(parsed.citedTicketIds)
      ? parsed.citedTicketIds.filter((id) => known.has(id))
      : [];

    res.json({ answer: parsed.answer, citedTicketIds } satisfies AssistantResponse);
  } catch (err) {
    console.error("assistant error:", err);
    res.status(502).json({ error: "assistant_unavailable" });
  }
});
