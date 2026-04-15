import { and, desc, eq, inArray, ne, sql } from '@mymemory/db';
import type { db as databaseClient } from '@mymemory/db';
import { tool } from 'ai';
import { agentLogs } from '@mymemory/db/schema/agent-logs';
import { entries } from '@mymemory/db/schema/entries';
import { entrySpaces, spaces } from '@mymemory/db/schema/spaces';
import { spaceWikiPages } from '@mymemory/db/schema/space-wiki-pages';
import { entryTags, tags } from '@mymemory/db/schema/tags';
import { entryTopics, topics } from '@mymemory/db/schema/topics';
import { wikiPageVersions, wikiPages } from '@mymemory/db/schema/wiki-pages';
import { z } from 'zod';
import type {
  ComparisonContent,
  GlossaryContent,
  IndexContent,
  SpaceContent,
  TimelineContent,
  WikiPageContent,
  SynthesisContent,
} from './wiki-agent.types.js';

export type Database = typeof databaseClient;

export type ToolDefinition<TInput, TOutput> = {
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute: (input: unknown) => Promise<TOutput>;
};

export type ToolSet = Record<string, ToolDefinition<unknown, unknown>>;

const uuidSchema = z.string().uuid();
const optionalJsonSchema = z.record(z.string(), z.unknown()).optional();

const pageTypeSchema = z.enum(['synthesis', 'timeline', 'comparison', 'glossary', 'index']);

const synthesisSectionInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  sourceEntryIds: z.array(uuidSchema),
  links: z.array(z.object({ pageId: uuidSchema, label: z.string() })).optional(),
  lastUpdated: z.string(),
});

const createOrUpdateWikiPageInputSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    slug: z.string().trim().min(1).max(500),
    pageType: pageTypeSchema,
    /** Full page JSON; preferred when set. */
    content: z.record(z.string(), z.unknown()).optional(),
    /**
     * Synthesis shortcut: same shape as template `sections`. The model often sends this instead of `content`.
     */
    sections: z.array(synthesisSectionInputSchema).optional(),
    properties: optionalJsonSchema,
    sourceEntryIds: z.array(uuidSchema).optional(),
    sortOrder: z.number().int().optional(),
  })
  .superRefine((val, ctx) => {
    const hasContent = val.content !== undefined && Object.keys(val.content).length > 0;
    const hasSections = val.sections !== undefined && val.sections.length > 0;
    if (hasContent) return;
    if (val.pageType === 'synthesis' && hasSections) return;
    ctx.addIssue({
      code: 'custom',
      message:
        'Provide non-empty `content`, or for pageType "synthesis" provide `sections` (see getPageTypeTemplate).',
    });
  });

function resolveWikiPageContent(
  pageType: z.infer<typeof pageTypeSchema>,
  content: Record<string, unknown> | undefined,
  sections:
    | z.infer<typeof synthesisSectionInputSchema>[]
    | undefined,
): Record<string, unknown> {
  if (content !== undefined && Object.keys(content).length > 0) {
    return content;
  }
  if (pageType === 'synthesis' && sections !== undefined && sections.length > 0) {
    const normalized = sections.map((s) => ({
      ...s,
      links: s.links ?? [],
    }));
    return {
      tableOfContents: normalized.map((s) => ({ id: s.id, title: s.title, level: 1 })),
      sections: normalized,
      insights: [],
      contradictions: [],
      openQuestions: [],
    };
  }
  throw new Error('createOrUpdateWikiPage: missing content');
}

const issueCategorySchema = z.enum([
  'orphan_entry',
  'empty_space',
  'stale_page',
  'missing_link',
  'contradiction',
  'duplicate_space',
  'thin_page',
]);

const synthesisTemplate: SynthesisContent = {
  tableOfContents: [{ id: 'string', title: 'string', level: 1 }],
  sections: [
    {
      id: 'string',
      title: 'string',
      body: 'string (markdown)',
      sourceEntryIds: ['uuid'],
      links: [{ pageId: 'uuid', label: 'string' }],
      lastUpdated: 'ISO timestamp',
    },
  ],
  insights: ['string'],
  contradictions: ['string'],
  openQuestions: ['string'],
};

const comparisonTemplate: ComparisonContent = {
  items: [{ name: 'string', description: 'string', sourceEntryIds: ['uuid'] }],
  criteria: ['string'],
  matrix: { itemName: { criterion: 'string' } },
  verdict: 'string',
  sourceEntryIds: ['uuid'],
};

const timelineTemplate: TimelineContent = {
  events: [
    {
      date: 'string (ISO or descriptive)',
      title: 'string',
      body: 'string (markdown)',
      sourceEntryIds: ['uuid'],
      links: [{ pageId: 'uuid', label: 'string' }],
    },
  ],
  insights: ['string'],
};

const glossaryTemplate: GlossaryContent = {
  terms: [
    {
      term: 'string',
      definition: 'string',
      sourceEntryIds: ['uuid'],
      links: [{ pageId: 'uuid', label: 'string' }],
    },
  ],
};

const indexTemplate: IndexContent = {
  spaces: [
    {
      spaceId: 'uuid',
      name: 'string',
      summary: 'string',
      pageCount: 0,
      entryCount: 0,
    },
  ],
  totalPages: 0,
  totalEntries: 0,
  lastCompiled: 'ISO timestamp',
};

const pageTypeTemplates: Record<
  z.infer<typeof pageTypeSchema>,
  { template: WikiPageContent; description: string }
> = {
  synthesis: {
    template: synthesisTemplate,
    description: 'Narrative summary with sections, insights, contradictions, and open questions.',
  },
  comparison: {
    template: comparisonTemplate,
    description: 'Side-by-side matrix view for options, criteria, and final verdict.',
  },
  timeline: {
    template: timelineTemplate,
    description: 'Chronological events with sources and linked pages.',
  },
  glossary: {
    template: glossaryTemplate,
    description: 'Term/definition dictionary with source traceability.',
  },
  index: {
    template: indexTemplate,
    description: 'Global rollup of spaces and coverage metrics.',
  },
};

function makeTool<TInput, TOutput>(
  description: string,
  inputSchema: z.ZodType<TInput>,
  handler: (input: TInput) => Promise<TOutput>,
): ToolDefinition<TInput, TOutput> {
  return {
    description,
    inputSchema,
    async execute(rawInput: unknown) {
      const input = inputSchema.parse(rawInput);
      return handler(input);
    },
  };
}

/** `topicFilter` is exact DB topic name match — not a wildcard. Treat common sentinel values as "no filter". */
function normalizeTopicFilter(topicFilter: string | undefined): string | undefined {
  if (topicFilter === undefined) return undefined;
  const trimmed = topicFilter.trim();
  if (trimmed.length === 0) return undefined;
  const lowered = trimmed.toLowerCase();
  if (
    lowered === '*'
    || lowered === '**'
    || lowered === 'all'
    || lowered === 'any'
    || lowered === '.'
    || lowered === '..'
    || lowered === '/'
    || lowered === 'none'
    || lowered === 'null'
    || lowered === 'undefined'
    || lowered === 'n/a'
  ) {
    return undefined;
  }
  return trimmed;
}

function createTools(db: Database, userId: string, runId: string) {
  const listEntries = makeTool(
    'List processed entries with compact metadata. topicFilter: optional exact topic name (case-insensitive); omit for all topics — never use * as wildcard (ignored if sent). unassignedOnly:true returns ONLY entries with no entry_spaces row (orphans); omit it to include entries already linked to spaces.',
    z.object({
      limit: z.number().int().min(1).max(100).default(25),
      offset: z.number().int().min(0).default(0),
      topicFilter: z.string().min(1).optional(),
      unassignedOnly: z.boolean().optional(),
    }),
    async (input) => {
      const filters = [
        eq(entries.userId, userId),
        eq(entries.processedStatus, 'done'),
      ];

      const topicFilter = normalizeTopicFilter(input.topicFilter);
      if (topicFilter !== undefined) {
        filters.push(
          sql`exists (
              select 1
              from ${entryTopics} et
              inner join ${topics} t on t.id = et.topic_id
              where et.entry_id = ${entries.id}
                and lower(t.name) = lower(${topicFilter})
            )`,
        );
      }

      if (input.unassignedOnly) {
        filters.push(
          sql`not exists (
              select 1
              from ${entrySpaces} es
              where es.entry_id = ${entries.id}
            )`,
        );
      }

      const whereClause = and(...filters);

      const entryRows = await db
        .select({
          id: entries.id,
          title: entries.title,
          summary: entries.summary,
          wordCount: entries.wordCount,
          type: entries.type,
          contentType: entries.contentType,
          depth: entries.depth,
          authors: entries.authors,
          createdAt: entries.createdAt,
        })
        .from(entries)
        .where(whereClause)
        .orderBy(desc(entries.createdAt))
        .limit(input.limit ?? 25)
        .offset(input.offset ?? 0);

      const [totalRow] = await db
        .select({ total: sql<number>`count(*)` })
        .from(entries)
        .where(whereClause);

      const entryIds = entryRows.map((row) => row.id);
      if (entryIds.length === 0) {
        return { entries: [], total: Number(totalRow?.total ?? 0) };
      }

      const topicRows = await db
        .select({ entryId: entryTopics.entryId, name: topics.name })
        .from(entryTopics)
        .innerJoin(topics, eq(entryTopics.topicId, topics.id))
        .where(inArray(entryTopics.entryId, entryIds));

      const tagRows = await db
        .select({ entryId: entryTags.entryId, name: tags.name })
        .from(entryTags)
        .innerJoin(tags, eq(entryTags.tagId, tags.id))
        .where(inArray(entryTags.entryId, entryIds));

      const topicsByEntry = new Map<string, string[]>();
      for (const row of topicRows) {
        const next = topicsByEntry.get(row.entryId) ?? [];
        next.push(row.name);
        topicsByEntry.set(row.entryId, next);
      }

      const tagsByEntry = new Map<string, string[]>();
      for (const row of tagRows) {
        const next = tagsByEntry.get(row.entryId) ?? [];
        next.push(row.name);
        tagsByEntry.set(row.entryId, next);
      }

      return {
        entries: entryRows.map((row) => ({
          id: row.id,
          title: row.title,
          summary: row.summary,
          topics: topicsByEntry.get(row.id) ?? [],
          tags: tagsByEntry.get(row.id) ?? [],
          wordCount: row.wordCount,
          type: row.type,
          contentType: row.contentType,
          depth: row.depth,
          authors: row.authors,
          createdAt: row.createdAt,
        })),
        total: Number(totalRow?.total ?? 0),
      };
    },
  );

  const readEntryContent = makeTool(
    'Read full content for one entry.',
    z.object({ entryId: uuidSchema }),
    async ({ entryId }) => {
      const [entry] = await db
        .select({
          id: entries.id,
          title: entries.title,
          summary: entries.summary,
          readableContent: entries.readableContent,
          keyPoints: entries.keyPoints,
          url: entries.url,
          type: entries.type,
          createdAt: entries.createdAt,
        })
        .from(entries)
        .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
        .limit(1);

      if (!entry) {
        throw new Error('Entry not found for user');
      }

      return {
        ...entry,
        readableContent: entry.readableContent?.slice(0, 8000) ?? null,
      };
    },
  );

  const listSpaces = makeTool(
    'List spaces with entry/page counts.',
    z.object({}),
    async () => {
      const rows = await db
        .select({
          id: spaces.id,
          name: spaces.name,
          description: spaces.description,
          isIndex: spaces.isIndex,
          compilationStatus: spaces.compilationStatus,
          lastCompiledAt: spaces.lastCompiledAt,
          content: spaces.content,
          properties: spaces.properties,
          entryCount: sql<number>`count(distinct ${entrySpaces.entryId})`,
          pageCount: sql<number>`count(distinct ${spaceWikiPages.wikiPageId})`,
        })
        .from(spaces)
        .leftJoin(entrySpaces, eq(entrySpaces.spaceId, spaces.id))
        .leftJoin(spaceWikiPages, eq(spaceWikiPages.spaceId, spaces.id))
        .where(eq(spaces.userId, userId))
        .groupBy(spaces.id)
        .orderBy(spaces.sortOrder, spaces.name);

      return rows.map((row) => ({
        ...row,
        entryCount: Number(row.entryCount),
        pageCount: Number(row.pageCount),
      }));
    },
  );

  const createOrUpdateSpace = makeTool(
    'Create or update a space by unique user/name.',
    z.object({
      name: z.string().trim().min(1).max(255),
      description: z.string().optional(),
      isIndex: z.boolean().optional(),
      content: optionalJsonSchema,
      properties: optionalJsonSchema,
      sortOrder: z.number().int().optional(),
    }),
    async (input) => {
      const [existingSpace] = await db
        .select({ id: spaces.id })
        .from(spaces)
        .where(and(eq(spaces.userId, userId), eq(spaces.name, input.name)))
        .limit(1);

      if (input.isIndex === true) {
        const [existingIndexSpace] = await db
          .select({ id: spaces.id, name: spaces.name })
          .from(spaces)
          .where(
            and(
              eq(spaces.userId, userId),
              eq(spaces.isIndex, true),
              ne(spaces.name, input.name),
            ),
          )
          .limit(1);

        if (existingIndexSpace) {
          throw new Error(
            `User already has index space "${existingIndexSpace.name}".`,
          );
        }
      }

      const updateSet: {
        description: string | null;
        content: Record<string, unknown>;
        properties: Record<string, unknown>;
        sortOrder: number;
        updatedAt: Date;
        isIndex?: boolean;
      } = {
        description: input.description ?? null,
        content: (input.content ?? {}) as SpaceContent,
        properties: input.properties ?? {},
        sortOrder: input.sortOrder ?? 0,
        updatedAt: new Date(),
      };

      if (input.isIndex !== undefined) {
        updateSet.isIndex = input.isIndex;
      }

      const [upserted] = await db
        .insert(spaces)
        .values({
          userId,
          name: input.name,
          description: input.description ?? null,
          isIndex: input.isIndex ?? false,
          content: (input.content ?? {}) as SpaceContent,
          properties: input.properties ?? {},
          sortOrder: input.sortOrder ?? 0,
        })
        .onConflictDoUpdate({
          target: [spaces.userId, spaces.name],
          set: updateSet,
        })
        .returning({ id: spaces.id, name: spaces.name });

      if (!upserted) {
        throw new Error('Failed to upsert space');
      }

      return {
        id: upserted.id,
        name: upserted.name,
        isNew: !existingSpace,
      };
    },
  );

  const assignEntriesToSpace = makeTool(
    'Assign entries to a space (idempotent).',
    z.object({
      spaceId: uuidSchema,
      entryIds: z.array(uuidSchema).max(50),
    }),
    async ({ spaceId, entryIds }) => {
      if (entryIds.length === 0) {
        return { assigned: 0 };
      }

      const [spaceRow] = await db
        .select({ id: spaces.id })
        .from(spaces)
        .where(and(eq(spaces.id, spaceId), eq(spaces.userId, userId)))
        .limit(1);

      if (!spaceRow) {
        throw new Error('Space not found for user');
      }

      const ownedEntries = await db
        .select({ id: entries.id })
        .from(entries)
        .where(and(eq(entries.userId, userId), inArray(entries.id, entryIds)));

      if (ownedEntries.length !== entryIds.length) {
        throw new Error('Some entries are missing or not owned by user');
      }

      const inserted = await db
        .insert(entrySpaces)
        .values(entryIds.map((entryId) => ({ spaceId, entryId })))
        .onConflictDoNothing()
        .returning({ entryId: entrySpaces.entryId });

      return { assigned: inserted.length };
    },
  );

  const listWikiPages = makeTool(
    'List wiki page metadata (optionally by space).',
    z.object({ spaceId: uuidSchema.optional() }),
    async ({ spaceId }) => {
      if (spaceId) {
        const [spaceRow] = await db
          .select({ id: spaces.id })
          .from(spaces)
          .where(and(eq(spaces.id, spaceId), eq(spaces.userId, userId)))
          .limit(1);

        if (!spaceRow) {
          throw new Error('Space not found for user');
        }

        return db
          .select({
            id: wikiPages.id,
            title: wikiPages.title,
            slug: wikiPages.slug,
            pageType: wikiPages.pageType,
            sourceEntryIds: wikiPages.sourceEntryIds,
            properties: wikiPages.properties,
            updatedAt: wikiPages.updatedAt,
          })
          .from(wikiPages)
          .innerJoin(spaceWikiPages, eq(spaceWikiPages.wikiPageId, wikiPages.id))
          .where(
            and(
              eq(wikiPages.userId, userId),
              eq(spaceWikiPages.spaceId, spaceId),
            ),
          )
          .orderBy(desc(wikiPages.updatedAt));
      }

      return db
        .select({
          id: wikiPages.id,
          title: wikiPages.title,
          slug: wikiPages.slug,
          pageType: wikiPages.pageType,
          sourceEntryIds: wikiPages.sourceEntryIds,
          properties: wikiPages.properties,
          updatedAt: wikiPages.updatedAt,
        })
        .from(wikiPages)
        .where(eq(wikiPages.userId, userId))
        .orderBy(desc(wikiPages.updatedAt));
    },
  );

  const createOrUpdateWikiPage = makeTool(
    'Create or update wiki page with version snapshot. For synthesis, pass full content or template-shaped sections[].',
    createOrUpdateWikiPageInputSchema,
    async (input) => {
      const content = resolveWikiPageContent(input.pageType, input.content, input.sections);
      const [existingPage] = await db
        .select({
          id: wikiPages.id,
          title: wikiPages.title,
          slug: wikiPages.slug,
          content: wikiPages.content,
          properties: wikiPages.properties,
          sourceEntryIds: wikiPages.sourceEntryIds,
        })
        .from(wikiPages)
        .where(and(eq(wikiPages.userId, userId), eq(wikiPages.slug, input.slug)))
        .limit(1);

      if (!existingPage) {
        const [createdPage] = await db
          .insert(wikiPages)
          .values({
            userId,
            title: input.title,
            slug: input.slug,
            pageType: input.pageType,
            content,
            properties: input.properties ?? {},
            sourceEntryIds: input.sourceEntryIds ?? [],
            sortOrder: input.sortOrder ?? 0,
            updatedAt: new Date(),
          })
          .returning({ id: wikiPages.id, title: wikiPages.title, slug: wikiPages.slug });

        if (!createdPage) {
          throw new Error('Failed to create wiki page');
        }

        return {
          id: createdPage.id,
          title: createdPage.title,
          slug: createdPage.slug,
          isNew: true,
          versionCreated: false,
        };
      }

      const [latestVersion] = await db
        .select({ version: wikiPageVersions.version })
        .from(wikiPageVersions)
        .where(eq(wikiPageVersions.wikiPageId, existingPage.id))
        .orderBy(desc(wikiPageVersions.version))
        .limit(1);

      const nextVersion = (latestVersion?.version ?? 0) + 1;

      await db.insert(wikiPageVersions).values({
        wikiPageId: existingPage.id,
        version: nextVersion,
        content: existingPage.content,
        properties: existingPage.properties,
        sourceEntryIds: existingPage.sourceEntryIds,
      });

      const [updatedPage] = await db
        .update(wikiPages)
        .set({
          title: input.title,
          pageType: input.pageType,
          content,
          properties: input.properties ?? {},
          sourceEntryIds: input.sourceEntryIds ?? [],
          sortOrder: input.sortOrder ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(wikiPages.id, existingPage.id))
        .returning({ id: wikiPages.id, title: wikiPages.title, slug: wikiPages.slug });

      if (!updatedPage) {
        throw new Error('Failed to update wiki page');
      }

      return {
        id: updatedPage.id,
        title: updatedPage.title,
        slug: updatedPage.slug,
        isNew: false,
        versionCreated: true,
      };
    },
  );

  const assignPageToSpaces = makeTool(
    'Assign one wiki page to many spaces (idempotent).',
    z.object({
      wikiPageId: uuidSchema,
      spaceIds: z.array(uuidSchema),
    }),
    async ({ wikiPageId, spaceIds }) => {
      if (spaceIds.length === 0) {
        return { assigned: 0 };
      }

      const [page] = await db
        .select({ id: wikiPages.id })
        .from(wikiPages)
        .where(and(eq(wikiPages.id, wikiPageId), eq(wikiPages.userId, userId)))
        .limit(1);

      if (!page) {
        throw new Error('Wiki page not found for user');
      }

      const ownedSpaces = await db
        .select({ id: spaces.id })
        .from(spaces)
        .where(and(eq(spaces.userId, userId), inArray(spaces.id, spaceIds)));

      if (ownedSpaces.length !== spaceIds.length) {
        throw new Error('Some spaces are missing or not owned by user');
      }

      const inserted = await db
        .insert(spaceWikiPages)
        .values(spaceIds.map((spaceId) => ({ wikiPageId, spaceId })))
        .onConflictDoNothing()
        .returning({ spaceId: spaceWikiPages.spaceId });

      return { assigned: inserted.length };
    },
  );

  const flagIssue = makeTool(
    'Log a lint issue into agent_logs for this run.',
    z.object({
      severity: z.enum(['info', 'warn', 'error']),
      category: issueCategorySchema,
      message: z.string().min(1),
      targetId: uuidSchema.optional(),
      suggestedFix: z.string().optional(),
      autoFixable: z.boolean().optional(),
    }),
    async (input) => {
      await db.insert(agentLogs).values({
        userId,
        runId,
        level: input.severity,
        message: `[${input.category}] ${input.message}`,
        toolName: 'flagIssue',
        toolInput: input as Record<string, unknown>,
      });

      return { logged: true as const };
    },
  );

  const getPageTypeTemplate = makeTool(
    'Get canonical content template for a wiki page type.',
    z.object({ pageType: pageTypeSchema }),
    async ({ pageType }) => pageTypeTemplates[pageType],
  );

  return {
    listEntries,
    readEntryContent,
    listSpaces,
    createOrUpdateSpace,
    assignEntriesToSpace,
    listWikiPages,
    createOrUpdateWikiPage,
    assignPageToSpaces,
    flagIssue,
    getPageTypeTemplate,
  };
}

export function buildCuratorTools(db: Database, userId: string, runId: string): ToolSet {
  const tools = createTools(db, userId, runId);
  return {
    listEntries: tools.listEntries,
    listSpaces: tools.listSpaces,
    createOrUpdateSpace: tools.createOrUpdateSpace,
    assignEntriesToSpace: tools.assignEntriesToSpace,
    listWikiPages: tools.listWikiPages,
    assignPageToSpaces: tools.assignPageToSpaces,
  };
}

export function buildWriterTools(db: Database, userId: string, runId: string): ToolSet {
  const tools = createTools(db, userId, runId);
  return {
    readEntryContent: tools.readEntryContent,
    listWikiPages: tools.listWikiPages,
    createOrUpdateWikiPage: tools.createOrUpdateWikiPage,
    assignPageToSpaces: tools.assignPageToSpaces,
    getPageTypeTemplate: tools.getPageTypeTemplate,
  };
}

export function buildLinterTools(db: Database, userId: string, runId: string): ToolSet {
  const tools = createTools(db, userId, runId);
  return {
    listEntries: tools.listEntries,
    listSpaces: tools.listSpaces,
    listWikiPages: tools.listWikiPages,
    flagIssue: tools.flagIssue,
  };
}

export function wrapTools(toolSet: ToolSet) {
  return Object.fromEntries(
    Object.entries(toolSet).map(([name, definition]) => [
      name,
      tool({
        description: definition.description,
        inputSchema: definition.inputSchema,
        execute: async (input: unknown) => definition.execute(input),
      }),
    ]),
  );
}

