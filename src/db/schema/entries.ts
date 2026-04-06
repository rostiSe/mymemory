import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  customType,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Define pgvector custom type
// Drizzle supports vector natively in later versions, but this customType approach
// is guaranteed to work across any Drizzle setup.
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'; // Assuming OpenAI text-embedding-3-small
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // pgvector returns a string like "[0.1, 0.2, ...]"
    return JSON.parse(value);
  },
});

export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // Links to Supabase auth.users via RLS or logic
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(), // Raw markdown
  summary: text('summary'), // AI-generated summary
  url: text('url'), // Original URL if it's a bookmark
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const embeddings = pgTable('embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id')
    .references(() => entries.id, { onDelete: 'cascade' })
    .notNull(),
  vector: vector('vector').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zod schemas for easy API validation
export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
