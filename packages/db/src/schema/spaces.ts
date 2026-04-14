import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { compilationStatusEnum } from './enums.js';
import { entries } from './entries.js';

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

export const spaces = pgTable(
  'spaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    centroidVector: vector('centroid_vector'),
    isIndex: boolean('is_index').notNull().default(false),
    compilationStatus: compilationStatusEnum('compilation_status').notNull().default('idle'),
    lastCompiledAt: timestamp('last_compiled_at'),
    content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
    properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('spaces_user_name_uidx').on(table.userId, table.name),
    uniqueIndex('spaces_user_index')
      .on(table.userId)
      .where(sql`${table.isIndex} = true`),
  ],
);

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
