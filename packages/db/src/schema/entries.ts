import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { entryTypeEnum, processedStatusEnum, reviewStatusEnum } from './enums.js';

export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // Links to Supabase auth.users via RLS or logic
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(), // Raw markdown
  summary: text('summary'), // AI-generated summary
  url: text('url'), // Original URL if it's a bookmark
  type: entryTypeEnum('type').notNull().default('url'),
  processedStatus: processedStatusEnum('processed_status').notNull().default('pending'),
  error: text('error'), // For storing failure reasons
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Enriched content (pipeline)
  rawContent: text('raw_content'),
  readableContent: text('readable_content'),
  coverImageUrl: text('cover_image_url'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  keyPoints: jsonb('key_points').$type<string[]>(),

  // User interaction
  isFavorited: boolean('is_favorited').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  isPinned: boolean('is_pinned').notNull().default(false),
  readCount: integer('read_count').notNull().default(0),
  lastReadAt: timestamp('last_read_at'),

  // Lifecycle / review
  reviewStatus: reviewStatusEnum('review_status').notNull().default('unreviewed'),

  // Source context
  sourceApp: varchar('source_app', { length: 255 }),

  // Content metrics
  wordCount: integer('word_count'),
  language: varchar('language', { length: 10 }),

  /** AI-extracted content classification (see analyzeContent schema). */
  contentType: varchar('content_type', { length: 20 }),
  /** AI-extracted depth: shallow | medium | deep. */
  depth: varchar('depth', { length: 10 }),
  /** Up to 5 author names from bylines / metadata. */
  authors: jsonb('authors').$type<string[]>(),
});

// Zod schemas for easy API validation
export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
