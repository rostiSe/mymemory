import { pgTable, timestamp, uuid, varchar, primaryKey } from 'drizzle-orm/pg-core';
import { entries } from './entries.js';

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const entryTags = pgTable('entry_tags', {
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.entryId, table.tagId] }),
]);
