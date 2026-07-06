import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildAssistantSystemPrompt,
  ticketsForAssistant,
} from "@mealmap/shared";
import { initStore, listTickets, getOverrides, getConfirmMeta } from "../src/store/ticketStore.js";
import { ingestClassificationReport } from "../src/ingest/ingest.js";
import { fetchEvents } from "../src/ingest/fetchEvents.js";
import { classifyEventsWithReport } from "../src/ingest/classifyEvents.js";

const QUESTIONS = [
  "is there anything happening today",
  "what's free tomorrow",
  "what's on this week",
];

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY required");
    process.exit(1);
  }

  initStore({ force: true });

  if (process.env.ALGOLIA_SEARCH_KEY) {
    const events = await fetchEvents();
    const report = await classifyEventsWithReport(events);
    ingestClassificationReport(report);
    console.log(
      `[ingest] kept ${report.kept.length}, possible ${report.possible.length}`,
    );
  }

  const nowMs = Date.now();
  const context = ticketsForAssistant(
    listTickets(),
    getOverrides(),
    getConfirmMeta(),
    nowMs,
  );
  const client = new Anthropic({ apiKey });
  const system = buildAssistantSystemPrompt(nowMs);

  console.log(`\n${system}\n`);
  console.log(`Tickets in context: ${context.length}`);
  console.log(
    `Today matches: ${context.filter((t) => t.schedule.matchesToday).length}`,
  );

  for (const question of QUESTIONS) {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system,
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
    const parsed = JSON.parse(text) as { answer: string; citedTicketIds: string[] };

    console.log(`\nQ: ${question}`);
    console.log(`A: ${parsed.answer}`);
    if (parsed.citedTicketIds.length) {
      console.log(`Cited: ${parsed.citedTicketIds.join(", ")}`);
    }
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
