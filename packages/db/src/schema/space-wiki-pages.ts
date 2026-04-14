import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { spaces } from './spaces.js';
import { wikiPages } from './wiki-pages.js';

export const spaceWikiPages = pgTable(
  'space_wiki_pages',
  {
    spaceId: uuid('space_id')
      .references(() => spaces.id, { onDelete: 'cascade' })
      .notNull(),
    wikiPageId: uuid('wiki_page_id')
      .references(() => wikiPages.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.wikiPageId] }),
    index('space_wiki_pages_space').on(table.spaceId),
    index('space_wiki_pages_page').on(table.wikiPageId),
  ],
);

export const insertSpaceWikiPageSchema = createInsertSchema(spaceWikiPages);
export const selectSpaceWikiPageSchema = createSelectSchema(spaceWikiPages);
export type SpaceWikiPage = typeof spaceWikiPages.$inferSelect;
export type NewSpaceWikiPage = typeof spaceWikiPages.$inferInsert;
