import { pgEnum } from 'drizzle-orm/pg-core';

export const processedStatusEnum = pgEnum('processed_status', ['pending', 'processing', 'done', 'failed']);
export const entryTypeEnum = pgEnum('entry_type', ['url', 'note']);

export const reviewStatusEnum = pgEnum('review_status', [
  'unreviewed',
  'kept',
  'dismissed',
  'remind',
]);

/** Agent compilation lifecycle on a space (T-015a). */
export const compilationStatusEnum = pgEnum('compilation_status', ['idle', 'compiling', 'failed']);

/** Whether a space was created by the user vs the wiki agent (T-015n). */
export const spaceOriginEnum = pgEnum('space_origin', ['user', 'agent']);

/** Wiki page layout / role (T-015a). */
export const wikiPageTypeEnum = pgEnum('wiki_page_type', [
  'synthesis',
  'timeline',
  'comparison',
  'glossary',
  'index',
]);

/** Structured agent run logs (T-015a). */
export const agentLogLevelEnum = pgEnum('agent_log_level', ['info', 'warn', 'error', 'action']);
