import { pgTable, text, timestamp, uuid, varchar, customType, primaryKey } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { entries } from './entries';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

export const spaces = pgTable('spaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  centroidVector: vector('centroid_vector'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const entrySpaces = pgTable('entry_spaces', {
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.entryId, table.spaceId] }),
]);

export const spaceRelations = pgTable('space_relations', {
  parentSpaceId: uuid('parent_space_id').references(() => spaces.id, { onDelete: 'cascade' }).notNull(),
  childSpaceId: uuid('child_space_id').references(() => spaces.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.parentSpaceId, table.childSpaceId] }),
]);

export const insertSpaceSchema = createInsertSchema(spaces);
export const selectSpaceSchema = createSelectSchema(spaces);
export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
