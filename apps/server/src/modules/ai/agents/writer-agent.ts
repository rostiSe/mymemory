import { openai } from "@ai-sdk/openai";
import { and, db as defaultDb, eq } from "@mymemory/db";
import { agentLogs } from "@mymemory/db/schema/agent-logs";
import { spaces } from "@mymemory/db/schema/spaces";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { WRITER_MAX_STEPS } from "./agent-step-limits.js";
import {
  buildWriterSystemPrompt,
  buildWriterUserPrompt,
} from "./wiki-prompts.js";
import { buildWriterTools, type Database, wrapTools } from "./wiki-tools.js";

const writerResultSchema = z.object({
  pagesCreated: z.array(z.string()).default([]),
  pagesUpdated: z.array(z.string()).default([]),
  versionsCreated: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

type WriterModelResult = z.infer<typeof writerResultSchema>;

export type WriterEntrySummary = {
  id: string;
  title: string | null;
  summary: string | null;
  topics: string[];
};

export type WriterResult = {
  pagesCreated: string[];
  pagesUpdated: string[];
  versionsCreated: number;
  steps: number;
  tokens: number;
};

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function safeParseWriterResult(text: string): WriterModelResult {
  try {
    const jsonText = extractJsonObject(text);
    const parsed = JSON.parse(jsonText);
    return writerResultSchema.parse(parsed);
  } catch {
    return { pagesCreated: [], pagesUpdated: [], versionsCreated: 0 };
  }
}

function getTotalTokens(
  usage:
    | {
        totalTokens?: number;
        inputTokens?: number;
        outputTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
      }
    | undefined,
): number {
  if (!usage) return 0;
  if (typeof usage.totalTokens === "number") return usage.totalTokens;
  const input = usage.inputTokens ?? usage.promptTokens ?? 0;
  const output = usage.outputTokens ?? usage.completionTokens ?? 0;
  return input + output;
}

export async function runWriter(
  db: Database = defaultDb,
  userId: string,
  runId: string,
  spaceId: string,
  entrySummaries: WriterEntrySummary[],
): Promise<WriterResult> {
  const [space] = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      description: spaces.description,
    })
    .from(spaces)
    .where(and(eq(spaces.id, spaceId), eq(spaces.userId, userId)))
    .limit(1);

  if (!space) {
    throw new Error(`Space ${spaceId} not found for writer run.`);
  }

  const toolSet = buildWriterTools(db, userId, runId);
  const wrappedTools = wrapTools(toolSet);

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: buildWriterSystemPrompt(),
    prompt: buildWriterUserPrompt({
      runId,
      userId,
      space,
      entrySummaries,
    }),
    stopWhen: stepCountIs(WRITER_MAX_STEPS),
    tools: wrappedTools,
    onStepFinish: async ({ toolCalls, toolResults }) => {
      for (const call of toolCalls ?? []) {
        const matchingResult = (toolResults ?? []).find(
          (entry) => entry.toolCallId === call.toolCallId,
        );

        await db.insert(agentLogs).values({
          userId,
          runId,
          level: "action",
          message: `Writer called ${call.toolName}`,
          toolName: call.toolName,
          toolInput: call.input as Record<string, unknown>,
          toolOutput:
            (matchingResult?.output as Record<string, unknown> | undefined) ??
            null,
        });
      }
    },
  });

  const parsed = safeParseWriterResult(result.text);
  const tokens = getTotalTokens(result.usage);

  await db.insert(agentLogs).values({
    userId,
    runId,
    level: "info",
    message: `Writer finished for space ${space.name}`,
    toolName: "runWriter",
    toolOutput: {
      spaceId,
      pagesCreated: parsed.pagesCreated.length,
      pagesUpdated: parsed.pagesUpdated.length,
      versionsCreated: parsed.versionsCreated,
      steps: result.steps.length,
      tokens,
    },
  });

  return {
    pagesCreated: parsed.pagesCreated,
    pagesUpdated: parsed.pagesUpdated,
    versionsCreated: parsed.versionsCreated,
    steps: result.steps.length,
    tokens,
  };
}
