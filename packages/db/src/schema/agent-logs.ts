import { desc } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { agentLogLevelEnum } from './enums.js';

export const agentLogs = pgTable(
  'agent_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    runId: uuid('run_id').notNull(),
    level: agentLogLevelEnum('level').notNull().default('info'),
    message: text('message').notNull(),
    toolName: varchar('tool_name', { length: 100 }),
    toolInput: jsonb('tool_input').$type<Record<string, unknown>>(),
    /** Avoid persisting long-lived public storage URLs; prefer ids / paths / summaries. */
    toolOutput: jsonb('tool_output').$type<Record<string, unknown>>(),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('agent_logs_run').on(table.runId),
    index('agent_logs_user_created').on(table.userId, desc(table.createdAt)),
  ],
);

export const insertAgentLogSchema = createInsertSchema(agentLogs);
export const selectAgentLogSchema = createSelectSchema(agentLogs);
export type AgentLog = typeof agentLogs.$inferSelect;
export type NewAgentLog = typeof agentLogs.$inferInsert;
