import { pgTable, timestamp, uuid, real, primaryKey } from 'drizzle-orm/pg-core';
import { entries } from './entries';

export const entryRelations = pgTable('entry_relations', {
  sourceEntryId: uuid('source_entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  targetEntryId: uuid('target_entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  similarityScore: real('similarity_score').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.sourceEntryId, table.targetEntryId] }),
]);
