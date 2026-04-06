import { pgEnum } from 'drizzle-orm/pg-core';

export const processedStatusEnum = pgEnum('processed_status', ['pending', 'processing', 'done', 'failed']);
export const entryTypeEnum = pgEnum('entry_type', ['url', 'note']);
