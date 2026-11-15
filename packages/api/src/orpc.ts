import { ORPCError, os, ValidationError } from '@orpc/server';
import { handleWritesInReads, readingOnly } from '@seawatts/db/read-only';
import {
  countingStatements,
  type StatementCounts,
} from '@seawatts/db/statement-count';
import { debug } from '@seawatts/logger';
import type { Context } from './context';
import { productEventFor } from './product-events';

const log = debug('seawatts:orpc');

// Every procedure starts here. The middleware times the call and decides
// what a caller is told when it fails: a bad input names the first few
// problems, an error a procedure raised on purpose (ORPCError with its own
// code) passes through, and anything else is logged in full and answered
// as a plain 500 so no stack or SQL reaches the browser.
//
// A GET procedure is a read and never writes: it runs inside `readingOnly`,
// so a statement that would write, or wait for an advisory lock, is refused
// before it reaches the database.
// Production reports the write and lets it through, so a path the tests
// missed is found without breaking the page.
if (process.env.VERCEL_ENV === 'production')
  handleWritesInReads((error) =>
    console.error(
      JSON.stringify({
        event: error.code === 'LOCK_IN_READ' ? 'lock_in_read' : 'write_in_read',
        read: error.read,
        statement: error.statement,
      }),
    ),
  );

export const publicProcedure = os
  .$context<Context>()
  .use(async ({ context, next, path, procedure }, input) => {
    const start = performance.now();
    const name = path.join('.');
    const read = procedure['~orpc'].route.method === 'GET';
    const counts: StatementCounts = { content: 0, transactions: 0, wrapper: 0 };
    let ok = false;
    try {
      const { result } = await countingStatements(
        async () => (read ? readingOnly(`rpc.${name}`, () => next()) : next()),
        counts,
      );
      // The save succeeded: record its product event, after the response.
      if (!read) await recordProductEvent(name, context, input, result.output);
      ok = true;
      return result;
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
      const ms = Math.round(performance.now() - start);
      log(`${name} took ${ms}ms`);
      void recordTiming(name, context, { counts, ms, ok });
    }
  });

// One content-free event per procedure call in production: its path, server
// time, statements, transactions and whether it answered. This is the truth
// for speed work; local timings are not (docs/agents/speed.md).
async function recordTiming(
  name: string,
  context: Context,
  timing: { counts: StatementCounts; ms: number; ok: boolean },
) {
  if (process.env.VERCEL_ENV !== 'production' && !timingsInTests) return;
  try {
    const { captureProductEvent } = await import('@seawatts/analytics/capture');
    void captureProductEvent({
      event: 'procedure_timed',
      organizationId: context.auth?.orgId,
      properties: {
        ms: timing.ms,
        ok: timing.ok,
        path: name,
        statements: timing.counts.content,
        transactions: timing.counts.transactions,
      },
      surface: context.apiKey ? 'api' : 'web',
      userId: context.auth?.userId,
    });
  } catch (error) {
    console.error(`timing event for ${name} failed`, error);
  }
}

// Tests turn the timing event on to see it; elsewhere only production sends.
let timingsInTests = false;
export function recordTimingsInTests(on: boolean) {
  timingsInTests = on;
}

// Loads the analytics code only when a save has an event to record, and
// never fails the save.
async function recordProductEvent(
  name: string,
  context: Context,
  input: unknown,
  output: unknown,
) {
  const mapping = productEventFor[name];
  if (!mapping?.event) return;
  try {
    const { captureProductEvent } = await import('@seawatts/analytics/capture');
    // Not awaited: the send outlives the response.
    void captureProductEvent({
      event: mapping.event,
      organizationId: context.auth?.orgId,
      properties:
        'properties' in mapping && mapping.properties
          ? mapping.properties(
              input && typeof input === 'object'
                ? (input as Record<string, unknown>)
                : {},
              output,
            )
          : undefined,
      surface: context.apiKey ? 'api' : 'web',
      userId: context.auth?.userId,
    });
  } catch (error) {
    console.error(`product event for ${name} failed`, error);
  }
}

// Signed-in callers only; `context.auth.userId` is a string below this.
export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  const userId = context.auth.userId;
  if (!userId) throw new ORPCError('UNAUTHORIZED');
  return next({ context: { auth: { ...context.auth, userId } } });
});
