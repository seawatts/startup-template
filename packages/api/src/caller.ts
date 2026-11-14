import { createRouterClient } from '@orpc/server';
import type { Context } from './context';
import { appRouter } from './root';

// Calls procedures in process, with no HTTP request: server actions, jobs
// and tests. `createCaller(() => createORPCContext())` acts as the signed-in
// person of the current request.
export const createCaller = (context: Context | (() => Promise<Context>)) =>
  createRouterClient(appRouter, { context });
