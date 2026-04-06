import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { processedStatusEnum, entryTypeEnum } from './enums';

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
});

// Zod schemas for easy API validation
export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
