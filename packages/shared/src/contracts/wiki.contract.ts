import { oc } from "@orpc/contract";
import { z } from "zod";

const dateSchema = z.string().or(z.date());

const wikiPageTypeSchema = z.enum([
  "synthesis",
  "timeline",
  "comparison",
  "glossary",
  "index",
]);

export const wikiPageSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string(),
  slug: z.string(),
  pageType: wikiPageTypeSchema,
  content: z.record(z.string(), z.unknown()),
  properties: z.record(z.string(), z.unknown()),
  sourceEntryIds: z.array(z.string()),
  sortOrder: z.number(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const wikiPageVersionSchema = z.object({
  id: z.uuid(),
  wikiPageId: z.uuid(),
  version: z.number(),
  content: z.record(z.string(), z.unknown()),
  properties: z.record(z.string(), z.unknown()),
  sourceEntryIds: z.array(z.string()),
  createdAt: dateSchema,
});

export const agentLogSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  runId: z.uuid(),
  level: z.enum(["info", "warn", "error", "action"]),
  message: z.string(),
  toolName: z.string().nullable().optional(),
  toolInput: z.record(z.string(), z.unknown()).nullable().optional(),
  toolOutput: z.record(z.string(), z.unknown()).nullable().optional(),
  durationMs: z.number().nullable().optional(),
  createdAt: dateSchema,
});

const curatorResultSummarySchema = z.object({
  spacesCreated: z.array(z.string()),
  spacesUpdated: z.array(z.string()),
  entriesAssigned: z.number(),
  steps: z.number(),
  tokens: z.number(),
});

const writerResultSummarySchema = z.object({
  pagesCreated: z.array(z.string()),
  pagesUpdated: z.array(z.string()),
  versionsCreated: z.number(),
  steps: z.number(),
  tokens: z.number(),
});

const writerRunSummarySchema = z.object({
  spaceId: z.uuid(),
  spaceName: z.string(),
  result: writerResultSummarySchema,
});

export const compileResultSchema = z.object({
  runId: z.uuid(),
  mode: z.enum(["full", "incremental"]),
  totalTokens: z.number(),
  error: z.string().optional(),
  curatorInitial: curatorResultSummarySchema,
  writers: z.array(writerRunSummarySchema),
  curatorFinalize: curatorResultSummarySchema.nullable(),
});

const linterIssueSchema = z.object({
  severity: z.enum(["info", "warn", "error"]),
  category: z.string(),
  message: z.string(),
  suggestedFix: z.string().optional(),
});

export const lintResultSchema = z.object({
  runId: z.uuid(),
  issues: z.array(linterIssueSchema),
  totalTokens: z.number(),
});

export const compilationStatusSchema = z.object({
  status: z.enum(["idle", "compiling", "failed"]),
  lastCompiledAt: dateSchema.nullable(),
});

export const wikiCompileInputSchema = z.object({
  mode: z.enum(["full", "incremental"]),
});

export const wikiLogsInputSchema = z.object({
  runId: z.uuid().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const wikiListPagesInputSchema = z.object({
  spaceId: z.uuid().optional(),
});

export const wikiGetPageInputSchema = z
  .object({
    id: z.uuid().optional(),
    slug: z.string().optional(),
  })
  .refine((v) => v.id !== undefined || Boolean(v.slug?.length), {
    message: "Either id or slug is required",
  });

export const wikiGetPageVersionsInputSchema = z.object({
  pageId: z.uuid(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const wikiContract = oc.router({
  compile: oc.input(wikiCompileInputSchema).output(compileResultSchema),
  lint: oc.output(lintResultSchema),
  status: oc.output(compilationStatusSchema),
  logs: oc.input(wikiLogsInputSchema).output(z.array(agentLogSchema)),
  listPages: oc.input(wikiListPagesInputSchema).output(z.array(wikiPageSchema)),
  getPage: oc.input(wikiGetPageInputSchema).output(wikiPageSchema.nullable()),
  getPageVersions: oc
    .input(wikiGetPageVersionsInputSchema)
    .output(z.array(wikiPageVersionSchema)),
});
