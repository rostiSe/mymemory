import type { db } from "@mymemory/db";
import {
  agentLogs,
  spaceWikiPages,
  spaces,
  wikiPageVersions,
  wikiPages,
} from "@mymemory/db/schema";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  wikiGetPageInputSchema,
  wikiGetPageVersionsInputSchema,
  wikiListPagesInputSchema,
  wikiLogsInputSchema,
} from "@mymemory/shared/contracts";
import {
  runWikiCompile,
  runWikiLint,
} from "../../ai/agents/wiki-orchestrator.js";
import type { z } from "zod";

type Db = typeof db;

export const wikiService = {
  async compile(dbClient: Db, userId: string, mode: "full" | "incremental") {
    return runWikiCompile(dbClient, userId, mode);
  },

  async lint(dbClient: Db, userId: string) {
    const { runId, result } = await runWikiLint(dbClient, userId);
    return {
      runId,
      issues: result.issues,
      totalTokens: result.tokens,
    };
  },

  async getStatus(dbClient: Db, userId: string) {
    const [row] = await dbClient
      .select({
        compilationStatus: spaces.compilationStatus,
        lastCompiledAt: spaces.lastCompiledAt,
      })
      .from(spaces)
      .where(and(eq(spaces.userId, userId), eq(spaces.isIndex, true)))
      .limit(1);

    if (!row) {
      return { status: "idle" as const, lastCompiledAt: null };
    }

    return {
      status: row.compilationStatus,
      lastCompiledAt: row.lastCompiledAt,
    };
  },

  async getLogs(
    dbClient: Db,
    userId: string,
    input: z.infer<typeof wikiLogsInputSchema>,
  ) {
    const limit = input.limit ?? 100;
    const conditions = [eq(agentLogs.userId, userId)];
    if (input.runId) {
      conditions.push(eq(agentLogs.runId, input.runId));
    }

    return dbClient
      .select()
      .from(agentLogs)
      .where(and(...conditions))
      .orderBy(desc(agentLogs.createdAt))
      .limit(limit);
  },

  async listPages(
    dbClient: Db,
    userId: string,
    input: z.infer<typeof wikiListPagesInputSchema>,
  ) {
    if (input.spaceId) {
      return dbClient
        .select({
          id: wikiPages.id,
          userId: wikiPages.userId,
          title: wikiPages.title,
          slug: wikiPages.slug,
          pageType: wikiPages.pageType,
          content: wikiPages.content,
          properties: wikiPages.properties,
          sourceEntryIds: wikiPages.sourceEntryIds,
          sortOrder: wikiPages.sortOrder,
          createdAt: wikiPages.createdAt,
          updatedAt: wikiPages.updatedAt,
        })
        .from(wikiPages)
        .innerJoin(spaceWikiPages, eq(spaceWikiPages.wikiPageId, wikiPages.id))
        .innerJoin(spaces, eq(spaces.id, spaceWikiPages.spaceId))
        .where(
          and(
            eq(wikiPages.userId, userId),
            eq(spaceWikiPages.spaceId, input.spaceId),
            eq(spaces.userId, userId),
          ),
        )
        .orderBy(asc(wikiPages.sortOrder), asc(wikiPages.title));
    }

    return dbClient
      .select()
      .from(wikiPages)
      .where(eq(wikiPages.userId, userId))
      .orderBy(asc(wikiPages.sortOrder), asc(wikiPages.title));
  },

  async getPage(
    dbClient: Db,
    userId: string,
    input: z.infer<typeof wikiGetPageInputSchema>,
  ) {
    if (input.id) {
      const [row] = await dbClient
        .select()
        .from(wikiPages)
        .where(and(eq(wikiPages.id, input.id), eq(wikiPages.userId, userId)))
        .limit(1);
      return row ?? null;
    }

    const slug = input.slug;
    if (!slug) {
      return null;
    }

    const [row] = await dbClient
      .select()
      .from(wikiPages)
      .where(and(eq(wikiPages.slug, slug), eq(wikiPages.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async getPageVersions(
    dbClient: Db,
    userId: string,
    input: z.infer<typeof wikiGetPageVersionsInputSchema>,
  ) {
    const [page] = await dbClient
      .select({ id: wikiPages.id })
      .from(wikiPages)
      .where(and(eq(wikiPages.id, input.pageId), eq(wikiPages.userId, userId)))
      .limit(1);

    if (!page) {
      throw new ORPCError("NOT_FOUND", { message: "Wiki page not found" });
    }

    const limit = input.limit ?? 20;

    return dbClient
      .select()
      .from(wikiPageVersions)
      .where(eq(wikiPageVersions.wikiPageId, input.pageId))
      .orderBy(desc(wikiPageVersions.version))
      .limit(limit);
  },
};
