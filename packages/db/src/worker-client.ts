import { drizzle } from 'drizzle-orm/postgres-js';
import { guardedConnection } from './client';
import { env } from './env';

// The worker role: workflow steps, crons and other work no person is
// waiting on. It has the web role's tenant tables under the same row-level
// security, its own connection limits, and the few functions that find due
// work across organizations.
export const workerConnection = guardedConnection(
  env.POSTGRES_WORKER_URL || env.POSTGRES_URL,
);
export const workerDb = drizzle(workerConnection);
