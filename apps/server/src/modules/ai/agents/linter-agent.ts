import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db as defaultDb } from '@mymemory/db';
import { agentLogs } from '@mymemory/db/schema/agent-logs';
import { z } from 'zod';
import { LINTER_MAX_STEPS } from './agent-step-limits.js';
import {
  buildLinterTools,
  type Database,
  wrapTools,
} from './wiki-tools.js';
import {
  buildLinterSystemPrompt,
  buildLinterUserPrompt,
} from './wiki-prompts.js';

const issueSchema = z.object({
  severity: z.enum(['info', 'warn', 'error']),
  category: z.string(),
  message: z.string(),
  suggestedFix: z.string().optional(),
});

const linterResultSchema = z.object({
  issues: z.array(issueSchema).default([]),
  notes: z.string().optional(),
});

type LinterModelResult = z.infer<typeof linterResultSchema>;

export type LinterIssue = z.infer<typeof issueSchema>;

export type LinterResult = {
  issues: LinterIssue[];
  steps: number;
  tokens: number;
};

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function safeParseLinterResult(text: string): LinterModelResult {
  try {
    const jsonText = extractJsonObject(text);
    const parsed = JSON.parse(jsonText);
    return linterResultSchema.parse(parsed);
  } catch {
    return { issues: [] };
  }
}

function getTotalTokens(usage: {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
} | undefined): number {
  if (!usage) return 0;
  if (typeof usage.totalTokens === 'number') return usage.totalTokens;
  const input = usage.inputTokens ?? usage.promptTokens ?? 0;
  const output = usage.outputTokens ?? usage.completionTokens ?? 0;
  return input + output;
}

export async function runLinter(
  db: Database = defaultDb,
  userId: string,
  runId: string,
): Promise<LinterResult> {
  const toolSet = buildLinterTools(db, userId, runId);
  const wrappedTools = wrapTools(toolSet);

  const result = await generateText({
    model: openai('gpt-4o-mini'),
    system: buildLinterSystemPrompt(),
    prompt: buildLinterUserPrompt({ runId, userId }),
    tools: wrappedTools,
    stopWhen: stepCountIs(LINTER_MAX_STEPS),
    onStepFinish: async ({ toolCalls, toolResults }) => {
      for (const call of toolCalls ?? []) {
        const matchingResult = (toolResults ?? []).find(
          (entry) => entry.toolCallId === call.toolCallId,
        );

        await db.insert(agentLogs).values({
          userId,
          runId,
          level: 'action',
          message: `Linter called ${call.toolName}`,
          toolName: call.toolName,
          toolInput: call.input as Record<string, unknown>,
          toolOutput: (matchingResult?.output as Record<string, unknown> | undefined) ?? null,
        });
      }
    },
  });

  const parsed = safeParseLinterResult(result.text);
  const tokens = getTotalTokens(result.usage);

  await db.insert(agentLogs).values({
    userId,
    runId,
    level: 'info',
    message: 'Linter finished',
    toolName: 'runLinter',
    toolOutput: {
      issues: parsed.issues.length,
      steps: result.steps.length,
      tokens,
    },
  });

  return {
    issues: parsed.issues,
    steps: result.steps.length,
    tokens,
  };
}
