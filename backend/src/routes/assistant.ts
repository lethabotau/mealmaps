import Anthropic from "@anthropic-ai/sdk";
import { ticketsForAssistant } from "@mealmap/shared";
import type { AssistantResponse } from "@mealmap/shared";
import { Router } from "express";
import { clerkAuthMiddleware, requireWriteAuth } from "../auth/clerk.js";
import { getOverrides, listTickets } from "../store/ticketStore.js";

export const assistantRouter = Router();

// A cheap, fast model is plenty for a short grounded Q&A over a small dataset.
const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are MealMap's voice assistant. Students ask what free or cheap \
food is available on campus right now, and you answer out loud.

Rules:
- Answer ONLY from the ticket list provided in the user message. Never invent food, \
locations, times, or prices.
- Keep it to 1-2 short, natural spoken sentences. No markdown, no lists, no emoji.
- "cost" is in dollars; 0 means free. "walk" is minutes away (null if unknown/off-campus). "worth": high = go now.
- If a ticket's status is "gone", treat it as no longer available.
- If the tickets don't answer the question, say you don't know of anything matching.
- Respond with a JSON object: {"answer": string, "citedTicketIds": string[]}. \
citedTicketIds are the ids of the tickets your answer relies on (may be empty).`;

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

  const context = ticketsForAssistant(listTickets(), getOverrides());

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
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
          content: `Tickets available right now (JSON):\n${JSON.stringify(
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
