import { ORPCError, os, ValidationError } from '@orpc/server';
import { handleWritesInReads, readingOnly } from '@seawatts/db/read-only';
import { debug } from '@seawatts/logger';
import type { Context } from './context';

const log = debug('seawatts:orpc');

// Every procedure starts here. The middleware times the call and decides
// what a caller is told when it fails: a bad input names the first few
// problems, an error a procedure raised on purpose (ORPCError with its own
// code) passes through, and anything else is logged in full and answered
// as a plain 500 so no stack or SQL reaches the browser.
//
// A GET procedure is a read and never writes: it runs inside `readingOnly`,
// so a statement that would write is refused before it reaches the database.
// Production reports the write and lets it through, so a path the tests
// missed is found without breaking the page.
if (process.env.VERCEL_ENV === 'production')
  handleWritesInReads((error) =>
    console.error(
      JSON.stringify({
        event: 'write_in_read',
        read: error.read,
        statement: error.statement,
      }),
    ),
  );

export const publicProcedure = os
  .$context<Context>()
  .use(async ({ next, path, procedure }) => {
    const start = Date.now();
    const read = procedure['~orpc'].route.method === 'GET';
    try {
      return await (read
        ? readingOnly(`rpc.${path.join('.')}`, () => next())
        : next());
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
