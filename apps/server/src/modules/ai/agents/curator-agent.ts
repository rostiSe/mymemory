import { openai } from "@ai-sdk/openai";
import { db as defaultDb } from "@mymemory/db";
import { agentLogs } from "@mymemory/db/schema";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { CURATOR_MAX_STEPS } from "./agent-step-limits.js";
import {
  buildCuratorSystemPrompt,
  buildCuratorUserPrompt,
} from "./wiki-prompts.js";
import { buildCuratorTools, type Database, wrapTools } from "./wiki-tools.js";

const curatorResultSchema = z.object({
  spacesCreated: z.array(z.string()).default([]),
  spacesUpdated: z.array(z.string()).default([]),
  entriesAssigned: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

type CuratorModelResult = z.infer<typeof curatorResultSchema>;

export type CuratorResult = {
  spacesCreated: string[];
  spacesUpdated: string[];
  entriesAssigned: number;
  steps: number;
  tokens: number;
};

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function safeParseCuratorResult(text: string): CuratorModelResult {
  try {
    const jsonText = extractJsonObject(text);
    const parsed = JSON.parse(jsonText);
    return curatorResultSchema.parse(parsed);
  } catch {
    return {
      spacesCreated: [],
      spacesUpdated: [],
      entriesAssigned: 0,
    };
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

export async function runCurator(
  db: Database = defaultDb,
  userId: string,
  runId: string,
  mode: "full" | "incremental",
): Promise<CuratorResult> {
  const toolSet = buildCuratorTools(db, userId, runId);
  const wrappedTools = wrapTools(toolSet);

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: buildCuratorSystemPrompt(mode),
    prompt: buildCuratorUserPrompt({ runId, userId, mode }),
    stopWhen: stepCountIs(CURATOR_MAX_STEPS),
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
          message: `Curator called ${call.toolName}`,
          toolName: call.toolName,
          toolInput: call.input as Record<string, unknown>,
          toolOutput:
            (matchingResult?.output as Record<string, unknown> | undefined) ??
            null,
        });
      }
    },
  });

  const parsed = safeParseCuratorResult(result.text);
  const tokens = getTotalTokens(result.usage);

  await db.insert(agentLogs).values({
    userId,
    runId,
    level: "info",
    message: `Curator finished (${mode})`,
    toolName: "runCurator",
    toolOutput: {
      spacesCreated: parsed.spacesCreated.length,
      spacesUpdated: parsed.spacesUpdated.length,
      entriesAssigned: parsed.entriesAssigned,
      steps: result.steps.length,
      tokens,
    },
  });

  return {
    spacesCreated: parsed.spacesCreated,
    spacesUpdated: parsed.spacesUpdated,
    entriesAssigned: parsed.entriesAssigned,
    steps: result.steps.length,
    tokens,
  };
}
