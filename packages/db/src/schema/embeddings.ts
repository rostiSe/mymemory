import { pgTable, timestamp, uuid, customType } from 'drizzle-orm/pg-core';
import { entries } from './entries.js';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'; // Assuming OpenAI text-embedding-3-small
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

export const embeddings = pgTable('embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id')
    .references(() => entries.id, { onDelete: 'cascade' })
    .notNull(),
  vector: vector('vector').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
