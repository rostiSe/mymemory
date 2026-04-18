import { z } from "zod";

/**
 * Citations returned with Query answers and persisted on `wiki_query_messages.citations`.
 * Discriminate on `type` so wiki page hits vs `readEntryContent` fallbacks both carry stable ids for storage and deep links.
 */
export const wikiQueryPageCitationSchema = z.object({
  type: z.literal("page"),
  pageId: z.guid(),
  /** Section anchor within the wiki page (T-015f). */
  sectionId: z.string().optional(),
  /** Short quoted span from the wiki, for display. */
  quote: z.string().optional(),
  /** Wiki page title for chip display (optional; may be filled from search hit). */
  title: z.string().optional(),
});

export const wikiQueryEntryCitationSchema = z.object({
  type: z.literal("entry"),
  entryId: z.guid(),
  title: z.string().optional(),
  /** Optional sub-span within readable content when applicable. */
  sectionId: z.string().optional(),
  startOffset: z.number().int().optional(),
  endOffset: z.number().int().optional(),
  /** Original bookmark URL when the entry has one (optional deep-link hint). */
  url: z.string().optional(),
});

export const wikiQueryCitationSchema = z.discriminatedUnion("type", [
  wikiQueryPageCitationSchema,
  wikiQueryEntryCitationSchema,
]);

export type WikiQueryCitation = z.infer<typeof wikiQueryCitationSchema>;

export const queryStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tool-call"),
    name: z.string(),
    args: z.unknown(),
  }),
  z.object({
    type: z.literal("tool-result"),
    name: z.string(),
    durationMs: z.number(),
  }),
  z.object({
    type: z.literal("text-delta"),
    delta: z.string(),
  }),
  z.object({
    type: z.literal("done"),
    messageId: z.guid(),
    citations: z.array(wikiQueryCitationSchema),
    tokens: z.number(),
    latencyMs: z.number(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);

export type QueryStreamEvent = z.infer<typeof queryStreamEventSchema>;
