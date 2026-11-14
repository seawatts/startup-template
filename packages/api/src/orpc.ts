import { ORPCError, os, ValidationError } from '@orpc/server';
import { debug } from '@seawatts/logger';
import type { Context } from './context';

const log = debug('seawatts:orpc');

// Every procedure starts here. The middleware times the call and decides
// what a caller is told when it fails: a bad input names the first few
// problems, an error a procedure raised on purpose (ORPCError with its own
// code) passes through, and anything else is logged in full and answered
// as a plain 500 so no stack or SQL reaches the browser.
export const publicProcedure = os
  .$context<Context>()
  .use(async ({ next, path }) => {
    const start = Date.now();
    try {
      return await next();
    } catch (error) {
      if (
        error instanceof ORPCError &&
        error.code === 'BAD_REQUEST' &&
        error.cause instanceof ValidationError
      )
        throw new ORPCError('BAD_REQUEST', {
          message: error.cause.issues
            .slice(0, 3)
            .map((issue) => issue.message)
            .join('; '),
        });
      if (error instanceof ORPCError && error.code !== 'INTERNAL_SERVER_ERROR')
        throw error;
      console.error(
        `rpc.${path.join('.')} failed`,
        error instanceof ORPCError && error.cause ? error.cause : error,
      );
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        cause: error,
        message: 'The request could not be completed.',
      });
    } finally {
      log(`${path.join('.')} took ${Date.now() - start}ms`);
    }
  });

// Signed-in callers only; `context.auth.userId` is a string below this.
export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  const userId = context.auth.userId;
  if (!userId) throw new ORPCError('UNAUTHORIZED');
  return next({ context: { auth: { ...context.auth, userId } } });
});
