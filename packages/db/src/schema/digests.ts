import { pgTable, text, timestamp, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { entries } from './entries.js';

export const digests = pgTable('digests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const digestEntries = pgTable('digest_entries', {
  digestId: uuid('digest_id').references(() => digests.id, { onDelete: 'cascade' }).notNull(),
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.digestId, table.entryId] }),
]);
