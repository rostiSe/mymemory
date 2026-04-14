import { desc } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { wikiPageTypeEnum } from './enums.js';

export const wikiPages = pgTable(
  'wiki_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    slug: varchar('slug', { length: 500 }).notNull(),
    pageType: wikiPageTypeEnum('page_type').notNull().default('synthesis'),
    content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
    properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default({}),
    sourceEntryIds: jsonb('source_entry_ids').$type<string[]>().notNull().default([]),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('wiki_pages_user_slug').on(table.userId, table.slug),
    index('wiki_pages_user_id').on(table.userId),
  ],
);

export const wikiPageVersions = pgTable(
  'wiki_page_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    wikiPageId: uuid('wiki_page_id')
      .references(() => wikiPages.id, { onDelete: 'cascade' })
      .notNull(),
    version: integer('version').notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    properties: jsonb('properties').$type<Record<string, unknown>>().notNull(),
    sourceEntryIds: jsonb('source_entry_ids').$type<string[]>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('wiki_page_versions_page').on(table.wikiPageId, desc(table.version)),
    uniqueIndex('wiki_page_versions_page_version_uidx').on(table.wikiPageId, table.version),
  ],
);

export const insertWikiPageSchema = createInsertSchema(wikiPages);
export const selectWikiPageSchema = createSelectSchema(wikiPages);
export type WikiPage = typeof wikiPages.$inferSelect;
export type NewWikiPage = typeof wikiPages.$inferInsert;

export const insertWikiPageVersionSchema = createInsertSchema(wikiPageVersions);
export const selectWikiPageVersionSchema = createSelectSchema(wikiPageVersions);
export type WikiPageVersion = typeof wikiPageVersions.$inferSelect;
export type NewWikiPageVersion = typeof wikiPageVersions.$inferInsert;
