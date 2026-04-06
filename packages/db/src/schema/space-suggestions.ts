import { pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';
import { entries } from './entries';

export const spaceSuggestions = pgTable('space_suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  suggestedName: varchar('suggested_name', { length: 255 }).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
