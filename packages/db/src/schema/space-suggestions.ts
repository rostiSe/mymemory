import { pgTable, real, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { entries } from './entries.js';
import { spaces } from './spaces.js';

export const spaceSuggestions = pgTable('space_suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  suggestedName: varchar('suggested_name', { length: 255 }).notNull(),
  suggestedSpaceId: uuid('suggested_space_id').references(() => spaces.id, { onDelete: 'set null' }),
  confidence: real('confidence'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
