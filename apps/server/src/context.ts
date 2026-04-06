import { db } from '@mymemory/db';

export type UserContext = {
  id: string;
};

export type ORPCContext = {
  db: typeof db;
  user?: UserContext;
};
