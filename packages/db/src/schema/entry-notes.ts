import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { entries } from './entries.js';

export const entryNotes = pgTable('entry_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
